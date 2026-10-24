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
