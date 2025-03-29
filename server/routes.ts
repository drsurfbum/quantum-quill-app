import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProjectSchema, insertChapterSchema, insertWhiteboardSchema, insertOutlineItemSchema, insertStoryBibleEntrySchema } from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  // Projects routes
  app.get("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    const userId = req.user!.id;
    const projects = await storage.getUserProjects(userId);
    res.json(projects);
  });

  app.get("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if project belongs to the user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    res.json(project);
  });

  app.post("/api/projects", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const userId = req.user!.id;
      const projectData = { ...req.body, userId };
      const validatedData = insertProjectSchema.parse(projectData);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid project data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create project" });
    }
  });

  app.put("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Check if project belongs to the user
      if (project.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedProject = await storage.updateProject(id, req.body);
      res.json(updatedProject);
    } catch (error) {
      res.status(500).json({ message: "Failed to update project" });
    }
  });

  app.delete("/api/projects/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if project belongs to the user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const success = await storage.deleteProject(id);
    res.status(204).send();
  });

  app.put("/api/projects/:id/trash", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if project belongs to the user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const trashedProject = await storage.trashProject(id);
    res.json(trashedProject);
  });

  app.put("/api/projects/:id/restore", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const project = await storage.getProject(id);
    
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    
    // Check if project belongs to the user
    if (project.userId !== req.user!.id) {
      return res.status(403).json({ message: "Forbidden" });
    }
    
    const restoredProject = await storage.restoreProject(id);
    res.json(restoredProject);
  });

  // Chapters routes
  app.get("/api/projects/:projectId/chapters", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const chapters = await storage.getProjectChapters(projectId);
    res.json(chapters);
  });

  app.get("/api/chapters/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const chapter = await storage.getChapter(id);
    
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    
    res.json(chapter);
  });

  app.post("/api/chapters", async (req: Request, res: Response) => {
    try {
      const validatedData = insertChapterSchema.parse(req.body);
      const chapter = await storage.createChapter(validatedData);
      res.status(201).json(chapter);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid chapter data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create chapter" });
    }
  });

  app.put("/api/chapters/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedChapter = await storage.updateChapter(id, req.body);
      
      if (!updatedChapter) {
        return res.status(404).json({ message: "Chapter not found" });
      }
      
      res.json(updatedChapter);
    } catch (error) {
      res.status(500).json({ message: "Failed to update chapter" });
    }
  });

  app.delete("/api/chapters/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteChapter(id);
    
    if (!success) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    
    res.status(204).send();
  });

  // Whiteboard routes
  app.get("/api/projects/:projectId/whiteboards", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const whiteboards = await storage.getProjectWhiteboards(projectId);
    res.json(whiteboards);
  });

  app.get("/api/whiteboards/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const whiteboard = await storage.getWhiteboard(id);
    
    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }
    
    res.json(whiteboard);
  });

  app.post("/api/whiteboards", async (req: Request, res: Response) => {
    try {
      const validatedData = insertWhiteboardSchema.parse(req.body);
      const whiteboard = await storage.createWhiteboard(validatedData);
      res.status(201).json(whiteboard);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid whiteboard data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create whiteboard" });
    }
  });

  app.put("/api/whiteboards/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedWhiteboard = await storage.updateWhiteboard(id, req.body);
      
      if (!updatedWhiteboard) {
        return res.status(404).json({ message: "Whiteboard not found" });
      }
      
      res.json(updatedWhiteboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to update whiteboard" });
    }
  });

  app.delete("/api/whiteboards/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteWhiteboard(id);
    
    if (!success) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }
    
    res.status(204).send();
  });

  // Outline routes
  app.get("/api/projects/:projectId/outline", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const outlineItems = await storage.getProjectOutline(projectId);
    res.json(outlineItems);
  });

  app.get("/api/outline/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const outlineItem = await storage.getOutlineItem(id);
    
    if (!outlineItem) {
      return res.status(404).json({ message: "Outline item not found" });
    }
    
    res.json(outlineItem);
  });

  app.post("/api/outline", async (req: Request, res: Response) => {
    try {
      const validatedData = insertOutlineItemSchema.parse(req.body);
      const outlineItem = await storage.createOutlineItem(validatedData);
      res.status(201).json(outlineItem);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid outline item data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create outline item" });
    }
  });

  app.put("/api/outline/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedOutlineItem = await storage.updateOutlineItem(id, req.body);
      
      if (!updatedOutlineItem) {
        return res.status(404).json({ message: "Outline item not found" });
      }
      
      res.json(updatedOutlineItem);
    } catch (error) {
      res.status(500).json({ message: "Failed to update outline item" });
    }
  });

  app.delete("/api/outline/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteOutlineItem(id);
    
    if (!success) {
      return res.status(404).json({ message: "Outline item not found" });
    }
    
    res.status(204).send();
  });

  // Story Bible routes
  app.get("/api/projects/:projectId/story-bible", async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const storyBibleEntries = await storage.getProjectStoryBible(projectId);
    res.json(storyBibleEntries);
  });

  app.get("/api/story-bible/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const storyBibleEntry = await storage.getStoryBibleEntry(id);
    
    if (!storyBibleEntry) {
      return res.status(404).json({ message: "Story bible entry not found" });
    }
    
    res.json(storyBibleEntry);
  });

  app.post("/api/story-bible", async (req: Request, res: Response) => {
    try {
      const validatedData = insertStoryBibleEntrySchema.parse(req.body);
      const storyBibleEntry = await storage.createStoryBibleEntry(validatedData);
      res.status(201).json(storyBibleEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid story bible entry data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create story bible entry" });
    }
  });

  app.put("/api/story-bible/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedStoryBibleEntry = await storage.updateStoryBibleEntry(id, req.body);
      
      if (!updatedStoryBibleEntry) {
        return res.status(404).json({ message: "Story bible entry not found" });
      }
      
      res.json(updatedStoryBibleEntry);
    } catch (error) {
      res.status(500).json({ message: "Failed to update story bible entry" });
    }
  });

  app.delete("/api/story-bible/:id", async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteStoryBibleEntry(id);
    
    if (!success) {
      return res.status(404).json({ message: "Story bible entry not found" });
    }
    
    res.status(204).send();
  });

  const httpServer = createServer(app);
  return httpServer;
}
