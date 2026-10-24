import type { Express, Request, Response, NextFunction } from "express";
import type { IStorage } from "./storage";
import { feedbackInput, feedbackInboxQuery, feedbackId, feedbackStatusUpdate } from "@shared/feedback";
import { canReviewFeedback } from "./feedback-access";
const handle = (work: (req: Request,res: Response) => Promise<unknown>) => (req: Request,res: Response,next: NextFunction) => { work(req,res).catch(next); };
export function registerFeedbackRoutes(app: Express, storage: IStorage) {
  app.use("/api/admin/feedback", (req,res,next) => {
    if (!canReviewFeedback(req.user!.id)) { res.status(403).json({message:"This inbox is available only to the Quantum Quill maintainer."}); return; }
    next();
  });
  app.get("/api/admin/feedback", handle(async (req,res) => {
    const rows = await storage.listFeedback(feedbackInboxQuery.parse(req.query));
    res.json({reports:rows.slice(0,50),nextCursor:rows.length>50 ? rows[49].id : null});
  }));
  app.get("/api/admin/feedback/:id", handle(async (req,res) => {
    const report = await storage.getFeedback(feedbackId.parse(req.params.id));
    if (!report) return res.status(404).json({message:"Report not found."});
    const author = await storage.getUser(report.userId);
    const {id,category,summary,area,status,createdAt,details,device,allowContact} = report;
    res.json({id,category,summary,area,status,createdAt,details,device,allowContact,reporter:{username:author?.username || "Unavailable account",email:allowContact ? author?.email ?? null : null}});
  }));
  app.patch("/api/admin/feedback/:id", handle(async (req,res) => {
    const id = feedbackId.parse(req.params.id), input = feedbackStatusUpdate.parse(req.body);
    const report = await storage.updateFeedbackStatus(id,input.status,input.expectedStatus);
    if (!report) {
      if (!await storage.getFeedback(id)) return res.status(404).json({message:"Report not found."});
      return res.status(409).json({code:"FEEDBACK_STATUS_CHANGED",message:"This report’s status changed elsewhere. Review the refreshed status before saving again."});
    }
    res.json({id:report.id,status:report.status});
  }));
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
