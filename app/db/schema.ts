import { pgTable, serial, text, integer, timestamp, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { user } from "./auth-schema";

// Enums
export const orderStatusEnum = pgEnum("order_status", ["PENDING", "PROCESSING", "READY", "FULFILLED", "CANCELLED"]);
export const stockStatusEnum = pgEnum("stock_status", ["LOW_STOCK", "IN_STOCK", "OUT_OF_STOCK"]);
export const shiftStatusEnum = pgEnum("shift_status", ["ACTIVE", "COMPLETED"]);
export const movementTypeEnum = pgEnum("movement_type", [
  "STOCK_RECEIVED",
  "ORDER_FULFILLED",
  "STOCK_ADJUSTMENT",
  "TRANSFER",
  "MANUAL_ADJUSTMENT"
]);

// Branches
export const branches = pgTable("branches", {
  branchId: serial("branch_id").primaryKey(),
  branchName: text("branch_name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Master Inventory
export const inventoryItems = pgTable("inventory_items", {
  itemId: serial("item_id").primaryKey(),
  itemName: text("item_name").notNull(),
  unit: text("unit").default("pcs").notNull(),
  centralStock: integer("central_stock").default(0).notNull(),
  status: stockStatusEnum("status").default("OUT_OF_STOCK").notNull(),
  photoUrl: text("photo_url"),
  lastUpdated: timestamp("last_updated")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Branch Inventory
export const branchInventory = pgTable("branch_inventory", {
  branchInventoryId: serial("branch_inventory_id").primaryKey(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  currentStock: integer("current_stock").default(0).notNull(),
  status: stockStatusEnum("status").default("OUT_OF_STOCK").notNull(),
  lastUpdated: timestamp("last_updated")
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull(),
});

// Session Log (Attendance)
export const sessionLog = pgTable("session_log", {
  sessionId: serial("session_id").primaryKey(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  shiftStatus: shiftStatusEnum("shift_status").default("ACTIVE").notNull(),
  startShift: timestamp("start_shift").defaultNow().notNull(),
  endShift: timestamp("end_shift"),
  durationMinutes: integer("duration_minutes"),
  selfieUrl: text("selfie_url").notNull(),
});

// Sales Reports
export const sales = pgTable("sales", {
  salesId: serial("sales_id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => sessionLog.sessionId, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  date: timestamp("date").defaultNow().notNull(),
  cheese: integer("cheese").default(0).notNull(),
  octobits: integer("octobits").default(0).notNull(),
  crab: integer("crab").default(0).notNull(),
  totalPlates: integer("total_plates").notNull(),
  totalSales: integer("total_sales").notNull(),
  cashOnhand: integer("cash_onhand").notNull(),
  expenses: integer("expenses").default(0).notNull(),
  salary: integer("salary").notNull(),
  gcashPayment: integer("gcash_payment").default(0).notNull(),
  free: integer("free").default(0).notNull(),
  shortOver: integer("short_over").notNull(),
  trashLeftover: integer("trash_leftover").default(0).notNull(),
  grossSales: integer("gross_sales").default(0).notNull(),
  netSales: integer("net_sales").default(0).notNull(),
});

// Sales Remarks
export const salesRemarks = pgTable("sales_remarks", {
  remarkId: serial("remark_id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => sessionLog.sessionId, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  remarks: text("remarks").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Branch Orders
export const orders = pgTable("orders", {
  orderId: serial("order_id").primaryKey(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  orderedBy: text("ordered_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  // orderList: Array of { itemId: number, itemName: string, unit: string, quantity: number }
  orderList: jsonb("order_list").notNull(),
  notes: text("notes"),
  fulfilledBy: text("fulfilled_by").references(() => user.id, { onDelete: "set null" }),
  createdOn: timestamp("created_on").defaultNow().notNull(),
  fulfilledOn: timestamp("fulfilled_on"),
});

// Manual Stock Adjustments
export const stockAdjustments = pgTable("stock_adjustments", {
  adjustmentId: serial("adjustment_id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.branchId, { onDelete: "cascade" }), // null = central
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  adjustmentQuantity: integer("adjustment_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inventory Movements Log
export const inventoryMovements = pgTable("inventory_movements", {
  movementId: serial("movement_id").primaryKey(),
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  branchId: integer("branch_id").references(() => branches.branchId, { onDelete: "cascade" }), // null = central
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  previousBalance: integer("previous_balance").notNull(),
  newBalance: integer("new_balance").notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  referenceId: text("reference_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Inventory Usage Log
export const inventoryUsageLog = pgTable("inventory_usage_log", {
  usageId: serial("usage_id").primaryKey(),
  sessionId: integer("session_id")
    .references(() => sessionLog.sessionId, { onDelete: "cascade" })
    .notNull(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  quantityUsed: integer("quantity_used").notNull(),
  remarks: text("remarks"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
