import { drizzle } from "drizzle-orm/node-postgres";
import pkg from "pg";
const { Pool } = pkg;
import * as schema from "@shared/schema";

// Initialize postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Initialize drizzle with the schema
export const db = drizzle(pool, { schema });

// Ensure the connection is working
async function testConnection() {
  try {
    await pool.query("SELECT NOW()");
    console.log("✅ Database connection successful");
  } catch (error) {
    console.error("❌ Database connection failed:", error);
    process.exit(1);
  }
}

// Call this function when the server starts
testConnection();