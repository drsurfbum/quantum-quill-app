import type { Express, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import {
  questionSchema,
  sourceRef,
  pickerKind,
  isProse,
  ANSWER_CHARS,
  type AssistantEvent,
} from "@shared/workspace-assistant";
import type { IStorage } from "../storage";
import { readSource, reject, type SourceReader } from "./source";
import type { AssistantRuntime } from "./provider";

export function registerAssistant(
  app: Express,
  storage: Pick<IStorage, "withReadSnapshot">,
  runtime?: AssistantRuntime,
) {
  const base = "/api/projects/:projectId/assistant";
  const owned = <T>(
    req: Request,
    work: (db: SourceReader & Pick<IStorage, "assistantTitles">, id: number) => Promise<T>,
  ) =>
    storage.withReadSnapshot(async (db) => {
      const id = z.coerce.number().int().positive().max(2147483647).parse(req.params.projectId);
      const project = await db.getProject(id);
      if (!project || project.userId !== req.user!.id) reject(404, "Project unavailable.");
      return work(db, id);
    });
  const handle =
    (fn: (req: Request, res: Response) => Promise<void>): RequestHandler =>
    (req, res, next) => {
      void fn(req, res).catch(next);
    };
  app.get(
    base,
    handle(async (req, res) => {
      await owned(req, async () => {});
      res.json({ provider: runtime?.label ?? null });
    }),
  );
  app.get(
    base + "/titles",
    handle(async (req, res) => {
      const query = z
        .object({ kind: pickerKind, search: z.string().max(100).default("") })
        .strict()
        .parse(req.query);
      res.json(await owned(req, (db, id) => db.assistantTitles(id, query.kind, query.search)));
    }),
  );
  app.post(
    base + "/preview",
    handle(async (req, res) => {
      const { source, manuscript } = z
        .object({ source: sourceRef, manuscript: z.boolean() })
        .strict()
        .parse(req.body);
      if (isProse(source.kind) && !manuscript) reject(400, "Choose manuscript access first.");
      res.json(await owned(req, (db, id) => readSource(db, id, source)));
    }),
  );
  app.post(
    base + "/ask",
    handle(async (req, res) => {
      const q = questionSchema.parse(req.body);
      const sources = await owned(req, async (db, id) => {
        const saved = await Promise.all(
          q.sources.map(async ({ kind, id: record, digest }) => {
            const source = await readSource(db, id, { kind, id: record });
            if (source.digest !== digest)
              reject(409, "A selected source changed. Remove and add it again to review the new version.");
            return source;
          }),
        );
        if (q.passage)
          saved.push(await readSource(db, id, { kind: q.passage.kind, id: q.passage.id }, q.passage.text));
        return saved;
      });
      if (!runtime) {
        res.status(503).json({ message: "The workspace assistant needs a provider and usage allowance." });
        return;
      }
      if (res.destroyed) return;
      const release = runtime.usage.reserve(req.user!.id);
      const controller = new AbortController();
      const stop = () => controller.abort();
      const timeout = setTimeout(stop, 60000);
      res.once("close", stop);
      const send = (event: AssistantEvent) => res.write(JSON.stringify(event) + "\n");
      try {
        res.set({ "Content-Type": "application/x-ndjson; charset=utf-8", "X-Accel-Buffering": "no" });
        send({ type: "sources", sources });
        let size = 0;
        for await (const text of runtime.stream(
          { workspace: q.workspace, question: q.question, sources },
          controller.signal,
        )) {
          controller.signal.throwIfAborted();
          size += text.length;
          if (size > ANSWER_CHARS) throw new Error("Response limit");
          send({ type: "text", text });
        }
        controller.signal.throwIfAborted();
        send(size ? { type: "done" } : { type: "error" });
      } catch {
        if (!res.destroyed) send({ type: "error" });
      } finally {
        stop();
        clearTimeout(timeout);
        res.off("close", stop);
        res.end();
        release();
      }
    }),
  );
}
