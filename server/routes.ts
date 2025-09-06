import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertContentSessionSchema, insertMessageSchema } from "@shared/schema";
import { extractContentFromUrl } from "./services/scraper";
import { analyzeContent, answerQuestion, AVAILABLE_MODELS } from "./services/openai";

export async function registerRoutes(app: Express): Promise<Server> {
  // Extract and analyze content from URL
  app.post("/api/extract-content", async (req, res) => {
    try {
      const { url, topic, preferredModel } = req.body;

      if (!url || !topic) {
        return res.status(400).json({ message: "URL and topic are required" });
      }

      // Extract content from URL
      const extractedContent = await extractContentFromUrl(url);
      
      // Analyze content with AI
      const analysis = await analyzeContent(extractedContent, topic, preferredModel);

      // Create content session
      const sessionData = insertContentSessionSchema.parse({
        url,
        topic,
        title: analysis.title,
        extractedContent,
        wordCount: analysis.wordCount,
        readTime: analysis.readTime,
        modelUsed: analysis.modelUsed,
      });

      const session = await storage.createContentSession(sessionData);
      
      res.json({
        session,
        analysis: {
          summary: analysis.summary,
          keyPoints: analysis.keyPoints,
          modelUsed: analysis.modelUsed,
        }
      });
    } catch (error) {
      console.error("Content extraction error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to extract content" 
      });
    }
  });

  // Get content session by ID
  app.get("/api/sessions/:id", async (req, res) => {
    try {
      const session = await storage.getContentSession(req.params.id);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }
      res.json(session);
    } catch (error) {
      console.error("Get session error:", error);
      res.status(500).json({ message: "Failed to get session" });
    }
  });

  // Get all content sessions
  app.get("/api/sessions", async (req, res) => {
    try {
      const sessions = await storage.getAllContentSessions();
      res.json(sessions);
    } catch (error) {
      console.error("Get sessions error:", error);
      res.status(500).json({ message: "Failed to get sessions" });
    }
  });

  // Send a question and get AI response
  app.post("/api/sessions/:sessionId/ask", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const { question, preferredModel } = req.body;

      if (!question?.trim()) {
        return res.status(400).json({ message: "Question is required" });
      }

      const session = await storage.getContentSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      // Save user message
      const userMessage = await storage.createMessage(
        insertMessageSchema.parse({
          sessionId,
          role: "user",
          content: question.trim(),
        })
      );

      // Get AI response
      const { answer, modelUsed } = await answerQuestion(
        question.trim(),
        session.extractedContent,
        session.topic,
        preferredModel
      );

      // Save assistant message
      const assistantMessage = await storage.createMessage(
        insertMessageSchema.parse({
          sessionId,
          role: "assistant",
          content: answer,
          modelUsed: modelUsed,
        })
      );

      res.json({
        userMessage,
        assistantMessage,
      });
    } catch (error) {
      console.error("Question answering error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process question" 
      });
    }
  });

  // Get messages for a session
  app.get("/api/sessions/:sessionId/messages", async (req, res) => {
    try {
      const messages = await storage.getMessagesBySessionId(req.params.sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ message: "Failed to get messages" });
    }
  });

  // Get available AI models
  app.get("/api/models", async (req, res) => {
    try {
      res.json({ models: AVAILABLE_MODELS });
    } catch (error) {
      console.error("Get models error:", error);
      res.status(500).json({ message: "Failed to get available models" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
