import { drizzle } from "drizzle-orm/neon-serverless";
import { sql } from "drizzle-orm";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

let pool: Pool | null = null;
let db: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  }
  return db!;
}

export async function pingDb(): Promise<boolean> {
  try {
    const database = getDb();
    await database.execute(sql`SELECT 1`);
    return true;
  } catch {
    return false;
  }
}

export { schema };
