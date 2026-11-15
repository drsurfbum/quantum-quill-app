import type { Express, Request, Response, RequestHandler } from "express";
import { z } from "zod";
import type { IStorage } from "./storage";
import { HISTORY_PAGE_SIZE, historySummary } from "@shared/prose-history";
import { cleanProse } from "./export";
import { writingLinkCounts, validateWritingLinks } from "./writing-links";

const id = z.coerce.number().int().positive().max(2147483647);
const restoreInput = z.object({versionId:id, expectedRevision:z.number().int().min(0).max(2147483647), requestId:z.string().uuid()}).strict();
function fail(status: number, message: string, code?: string): never { throw Object.assign(new Error(message),{status,code}); }
const handler = (fn:(req:Request,res:Response)=>Promise<unknown>):RequestHandler => (req,res,next) => { void fn(req,res).catch(next); };

export function registerProseHistoryRoutes(app: Express, storage: IStorage) {
  for (const resource of ["chapters","scenes"] as const) {
    const base = `/api/${resource}/:id/history`;
    const recordFor = async (scoped:IStorage, req:Request) => {
      const record = await (resource === "chapters" ? scoped.getChapter(id.parse(req.params.id)) : scoped.getScene(id.parse(req.params.id)));
      if (!record) fail(404,"This writing is no longer available.");
      const project = await scoped.getProject(record.projectId);
      if (!project || project.userId !== req.user!.id) fail(403,"Forbidden");
      if ("writingMode" in record && record.writingMode !== "chapter") fail(409,"Choose a scene to view its prose history.");
      return record;
    };
    app.get(base,handler(async(req,res) => {
      const record = await recordFor(storage,req);
      const before = req.query.before === undefined ? undefined : id.parse(req.query.before);
      const rows = await storage.listProseVersions(record.projectId,resource,record.id,before);
      const versions = rows.slice(0,HISTORY_PAGE_SIZE);
      res.setHeader("Cache-Control","no-store");
      res.json({versions,nextBefore:rows.length > HISTORY_PAGE_SIZE ? versions.at(-1)!.id : null});
    }));
    app.get(`${base}/:versionId`,handler(async(req,res) => {
      const review = await storage.withReadSnapshot(async scoped => {
        const current = await recordFor(scoped,req);
        const version = await scoped.getProseVersion(current.projectId,resource,current.id,id.parse(req.params.versionId));
        if (!version) fail(404,"Saved version not found in this document.");
        const issues:string[] = [];
        try {
          for (const entryId of writingLinkCounts(version.content).keys()) {
            const entry = await scoped.getStoryBibleEntry(entryId);
            if (!entry || entry.projectId !== current.projectId) issues.push(`Story Bible link #${entryId} is unavailable. This version is preserved, but cannot be restored with that missing link.`);
          }
        } catch { issues.push("This version has an invalid Story Bible link. The original is preserved; restoration is unavailable."); }
        return {version:historySummary(version),previewHtml:cleanProse(version.content,new Map(),true),
          current:{revision:current.revision,title:current.title,previewHtml:cleanProse(current.content,new Map(),true)},issues};
      });
      res.setHeader("Cache-Control","no-store"); res.json(review);
    }));
    app.post(`${base}/restore`,handler(async(req,res) => {
      const input = restoreInput.parse(req.body), record = await recordFor(storage,req);
      const result = await storage.withProjectLock(record.projectId,async scoped => {
        const current = await recordFor(scoped,req);
        const previous = await scoped.getProseRestore(current.projectId,resource,current.id,input.requestId);
        if (previous) {
          if (previous.restoredFromId !== input.versionId || previous.revision !== input.expectedRevision + 1) fail(409,"This restore request was already used for a different review.");
          // Return the current row, never a stale receipt body. The client must review
          // again if writing has advanced since the acknowledged restore.
          if (current.revision !== previous.revision) fail(409,"That restoration succeeded, and newer writing was saved afterward. Review history again.","REVISION_CONFLICT");
          return current;
        }
        if (current.revision !== input.expectedRevision) fail(409,"This writing changed after your comparison. Review the latest version before restoring.","REVISION_CONFLICT");
        const version = await scoped.getProseVersion(current.projectId,resource,current.id,input.versionId);
        if (!version) fail(404,"Saved version not found in this document.");
        // An archived reference already present in this saved version is retained;
        // missing or cross-project references still block, never silently strip.
        await validateWritingLinks(scoped,current.projectId,version.content,version.content);
        const source = {restoredFromId:version.id,requestId:input.requestId};
        const updated = resource === "chapters"
          ? await scoped.updateChapter(current.id,{content:version.content},{revision:input.expectedRevision},source)
          : await scoped.updateScene(current.id,{content:version.content!},{revision:input.expectedRevision},source);
        if (!updated) fail(409,"This writing changed. Review again before restoring.","REVISION_CONFLICT");
        return updated;
      });
      res.json(result);
    }));
  }
}
