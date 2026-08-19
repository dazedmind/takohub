import { pgTable, text, timestamp, pgEnum } from "drizzle-orm/pg-core";

export const user_role = pgEnum("role", ["ADMIN", "BS", "IM"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: user_role("role").notNull().default("BS"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});
