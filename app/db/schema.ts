import {
  pgTable,
  pgEnum,
  serial,
  text,
  integer,
  numeric,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { user } from "./auth-schema";

// ---------------------------------------------------------
// Enums
// ---------------------------------------------------------

export const orderStatusEnum = pgEnum("order_status", [
  "PENDING",
  "PROCESSING",
  "READY",
  "FULFILLED",
  "CANCELLED",
]);

export const stockStatusEnum = pgEnum("stock_status", [
  "LOW_STOCK",
  "IN_STOCK",
  "OUT_OF_STOCK",
]);

export const shiftStatusEnum = pgEnum("shift_status", [
  "ACTIVE",
  "COMPLETED",
]);

export const movementTypeEnum = pgEnum("movement_type", [
  "STOCK_RECEIVED",
  "ORDER_FULFILLED",
  "STOCK_ADJUSTMENT",
  "TRANSFER",
  "MANUAL_ADJUSTMENT",
]);

// ---------------------------------------------------------
// Branches
// ---------------------------------------------------------

export const branches = pgTable("branches", {
  branchId: serial("branch_id").primaryKey(),
  branchName: text("branch_name").notNull(),
  address: text("address"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Master & Central Inventory
// ---------------------------------------------------------

export const inventoryItems = pgTable("inventory_items", {
  itemId: serial("item_id").primaryKey(),
  itemName: text("item_name").notNull(),
  unit: text("unit").default("pcs"),
  centralStock: integer("central_stock").default(0).notNull(),
  status: stockStatusEnum("status").default("IN_STOCK").notNull(),
  photoUrl: text("photo_url"),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Branch Inventory
// ---------------------------------------------------------

export const branchInventory = pgTable("branch_inventory", {
  branchInventoryId: serial("branch_inventory_id").primaryKey(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  currentStock: integer("current_stock").default(0).notNull(),
  status: stockStatusEnum("status").default("IN_STOCK").notNull(),
  lastUpdated: timestamp("last_updated").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Attendance / Shift Logs
// ---------------------------------------------------------

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
  selfieUrl: text("selfie_url").notNull(), // Base64 or direct photo proof
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Sales Logs
// ---------------------------------------------------------

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
  totalPlates: integer("total_plates").default(0).notNull(),
  totalSales: integer("total_sales").default(0).notNull(),
  cashOnhand: integer("cash_onhand").default(0).notNull(),
  expenses: integer("expenses").default(0).notNull(),
  salary: integer("salary").default(0).notNull(),
  gcashPayment: integer("gcash_payment").default(0).notNull(),
  free: integer("free").default(0).notNull(),
  shortOver: integer("short_over").default(0).notNull(), // Signed: negative for short, positive for over
  trashLeftover: text("trash_leftover"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Orders
// ---------------------------------------------------------

export const orders = pgTable("orders", {
  orderId: serial("order_id").primaryKey(),
  branchId: integer("branch_id")
    .references(() => branches.branchId, { onDelete: "cascade" })
    .notNull(),
  orderedBy: text("ordered_by")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  status: orderStatusEnum("status").default("PENDING").notNull(),
  orderList: jsonb("order_list").notNull(), // [{ itemId, itemName, unit, quantity }]
  notes: text("notes"),
  fulfilledBy: text("fulfilled_by").references(() => user.id),
  createdOn: timestamp("created_on").defaultNow().notNull(),
  fulfilledOn: timestamp("fulfilled_on"),
});

// ---------------------------------------------------------
// Stock Adjustments (BS or IM audit)
// ---------------------------------------------------------

export const stockAdjustments = pgTable("stock_adjustments", {
  adjustmentId: serial("adjustment_id").primaryKey(),
  branchId: integer("branch_id").references(() => branches.branchId, { onDelete: "cascade" }), // null if central
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  userId: text("user_id")
    .references(() => user.id, { onDelete: "cascade" })
    .notNull(),
  previousQuantity: integer("previous_quantity").notNull(),
  adjustmentQuantity: integer("adjustment_quantity").notNull(),
  newQuantity: integer("new_quantity").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Inventory Movements (Central audit trail)
// ---------------------------------------------------------

export const inventoryMovements = pgTable("inventory_movements", {
  movementId: serial("movement_id").primaryKey(),
  itemId: integer("item_id")
    .references(() => inventoryItems.itemId, { onDelete: "cascade" })
    .notNull(),
  branchId: integer("branch_id").references(() => branches.branchId, { onDelete: "cascade" }),
  movementType: movementTypeEnum("movement_type").notNull(),
  quantity: integer("quantity").notNull(),
  previousBalance: integer("previous_balance").notNull(),
  newBalance: integer("new_balance").notNull(),
  userId: text("user_id").references(() => user.id),
  referenceId: text("reference_id"),
  reason: text("reason"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// Usage Log
// ---------------------------------------------------------

export const inventoryUsageLog = pgTable("inventory_usage_log", {
  usageId: serial("usage_id").primaryKey(),
  sessionId: integer("session_id").references(() => sessionLog.sessionId),
  branchId: integer("branch_id").references(() => branches.branchId, { onDelete: "cascade" }),
  itemId: integer("item_id").references(() => inventoryItems.itemId),
  quantityUsed: integer("quantity_used"),
  loggedAt: timestamp("logged_at").defaultNow().notNull(),
  remarks: text("remarks"),
});

// ---------------------------------------------------------
// Relations
// ---------------------------------------------------------

export const branchesRelations = relations(branches, ({ many }) => ({
  sessions: many(sessionLog),
  orders: many(orders),
  branchInventory: many(branchInventory),
  sales: many(sales),
  adjustments: many(stockAdjustments),
  movements: many(inventoryMovements),
}));

export const sessionLogRelations = relations(sessionLog, ({ one, many }) => ({
  user: one(user, {
    fields: [sessionLog.userId],
    references: [user.id],
  }),
  branch: one(branches, {
    fields: [sessionLog.branchId],
    references: [branches.branchId],
  }),
  sales: many(sales),
  usageLogs: many(inventoryUsageLog),
}));

export const salesRelations = relations(sales, ({ one }) => ({
  session: one(sessionLog, {
    fields: [sales.sessionId],
    references: [sessionLog.sessionId],
  }),
  user: one(user, {
    fields: [sales.userId],
    references: [user.id],
  }),
  branch: one(branches, {
    fields: [sales.branchId],
    references: [branches.branchId],
  }),
}));

export const ordersRelations = relations(orders, ({ one }) => ({
  branch: one(branches, {
    fields: [orders.branchId],
    references: [branches.branchId],
  }),
  orderedByUser: one(user, {
    fields: [orders.orderedBy],
    references: [user.id],
  }),
  fulfilledByUser: one(user, {
    fields: [orders.fulfilledBy],
    references: [user.id],
  }),
}));

export const inventoryItemsRelations = relations(inventoryItems, ({ many }) => ({
  branchInventory: many(branchInventory),
  adjustments: many(stockAdjustments),
  movements: many(inventoryMovements),
  usageLogs: many(inventoryUsageLog),
}));

export const branchInventoryRelations = relations(branchInventory, ({ one }) => ({
  branch: one(branches, {
    fields: [branchInventory.branchId],
    references: [branches.branchId],
  }),
  item: one(inventoryItems, {
    fields: [branchInventory.itemId],
    references: [inventoryItems.itemId],
  }),
}));

export const stockAdjustmentsRelations = relations(stockAdjustments, ({ one }) => ({
  branch: one(branches, {
    fields: [stockAdjustments.branchId],
    references: [branches.branchId],
  }),
  item: one(inventoryItems, {
    fields: [stockAdjustments.itemId],
    references: [inventoryItems.itemId],
  }),
  user: one(user, {
    fields: [stockAdjustments.userId],
    references: [user.id],
  }),
}));

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
  branch: one(branches, {
    fields: [inventoryMovements.branchId],
    references: [branches.branchId],
  }),
  item: one(inventoryItems, {
    fields: [inventoryMovements.itemId],
    references: [inventoryItems.itemId],
  }),
  user: one(user, {
    fields: [inventoryMovements.userId],
    references: [user.id],
  }),
}));
