import { users, type User, type InsertUser, swings, type Swing, type InsertSwing } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

// Define the storage interface with all needed CRUD operations
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Swing operations
  getSwing(id: number): Promise<Swing | undefined>;
  getSwingsByUserId(userId: number): Promise<Swing[]>;
  createSwing(swing: InsertSwing): Promise<Swing>;
  updateSwing(id: number, swing: Partial<InsertSwing>): Promise<Swing | undefined>;
  deleteSwing(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  // Swing operations
  async getSwing(id: number): Promise<Swing | undefined> {
    const result = await db.select().from(swings).where(eq(swings.id, id));
    return result[0];
  }

  async getSwingsByUserId(userId: number): Promise<Swing[]> {
    return await db.select().from(swings).where(eq(swings.userId, userId));
  }

  async createSwing(insertSwing: InsertSwing): Promise<Swing> {
    const result = await db.insert(swings).values(insertSwing).returning();
    return result[0];
  }

  async updateSwing(id: number, updates: Partial<InsertSwing>): Promise<Swing | undefined> {
    const result = await db
      .update(swings)
      .set(updates)
      .where(eq(swings.id, id))
      .returning();
      
    return result[0];
  }

  async deleteSwing(id: number): Promise<boolean> {
    const result = await db
      .delete(swings)
      .where(eq(swings.id, id))
      .returning();
      
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
