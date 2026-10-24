import { z } from "zod";
export const feedbackInput = z.object({
  requestId: z.string().uuid(),
  category: z.enum(["bug", "idea", "confusing", "other"]),
  summary: z.string().trim().min(3, "Add a short summary (at least 3 characters).").max(160),
  details: z.string().trim().min(10, "Tell us a little more (at least 10 characters).").max(6000),
  area: z.enum(["Write", "Story Bible", "Storyboard", "Outline", "Overview", "Projects", "Other"]),
  device: z.string().max(300).default(""),
  allowContact: z.boolean().default(false),
}).strict();
export type FeedbackInput = z.infer<typeof feedbackInput>;

export const feedbackStatuses = ["received", "reviewing", "planned", "resolved"] as const;
export const feedbackStatus = z.enum(feedbackStatuses);
const positiveId = z.string().regex(/^[1-9]\d*$/).transform(Number).refine(Number.isSafeInteger);
export const feedbackInboxQuery = z.object({
  status: feedbackStatus.optional(),
  category: feedbackInput.shape.category.optional(),
  q: z.string().trim().max(100).default(""),
  before: positiveId.optional(),
}).strict();
export const feedbackId = positiveId;
export const feedbackStatusUpdate = z.object({ status: feedbackStatus, expectedStatus: feedbackStatus }).strict();
export type FeedbackStatus = z.infer<typeof feedbackStatus>;
export type FeedbackInboxQuery = z.infer<typeof feedbackInboxQuery>;
export type FeedbackSummary = {id:number; category:string; summary:string; area:string; status:string; createdAt:Date | string};
export type FeedbackInbox = {reports:FeedbackSummary[]; nextCursor:number | null};
export type FeedbackDetail = FeedbackSummary & {details:string; device:string; reporter:{username:string; email:string | null}; allowContact:boolean};
