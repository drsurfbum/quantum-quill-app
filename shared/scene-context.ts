import { z } from "zod";
import { BIBLE_TYPES } from "./bible-catalog";

export const SCENE_ROLES = {
  viewpoint: { label: "Viewpoint", types: ["characters"] },
  cast: { label: "Cast", types: ["characters"] },
  location: { label: "Locations", types: ["locations"] },
  reference: { label: "References", types: BIBLE_TYPES },
} as const;
export type SceneRole = keyof typeof SCENE_ROLES;
export const sceneLinkSchema = z.object({
  entryId: z.number().int().positive().max(2147483647),
  role: z.enum(["viewpoint", "cast", "location", "reference"]),
  note: z.string().max(5000).default(""),
}).strict();
export const sceneLinksSchema = z.array(sceneLinkSchema).max(200).superRefine((links, ctx) => {
  if (links.filter(link => link.role === "viewpoint").length > 1) ctx.addIssue({code:"custom", message:"Choose at most one viewpoint character."});
  const seen = new Set<string>();
  links.forEach((link, index) => {
    const key = sceneLinkKey(link);
    if (seen.has(key)) ctx.addIssue({code:"custom",path:[index],message:"This entry is already linked in this role."});
    seen.add(key);
  });
});
export const sceneContextPatch = z.object({links: sceneLinksSchema}).strict();
export type SceneBibleLink = z.infer<typeof sceneLinkSchema>;
export type SceneContext = { id: number; sceneId: number; projectId: number; title: string; revision: number; links: SceneBibleLink[] };
export type SceneUse = { sceneId: number; chapterId: number; sceneTitle: string; chapterTitle: string; links: SceneBibleLink[] };
export const sceneLinkKey = (link: Pick<SceneBibleLink,"role"|"entryId">) => `${link.role}:${link.entryId}`;
