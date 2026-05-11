import { pgTable, text, serial, integer, boolean, real, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// User table for authentication
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Swing analysis table to store uploaded media and analysis results
export const swings = pgTable("swings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  videoUrl: text("video_url"),
  imageUrls: text("image_urls").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isPublic: boolean("is_public").default(false),
  stats: jsonb("stats"),
  analysis: jsonb("analysis"),
});

// Define relations after both tables are defined to avoid circular references
export const usersRelations = relations(users, ({ many }) => ({
  swings: many(swings),
}));

export const swingsRelations = relations(swings, ({ one }) => ({
  user: one(users, {
    fields: [swings.userId],
    references: [users.id],
  }),
}));

// Stats schema for validating swing stats input
export const statsSchema = z.object({
  batSpeed: z.number().optional(),
  handSpeed: z.number().optional(),
  exitVelocity: z.number().optional(),
  launchAngle: z.number().optional(),
  attackAngle: z.number().optional(),
  timeToContact: z.number().optional(),
  planeEfficiency: z.number().optional(),
  rotationAngle: z.number().optional(),
  extensionAngle: z.number().optional(),
  onPlaneEfficiency: z.number().optional(),
  batterHeight: z.number().optional(),
  batterWeight: z.number().optional(),
  batWeight: z.number().optional(),
  batLength: z.number().optional(),
  age: z.number().optional(),
  experience: z.number().optional(),
  pitchType: z.string().optional(),
  additionalContext: z.string().optional(),
});

export type SwingStats = z.infer<typeof statsSchema>;

// Analysis options schema
export const analysisOptionsSchema = z.object({
  analyzeTechnique: z.boolean().default(true),
  analyzeMechanics: z.boolean().default(true),
  analyzeRecommendations: z.boolean().default(true),
});

export type AnalysisOptions = z.infer<typeof analysisOptionsSchema>;

// Analysis results schema
export const analysisResultsSchema = z.object({
  score: z.number(),
  overallScore: z.number().optional(),
  summary: z.string().optional(),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()).optional(),
  improvements: z.array(z.string()),
  keyFrames: z.array(z.object({
    time: z.number(),
    description: z.string(),
    imageUrl: z.string().optional(),
    annotations: z.array(z.object({
      type: z.enum(['line', 'angle', 'circle', 'arrow', 'text']),
      points: z.array(z.number()),
      color: z.string().optional(),
      text: z.string().optional(),
      thickness: z.number().optional(),
    })).optional(),
  })),
  drills: z.array(z.object({
    title: z.string(),
    description: z.string(),
    difficulty: z.string().optional(),
  })).optional(),
  recommendedDrills: z.array(z.object({
    title: z.string(),
    description: z.string(),
  })),
  advancedMetrics: z.record(z.string(), z.number()).optional(),
});

export type AnalysisResults = z.infer<typeof analysisResultsSchema>;

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSwingSchema = createInsertSchema(swings).pick({
  userId: true,
  title: true,
  description: true,
  videoUrl: true,
  imageUrls: true,
  isPublic: true,
  stats: true,
  analysis: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertSwing = z.infer<typeof insertSwingSchema>;
export type Swing = typeof swings.$inferSelect;

// AI provider selection — runtime schema. The matching TypeScript union
// `Provider` lives in `server/ai/types.ts`; both resolve to `'claude' | 'gemini'`.
export const providerSchema = z.enum(['claude', 'gemini']);
