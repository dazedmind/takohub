import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as authSchema from "@/app/db/auth-schema";
import * as appSchema from "@/app/db/schema";

const schema = { ...authSchema, ...appSchema };

let dbInstance: any = null;

function initDb() {
  const databaseUrl = typeof process !== "undefined" ? process.env.DATABASE_URL : undefined;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not set. Please configure the DATABASE_URL environment variable."
    );
  }
  if (!dbInstance) {
    const sql = neon(databaseUrl);
    dbInstance = drizzle(sql, { schema });
  }
  return dbInstance;
}

// Export a proxy that delegates to the lazily initialized drizzle instance
export const db = new Proxy({} as any, {
  get(target, prop, receiver) {
    const instance = initDb();
    const value = Reflect.get(instance, prop, receiver);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
  set(target, prop, value, receiver) {
    const instance = initDb();
    return Reflect.set(instance, prop, value, receiver);
  },
  has(target, prop) {
    const instance = initDb();
    return Reflect.has(instance, prop);
  },
  ownKeys(target) {
    const instance = initDb();
    return Reflect.ownKeys(instance);
  },
  getOwnPropertyDescriptor(target, prop) {
    const instance = initDb();
    return Reflect.getOwnPropertyDescriptor(instance, prop);
  }
});

export { schema };
