import { type ContentSession, type InsertContentSession, type Message, type InsertMessage, type Mcq, type InsertMcq } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Content Sessions
  createContentSession(session: InsertContentSession): Promise<ContentSession>;
  getContentSession(id: string): Promise<ContentSession | undefined>;
  getAllContentSessions(): Promise<ContentSession[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySessionId(sessionId: string): Promise<Message[]>;
  
  // MCQs
  createMcq(mcq: InsertMcq): Promise<Mcq>;
  getMcqBySessionId(sessionId: string): Promise<Mcq | undefined>;
}

export class MemStorage implements IStorage {
  private contentSessions: Map<string, ContentSession>;
  private messages: Map<string, Message>;
  private mcqs: Map<string, Mcq>;

  constructor() {
    this.contentSessions = new Map();
    this.messages = new Map();
    this.mcqs = new Map();
  }

  async createContentSession(insertSession: InsertContentSession): Promise<ContentSession> {
    const id = randomUUID();
    const session: ContentSession = { 
      ...insertSession, 
      id,
      url: insertSession.url || null,
      title: insertSession.title || null,
      extractedContent: insertSession.extractedContent || null,
      wordCount: insertSession.wordCount || null,
      readTime: insertSession.readTime || null,
      modelUsed: insertSession.modelUsed || null,
      sourceType: insertSession.sourceType || "url",
      fileName: insertSession.fileName || null,
      createdAt: new Date() 
    };
    this.contentSessions.set(id, session);
    return session;
  }

  async getContentSession(id: string): Promise<ContentSession | undefined> {
    return this.contentSessions.get(id);
  }

  async getAllContentSessions(): Promise<ContentSession[]> {
    return Array.from(this.contentSessions.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id,
      modelUsed: insertMessage.modelUsed || null,
      timestamp: new Date() 
    };
    this.messages.set(id, message);
    return message;
  }

  async getMessagesBySessionId(sessionId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.sessionId === sessionId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime());
  }

  async createMcq(insertMcq: InsertMcq): Promise<Mcq> {
    const id = randomUUID();
    const mcq: Mcq = {
      ...insertMcq,
      id,
      createdAt: new Date()
    };
    this.mcqs.set(id, mcq);
    return mcq;
  }

  async getMcqBySessionId(sessionId: string): Promise<Mcq | undefined> {
    return Array.from(this.mcqs.values())
      .find(mcq => mcq.sessionId === sessionId);
  }
}

export const storage = new MemStorage();
