import { createHash } from "node:crypto";
import { Parser } from "htmlparser2";
import { readBibleFields, parseContent } from "@shared/story-bible";
import { SOURCE_CHARS, type SourceRef, type Snapshot } from "@shared/workspace-assistant";
import type { IStorage } from "../storage";

export type SourceReader = Pick<
  IStorage,
  | "getChapter"
  | "getScene"
  | "getOutlineItem"
  | "getStoryBibleEntry"
  | "getPlotStructure"
  | "getPlotStructureSection"
  | "getProject"
>;
export function reject(status: number, message: string): never {
  throw Object.assign(new Error(message), { status });
}
const missing = () => reject(404, "Source unavailable in this project.");

function plain(raw: string) {
  if (!/<(?:p|div|span|h[1-6]|br|li|strong|em|a|script|img|style|table|blockquote)\b/i.test(raw)) return raw;
  let text = "",
    skip = 0;
  const parser = new Parser({
    onopentag(name) {
      if (name === "script" || name === "style") skip++;
      if (/^(p|br|div|li|h[1-6])$/.test(name)) text += "\n";
    },
    onclosetag(name) {
      if (name === "script" || name === "style") skip--;
    },
    ontext(part) {
      if (!skip) text += part;
    },
  });
  parser.end(raw);
  return text.trim();
}
function snapshot(ref: SourceRef, title: string, version: string, content: string): Snapshot {
  const text = content.length > SOURCE_CHARS ? content.slice(0, SOURCE_CHARS - 1) + "…" : content;
  const data = { ...ref, title: title.slice(0, 160), version, text };
  return { ...data, digest: createHash("sha256").update(JSON.stringify(data)).digest("hex") };
}
export async function readSource(
  db: SourceReader,
  projectId: number,
  ref: SourceRef,
  passage?: string,
): Promise<Snapshot> {
  const { kind, id } = ref;
  if (kind === "brief") {
    const p = id === projectId && (await db.getProject(id));
    if (!p) return missing();
    return snapshot(ref, p.title, "Saved brief", plain(p.description || ""));
  }
  if (kind === "plot") {
    const point = await db.getPlotStructureSection(id);
    if (!point || (await db.getPlotStructure(point.plotStructureId))?.projectId !== projectId)
      return missing();
    return snapshot(ref, point.title, "Revision " + point.revision, plain(point.content || ""));
  }
  if (kind === "bible") {
    const entry = await db.getStoryBibleEntry(id);
    if (entry?.projectId !== projectId) return missing();
    const fields = readBibleFields(entry);
    const summary = [
      parseContent(entry.content) ? "" : entry.content,
      ...[
        "shortSummary",
        "shortNotes",
        "description",
        "summary",
        "narrativeContext",
        "content",
        "purpose",
        "motivations",
        "conflicts",
        "history",
      ].map((key) => fields[key]),
    ];
    const text = [...new Set(summary.filter((s): s is string => typeof s === "string" && !!s.trim()))].join(
      "\n",
    );
    return snapshot(ref, entry.title, "Revision " + entry.revision, plain(text));
  }
  if (kind === "plan") {
    const scene = await db.getScene(id);
    if (scene?.projectId !== projectId) return missing();
    return snapshot(
      ref,
      scene.title,
      "Revision " + scene.revision,
      [scene.summary, ...scene.storyBeats.map((b) => b.text)].join("\n"),
    );
  }
  const row =
    kind === "outline"
      ? await db.getOutlineItem(id)
      : kind === "chapter"
        ? await db.getChapter(id)
        : await db.getScene(id);
  if (row?.projectId !== projectId || ("writingMode" in row && row.writingMode !== "chapter"))
    return missing();
  return passage === undefined
    ? snapshot(ref, row.title, "Revision " + row.revision, plain(row.content || ""))
    : snapshot(ref, row.title, "Editor selection · may include unsaved text", passage);
}
