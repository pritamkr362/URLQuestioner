import type { Express } from "express";
import { createServer, type Server } from "http";
// @ts-ignore
import multer from "multer";
import { storage } from "./storage";
import { insertContentSessionSchema, insertMessageSchema } from "@shared/schema";
import { extractContentFromUrl } from "./services/scraper";
import { analyzeContent, answerQuestion, AVAILABLE_MODELS } from "./services/openai";
import { extractTextFromPDF, cleanupTempFile } from "./services/pdf-processor";

// Configure multer for PDF uploads
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req: any, file: any, cb: any) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

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
        sourceType: "url",
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

      // Get conversation history for context
      const existingMessages = await storage.getMessagesBySessionId(sessionId);
      const conversationHistory = existingMessages.map((msg: any) => ({
        role: msg.role,
        content: msg.content
      }));

      // Get AI response with conversation context
      const { answer, modelUsed } = await answerQuestion(
        question.trim(),
        session.extractedContent || null,
        session.topic,
        preferredModel,
        conversationHistory
      );

      // Save assistant message
      const assistantMessage = await storage.createMessage(
        insertMessageSchema.parse({
          sessionId,
          role: "assistant",
          content: answer,
          // modelUsed: modelUsed, // Remove this field as it doesn't exist in schema
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

  // Upload and analyze PDF
  app.post("/api/extract-pdf", upload.single('pdf'), async (req, res) => {
    let tempFilePath: string | undefined;
    try {
      const { topic, preferredModel } = req.body;
      const file = (req as any).file;

      if (!file) {
        return res.status(400).json({ message: "PDF file is required" });
      }

      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      tempFilePath = file.path;
      
      // Extract text from PDF
      const extractedContent = await extractTextFromPDF(tempFilePath);
      
      // Analyze content with AI
      const analysis = await analyzeContent(extractedContent, topic, preferredModel);

      // Create content session
      const sessionData = insertContentSessionSchema.parse({
        topic,
        title: analysis.title,
        extractedContent,
        wordCount: analysis.wordCount,
        readTime: analysis.readTime,
        modelUsed: analysis.modelUsed,
        sourceType: "pdf",
        fileName: file.originalname,
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
      console.error("PDF extraction error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to process PDF" 
      });
    } finally {
      // Clean up temp file
      if (tempFilePath) {
        cleanupTempFile(tempFilePath);
      }
    }
  });

  // Create topic-only session
  app.post("/api/create-topic-session", async (req, res) => {
    try {
      const { topic, preferredModel } = req.body;

      if (!topic) {
        return res.status(400).json({ message: "Topic is required" });
      }

      // Create topic-only session
      const sessionData = insertContentSessionSchema.parse({
        topic,
        title: `Discussion about ${topic}`,
        sourceType: "topic-only",
        modelUsed: preferredModel || AVAILABLE_MODELS[0],
      });

      const session = await storage.createContentSession(sessionData);
      
      res.json({
        session,
        analysis: {
          summary: `Ready to discuss ${topic}`,
          keyPoints: [`Open discussion about ${topic}`],
          modelUsed: sessionData.modelUsed,
        }
      });
    } catch (error) {
      console.error("Topic session creation error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to create topic session" 
      });
    }
  });

  // Export chat as PDF
  app.get("/api/sessions/:sessionId/export-pdf", async (req, res) => {
    try {
      const { sessionId } = req.params;
      
      const session = await storage.getContentSession(sessionId);
      if (!session) {
        return res.status(404).json({ message: "Session not found" });
      }

      const messages = await storage.getMessagesBySessionId(sessionId);
      
      // Return session and messages data for client-side PDF generation
      res.json({
        session,
        messages,
        exportData: {
          title: session.title || `${session.topic} Analysis`,
          topic: session.topic,
          sourceType: session.sourceType,
          fileName: session.fileName,
          url: session.url,
          wordCount: session.wordCount,
          readTime: session.readTime,
          createdAt: session.createdAt
        }
      });
    } catch (error) {
      console.error("Export error:", error);
      res.status(500).json({ 
        message: error instanceof Error ? error.message : "Failed to export chat" 
      });
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
