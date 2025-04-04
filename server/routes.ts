import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProjectSchema, 
  insertChapterSchema, 
  insertWhiteboardSchema, 
  insertOutlineItemSchema, 
  insertStoryBibleEntrySchema,
  insertPlotStructureSchema,
  insertPlotStructureSectionSchema
} from "@shared/schema";
import { z } from "zod";
import { ZodError } from "zod-validation-error";
import { setupAuth } from "./auth";

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  // First check if user is authenticated through session
  let isSessionAuth = req.isAuthenticated() && !!req.user;
  
  // If not authenticated through session, check for token-based auth
  if (!isSessionAuth) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      
      // Simple token validation - production would use JWT
      if (token && token.startsWith('user-')) {
        try {
          // Extract user ID from token - format is user-{userId}-{timestamp}
          const parts = token.split('-');
          if (parts.length >= 2) {
            const userId = parseInt(parts[1]);
            if (!isNaN(userId)) {
              // Manual authentication - set user on request
              req.user = { id: userId, username: "TokenUser" } as Express.User;
              isSessionAuth = true;
              console.log(`User authenticated via token for user ID: ${userId}`);
            }
          }
        } catch (error) {
          console.error("Token authentication error:", error);
        }
      }
    }
  }
  
  console.log(`
===== Auth Check =====
Path: ${req.path}
Method: ${req.method}
Session ID: ${req.sessionID}
Has Auth Header: ${!!req.headers.authorization}
Is Authenticated: ${isSessionAuth}
User: ${req.user ? JSON.stringify({ id: req.user.id, username: req.user.username }) : "null"}
====================
  `);
  
  if (isSessionAuth) {
    console.log(`User authorized: ${req.user!.username || req.user!.id}. Proceeding to route handler.`);
    return next();
  }
  
  console.log("User unauthorized. Returning 401.");
  return res.status(401).json({ message: "Unauthorized" });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes and middleware
  setupAuth(app);
  
  // Debug endpoint to check session status
  app.get("/api/session-check", (req, res) => {
    console.log("Session check:", {
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      cookies: req.headers.cookie,
      hasAuthHeader: !!req.headers.authorization
    });
    
    res.json({
      sessionActive: !!req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      hasUser: !!req.user,
      cookiesPresent: !!req.headers.cookie,
      hasAuthHeader: !!req.headers.authorization
    });
  });
  
  // Debug endpoint to check token authentication
  app.get("/api/token-check", (req, res) => {
    const authHeader = req.headers.authorization;
    let tokenInfo: {
      present: boolean;
      format?: string;
      userIdPresent?: boolean;
      timestampPresent?: boolean;
      userId?: number | null;
      isValidUserId?: boolean;
      timestamp?: string | null;
    } = { present: false };
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      console.log("Token received:", token);
      
      // Parse token parts
      if (token.startsWith('user-')) {
        const parts = token.split('-');
        tokenInfo = {
          present: true,
          format: "user-id-timestamp",
          userIdPresent: parts.length >= 2,
          timestampPresent: parts.length >= 3,
          userId: parts.length >= 2 ? parseInt(parts[1]) : null,
          isValidUserId: parts.length >= 2 ? !isNaN(parseInt(parts[1])) : false,
          timestamp: parts.length >= 3 ? parts[2] : null
        };
      } else {
        tokenInfo = {
          present: true,
          format: "unknown"
        };
      }
    }
    
    res.json({
      token: tokenInfo,
      headers: {
        authorizationPresent: !!req.headers.authorization,
        cookies: !!req.headers.cookie
      }
    });
  });
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
  app.get("/api/projects/:projectId/chapters", isAuthenticated, async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const chapters = await storage.getProjectChapters(projectId);
    res.json(chapters);
  });

  app.get("/api/chapters/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const chapter = await storage.getChapter(id);
    
    if (!chapter) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    
    res.json(chapter);
  });

  app.post("/api/chapters", isAuthenticated, async (req: Request, res: Response) => {
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

  app.put("/api/chapters/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.delete("/api/chapters/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteChapter(id);
    
    if (!success) {
      return res.status(404).json({ message: "Chapter not found" });
    }
    
    res.status(204).send();
  });

  // Whiteboard routes
  app.get("/api/projects/:projectId/whiteboards", isAuthenticated, async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const whiteboards = await storage.getProjectWhiteboards(projectId);
    res.json(whiteboards);
  });

  app.get("/api/whiteboards/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const whiteboard = await storage.getWhiteboard(id);
    
    if (!whiteboard) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }
    
    res.json(whiteboard);
  });

  app.post("/api/whiteboards", isAuthenticated, async (req: Request, res: Response) => {
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

  app.put("/api/whiteboards/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.delete("/api/whiteboards/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteWhiteboard(id);
    
    if (!success) {
      return res.status(404).json({ message: "Whiteboard not found" });
    }
    
    res.status(204).send();
  });

  // Outline routes
  app.get("/api/projects/:projectId/outline", isAuthenticated, async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const outlineItems = await storage.getProjectOutline(projectId);
    res.json(outlineItems);
  });

  app.get("/api/outline/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const outlineItem = await storage.getOutlineItem(id);
    
    if (!outlineItem) {
      return res.status(404).json({ message: "Outline item not found" });
    }
    
    res.json(outlineItem);
  });

  app.post("/api/outline", isAuthenticated, async (req: Request, res: Response) => {
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

  app.put("/api/outline/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.delete("/api/outline/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteOutlineItem(id);
    
    if (!success) {
      return res.status(404).json({ message: "Outline item not found" });
    }
    
    res.status(204).send();
  });

  // Story Bible routes
  app.get("/api/projects/:projectId/story-bible", isAuthenticated, async (req: Request, res: Response) => {
    const projectId = parseInt(req.params.projectId);
    const storyBibleEntries = await storage.getProjectStoryBible(projectId);
    res.json(storyBibleEntries);
  });

  app.get("/api/story-bible/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const storyBibleEntry = await storage.getStoryBibleEntry(id);
    
    if (!storyBibleEntry) {
      return res.status(404).json({ message: "Story bible entry not found" });
    }
    
    res.json(storyBibleEntry);
  });

  app.post("/api/story-bible", isAuthenticated, async (req: Request, res: Response) => {
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

  app.put("/api/story-bible/:id", isAuthenticated, async (req: Request, res: Response) => {
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

  app.delete("/api/story-bible/:id", isAuthenticated, async (req: Request, res: Response) => {
    const id = parseInt(req.params.id);
    const success = await storage.deleteStoryBibleEntry(id);
    
    if (!success) {
      return res.status(404).json({ message: "Story bible entry not found" });
    }
    
    res.status(204).send();
  });

  // Plot structure template routes
  app.get("/api/plot-templates", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const templates = await storage.getAllPlotStructureTemplates();
      res.json(templates);
    } catch (error) {
      console.error("Error fetching plot templates:", error);
      res.status(500).json({ message: "Failed to fetch plot structure templates" });
    }
  });

  app.get("/api/plot-templates/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const template = await storage.getPlotStructureTemplate(id);
      
      if (!template) {
        return res.status(404).json({ message: "Plot structure template not found" });
      }
      
      res.json(template);
    } catch (error) {
      console.error("Error fetching plot template:", error);
      res.status(500).json({ message: "Failed to fetch plot structure template" });
    }
  });

  // Plot structure routes
  app.get("/api/projects/:projectId/plot-structures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const structures = await storage.getProjectPlotStructures(projectId);
      res.json(structures);
    } catch (error) {
      console.error("Error fetching plot structures:", error);
      res.status(500).json({ message: "Failed to fetch plot structures" });
    }
  });

  app.post("/api/plot-structures", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPlotStructureSchema.parse(req.body);
      const structure = await storage.createPlotStructure(validatedData);
      res.status(201).json(structure);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid plot structure data", errors: error.errors });
      }
      console.error("Error creating plot structure:", error);
      res.status(500).json({ message: "Failed to create plot structure" });
    }
  });

  app.get("/api/plot-structures/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const structure = await storage.getPlotStructure(id);
      
      if (!structure) {
        return res.status(404).json({ message: "Plot structure not found" });
      }
      
      res.json(structure);
    } catch (error) {
      console.error("Error fetching plot structure:", error);
      res.status(500).json({ message: "Failed to fetch plot structure" });
    }
  });

  app.put("/api/plot-structures/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedStructure = await storage.updatePlotStructure(id, req.body);
      
      if (!updatedStructure) {
        return res.status(404).json({ message: "Plot structure not found" });
      }
      
      res.json(updatedStructure);
    } catch (error) {
      console.error("Error updating plot structure:", error);
      res.status(500).json({ message: "Failed to update plot structure" });
    }
  });

  app.delete("/api/plot-structures/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlotStructure(id);
      
      if (!success) {
        return res.status(404).json({ message: "Plot structure not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plot structure:", error);
      res.status(500).json({ message: "Failed to delete plot structure" });
    }
  });

  // Plot structure section routes
  app.get("/api/plot-structures/:structureId/sections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const structureId = parseInt(req.params.structureId);
      const sections = await storage.getPlotStructureSections(structureId);
      res.json(sections);
    } catch (error) {
      console.error("Error fetching plot structure sections:", error);
      res.status(500).json({ message: "Failed to fetch plot structure sections" });
    }
  });

  app.post("/api/plot-structure-sections", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const validatedData = insertPlotStructureSectionSchema.parse(req.body);
      const section = await storage.createPlotStructureSection(validatedData);
      res.status(201).json(section);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid plot structure section data", errors: error.errors });
      }
      console.error("Error creating plot structure section:", error);
      res.status(500).json({ message: "Failed to create plot structure section" });
    }
  });

  app.put("/api/plot-structure-sections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const updatedSection = await storage.updatePlotStructureSection(id, req.body);
      
      if (!updatedSection) {
        return res.status(404).json({ message: "Plot structure section not found" });
      }
      
      res.json(updatedSection);
    } catch (error) {
      console.error("Error updating plot structure section:", error);
      res.status(500).json({ message: "Failed to update plot structure section" });
    }
  });

  app.delete("/api/plot-structure-sections/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deletePlotStructureSection(id);
      
      if (!success) {
        return res.status(404).json({ message: "Plot structure section not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting plot structure section:", error);
      res.status(500).json({ message: "Failed to delete plot structure section" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
