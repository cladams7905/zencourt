/**
 * Database Client
 *
 * Singleton database connection using Drizzle ORM with Neon serverless driver.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool } from "@neondatabase/serverless";
import * as schema from "./drizzle/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create a connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Create the Drizzle database instance
export const db = drizzle({ client: pool, schema });

// Export schema for use in queries
export * from "./drizzle/schema";
