import { neon } from "@neondatabase/serverless";
import { hashPassword } from "./crypto.ts";

const dbUrl = "postgresql://neondb_owner:npg_BjTs9W8mxHkX@ep-red-hall-ahgu44tv-pooler.c-3.us-east-1.aws.neon.tech/neondb?uselibpqcompat=true&sslmode=require&channel_binding=require";

async function main() {
  console.log("Dropping existing tables for a clean sync...");
  const sql = neon(dbUrl);

  try {
    // Drop tables with cascade to avoid foreign key issues
    const tables = [
      "inventory_usage_log",
      "inventory_movements",
      "stock_adjustments",
      "orders",
      "sales",
      "session_log",
      "branch_inventory",
      "inventory_items",
      "branches",
      "user"
    ];

    for (const table of tables) {
      await sql.query(`DROP TABLE IF EXISTS "${table}" CASCADE;`);
    }
    console.log("Existing tables dropped.");

    // 1. Create Enums if they don't exist
    await sql.query(`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('ADMIN', 'BS', 'IM');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.query(`
      DO $$ BEGIN
        CREATE TYPE order_status AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FULFILLED', 'CANCELLED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.query(`
      DO $$ BEGIN
        CREATE TYPE stock_status AS ENUM ('LOW_STOCK', 'IN_STOCK', 'OUT_OF_STOCK');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.query(`
      DO $$ BEGIN
        CREATE TYPE shift_status AS ENUM ('ACTIVE', 'COMPLETED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await sql.query(`
      DO $$ BEGIN
        CREATE TYPE movement_type AS ENUM ('STOCK_RECEIVED', 'ORDER_FULFILLED', 'STOCK_ADJUSTMENT', 'TRANSFER', 'MANUAL_ADJUSTMENT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    console.log("Enums initialized.");

    // 2. Create Tables
    // User Table
    await sql.query(`
      CREATE TABLE "user" (
        "id" TEXT PRIMARY KEY,
        "name" TEXT NOT NULL,
        "username" TEXT NOT NULL UNIQUE,
        "password" TEXT NOT NULL,
        "role" role NOT NULL DEFAULT 'BS',
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Branches Table
    await sql.query(`
      CREATE TABLE "branches" (
        "branch_id" SERIAL PRIMARY KEY,
        "branch_name" TEXT NOT NULL,
        "address" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Inventory Items Table
    await sql.query(`
      CREATE TABLE "inventory_items" (
        "item_id" SERIAL PRIMARY KEY,
        "item_name" TEXT NOT NULL,
        "unit" TEXT NOT NULL DEFAULT 'pcs',
        "central_stock" INTEGER NOT NULL DEFAULT 0,
        "status" stock_status NOT NULL DEFAULT 'OUT_OF_STOCK',
        "photo_url" TEXT,
        "last_updated" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Branch Inventory Table
    await sql.query(`
      CREATE TABLE "branch_inventory" (
        "branch_inventory_id" SERIAL PRIMARY KEY,
        "branch_id" INTEGER NOT NULL REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "inventory_items" ("item_id") ON DELETE CASCADE,
        "current_stock" INTEGER NOT NULL DEFAULT 0,
        "status" stock_status NOT NULL DEFAULT 'OUT_OF_STOCK',
        "last_updated" TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT branch_item_unique UNIQUE (branch_id, item_id)
      );
    `);

    // Session Log (Attendance) Table
    await sql.query(`
      CREATE TABLE "session_log" (
        "session_id" SERIAL PRIMARY KEY,
        "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "branch_id" INTEGER NOT NULL REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "shift_status" shift_status NOT NULL DEFAULT 'ACTIVE',
        "start_shift" TIMESTAMP NOT NULL DEFAULT NOW(),
        "end_shift" TIMESTAMP,
        "duration_minutes" INTEGER,
        "selfie_url" TEXT NOT NULL
      );
    `);

    // Sales Table
    await sql.query(`
      CREATE TABLE "sales" (
        "sales_id" SERIAL PRIMARY KEY,
        "session_id" INTEGER NOT NULL REFERENCES "session_log" ("session_id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "branch_id" INTEGER NOT NULL REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "date" TIMESTAMP NOT NULL DEFAULT NOW(),
        "cheese" INTEGER NOT NULL DEFAULT 0,
        "octobits" INTEGER NOT NULL DEFAULT 0,
        "crab" INTEGER NOT NULL DEFAULT 0,
        "total_plates" INTEGER NOT NULL,
        "total_sales" INTEGER NOT NULL,
        "cash_onhand" INTEGER NOT NULL,
        "expenses" INTEGER NOT NULL DEFAULT 0,
        "salary" INTEGER NOT NULL,
        "gcash_payment" INTEGER NOT NULL DEFAULT 0,
        "free" INTEGER NOT NULL DEFAULT 0,
        "short_over" INTEGER NOT NULL,
        "trash_leftover" TEXT
      );
    `);

    // Orders Table
    await sql.query(`
      CREATE TABLE "orders" (
        "order_id" SERIAL PRIMARY KEY,
        "branch_id" INTEGER NOT NULL REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "ordered_by" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "status" order_status NOT NULL DEFAULT 'PENDING',
        "order_list" JSONB NOT NULL,
        "notes" TEXT,
        "fulfilled_by" TEXT REFERENCES "user" ("id") ON DELETE SET NULL,
        "created_on" TIMESTAMP NOT NULL DEFAULT NOW(),
        "fulfilled_on" TIMESTAMP
      );
    `);

    // Stock Adjustments Table
    await sql.query(`
      CREATE TABLE "stock_adjustments" (
        "adjustment_id" SERIAL PRIMARY KEY,
        "branch_id" INTEGER REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "inventory_items" ("item_id") ON DELETE CASCADE,
        "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "previous_quantity" INTEGER NOT NULL,
        "adjustment_quantity" INTEGER NOT NULL,
        "new_quantity" INTEGER NOT NULL,
        "reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Inventory Movements Table
    await sql.query(`
      CREATE TABLE "inventory_movements" (
        "movement_id" SERIAL PRIMARY KEY,
        "item_id" INTEGER NOT NULL REFERENCES "inventory_items" ("item_id") ON DELETE CASCADE,
        "branch_id" INTEGER REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "movement_type" movement_type NOT NULL,
        "quantity" INTEGER NOT NULL,
        "previous_balance" INTEGER NOT NULL,
        "new_balance" INTEGER NOT NULL,
        "user_id" TEXT NOT NULL REFERENCES "user" ("id") ON DELETE CASCADE,
        "reference_id" TEXT,
        "reason" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Inventory Usage Log Table
    await sql.query(`
      CREATE TABLE "inventory_usage_log" (
        "usage_id" SERIAL PRIMARY KEY,
        "session_id" INTEGER NOT NULL REFERENCES "session_log" ("session_id") ON DELETE CASCADE,
        "branch_id" INTEGER NOT NULL REFERENCES "branches" ("branch_id") ON DELETE CASCADE,
        "item_id" INTEGER NOT NULL REFERENCES "inventory_items" ("item_id") ON DELETE CASCADE,
        "quantity_used" INTEGER NOT NULL,
        "remarks" TEXT,
        "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("Tables created successfully.");

    // 3. Seed Users
    const adminPasswordHash = await hashPassword("admin123");
    const sellerPasswordHash = await hashPassword("seller123");
    const managerPasswordHash = await hashPassword("manager123");

    await sql.query(`
      INSERT INTO "user" (id, name, username, password, role)
      VALUES 
        ('usr_admin', 'Admin Owner', 'admin', $1, 'ADMIN'),
        ('usr_seller', 'Seller Juan', 'seller', $2, 'BS'),
        ('usr_manager', 'Manager Maria', 'manager', $3, 'IM')
      ON CONFLICT (username) DO NOTHING;
    `, [adminPasswordHash, sellerPasswordHash, managerPasswordHash]);

    // 4. Seed Branches
    await sql.query(`
      INSERT INTO "branches" (branch_id, branch_name, address)
      VALUES 
        (1, 'Manila Stall', 'Taft Avenue, Manila'),
        (2, 'Quezon City Stall', 'Katipunan, QC'),
        (3, 'Makati Stall', 'Ayala Avenue, Makati')
      ON CONFLICT (branch_id) DO NOTHING;
    `);

    // 5. Seed Inventory Items
    const items = [
      { id: 1, name: "Flour Mix", unit: "bags", central: 100 },
      { id: 2, name: "Cheese Bits", unit: "kg", central: 50 },
      { id: 3, name: "Octopus Bits", unit: "kg", central: 50 },
      { id: 4, name: "Crab Sticks", unit: "pack", central: 80 },
      { id: 5, name: "Takoyaki Sauce", unit: "bottles", central: 60 },
      { id: 6, name: "Bonito Flakes", unit: "bags", central: 40 },
      { id: 7, name: "Kewpie Mayonnaise", unit: "bottles", central: 60 },
      { id: 8, name: "Seaweed Powder", unit: "pack", central: 30 },
      { id: 9, name: "Paper Plates", unit: "pcs", central: 1000 },
      { id: 10, name: "Toothpicks", unit: "box", central: 20 }
    ];

    for (const item of items) {
      await sql.query(`
        INSERT INTO "inventory_items" (item_id, item_name, unit, central_stock, status)
        VALUES ($1, $2, $3, $4, 'IN_STOCK')
        ON CONFLICT (item_id) DO NOTHING;
      `, [item.id, item.name, item.unit, item.central]);
    }

    // 6. Connect Branch Inventory mapping for item seed
    for (const bId of [1, 2, 3]) {
      for (const item of items) {
        await sql.query(`
          INSERT INTO "branch_inventory" (branch_id, item_id, current_stock, status)
          VALUES ($1, $2, 0, 'OUT_OF_STOCK')
          ON CONFLICT (branch_id, item_id) DO NOTHING;
        `, [bId, item.id]);
      }
    }

    console.log("Seeding complete. Database is fully initialized!");
  } catch (error) {
    console.error("Error during database initialization:", error);
  }
}

main();
