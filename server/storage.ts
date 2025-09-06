import { type ContentSession, type InsertContentSession, type Message, type InsertMessage } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // Content Sessions
  createContentSession(session: InsertContentSession): Promise<ContentSession>;
  getContentSession(id: string): Promise<ContentSession | undefined>;
  getAllContentSessions(): Promise<ContentSession[]>;
  
  // Messages
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesBySessionId(sessionId: string): Promise<Message[]>;
}

export class MemStorage implements IStorage {
  private contentSessions: Map<string, ContentSession>;
  private messages: Map<string, Message>;

  constructor() {
    this.contentSessions = new Map();
    this.messages = new Map();
  }

  async createContentSession(insertSession: InsertContentSession): Promise<ContentSession> {
    const id = randomUUID();
    const session: ContentSession = { 
      ...insertSession, 
      id, 
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
}

export const storage = new MemStorage();
