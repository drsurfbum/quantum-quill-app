import type { Express, Request, Response, NextFunction } from "express";
import type { IStorage } from "./storage";
import { feedbackInput } from "@shared/feedback";
const handle = (work: (req: Request,res: Response) => Promise<unknown>) => (req: Request,res: Response,next: NextFunction) => { work(req,res).catch(next); };
export function registerFeedbackRoutes(app: Express, storage: IStorage) {
  // Registered after requireUser: never trust account IDs supplied by a client.
  app.get("/api/feedback", handle(async (req,res) => res.json(await storage.getUserFeedback(req.user!.id))));
  app.post("/api/feedback", handle(async (req,res) => {
    const input = feedbackInput.parse(req.body), userId = req.user!.id;
    const report = await storage.withCreationTransaction(-userId, async scoped => {
      const existing = await scoped.getFeedbackByRequest(userId,input.requestId);
      if (existing) {
        if (Object.entries(input).some(([key,value]) => existing[key as keyof typeof existing] !== value)) {
          throw Object.assign(new Error("An earlier version of this report already arrived. Review My recent reports; send again to submit your changes as a new report."),{status:409,code:"FEEDBACK_ALREADY_RECEIVED"});
        }
        return existing; // A lost response/retry must not create duplicates.
      }
      if (await scoped.countRecentFeedback(userId,new Date(Date.now()-24*60*60*1000)) >= 20) {
        throw Object.assign(new Error("You’ve sent 20 reports today. Please try tomorrow; your report stays here."),{status:429});
      }
      return scoped.createFeedback(userId,input);
    });
    res.status(201).json({id:report.id,status:report.status});
  }));
}
