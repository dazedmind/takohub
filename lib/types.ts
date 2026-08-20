import type { InferSelectModel, InferInsertModel } from "drizzle-orm";
import type { user } from "@/app/db/auth-schema";
import type {
  branches,
  inventoryItems,
  branchInventory,
  orders,
  sessionLog,
  sales,
  stockAdjustments,
  inventoryMovements,
} from "@/app/db/schema";

export type UserRole = "ADMIN" | "BS" | "IM";

export type StockStatus = "LOW_STOCK" | "IN_STOCK" | "OUT_OF_STOCK";
export type OrderStatus =
  | "PENDING"
  | "PROCESSING"
  | "READY"
  | "FULFILLED"
  | "CANCELLED";
export type ShiftStatus = "ACTIVE" | "COMPLETED";
export type MovementType =
  | "STOCK_RECEIVED"
  | "ORDER_FULFILLED"
  | "STOCK_ADJUSTMENT"
  | "TRANSFER"
  | "MANUAL_ADJUSTMENT";

// Database models
export type User = InferSelectModel<typeof user>;
export type NewUser = InferInsertModel<typeof user>;

export type Branch = InferSelectModel<typeof branches>;
export type NewBranch = InferInsertModel<typeof branches>;

export type InventoryItem = InferSelectModel<typeof inventoryItems>;
export type NewInventoryItem = InferInsertModel<typeof inventoryItems>;

export type BranchInventoryItem = InferSelectModel<typeof branchInventory>;
export type NewBranchInventoryItem = InferInsertModel<typeof branchInventory>;

export type Order = InferSelectModel<typeof orders>;
export type NewOrder = InferInsertModel<typeof orders>;

export type SessionLog = InferSelectModel<typeof sessionLog>;
export type NewSessionLog = InferInsertModel<typeof sessionLog>;

export type Sale = InferSelectModel<typeof sales>;
export type NewSale = InferInsertModel<typeof sales>;

export type StockAdjustment = InferSelectModel<typeof stockAdjustments>;
export type NewStockAdjustment = InferInsertModel<typeof stockAdjustments>;

export type InventoryMovement = InferSelectModel<typeof inventoryMovements>;
export type NewInventoryMovement = InferInsertModel<typeof inventoryMovements>;

export interface InventoryMovementWithDetails extends InventoryMovement {
  itemName?: string;
  unit?: string | null;
  branchName?: string | null;
  userName?: string | null;
}

// Session & Auth
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  image?: string | null;
  emailVerified?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AppSession {
  user: SessionUser;
}

export interface ApiError {
  error: string;
}

// Order item structure
export interface OrderBasketItem {
  itemId: number;
  itemName: string;
  unit: string;
  quantity: number;
}

export interface OrderWithDetails extends Order {
  branchName?: string;
  orderedByName?: string;
  fulfilledByName?: string | null;
  items: OrderBasketItem[];
}

// Attendance with details
export interface ActiveEmployeeShift {
  sessionId: number;
  userId: string;
  userName: string;
  role: UserRole;
  branchId: number;
  branchName: string;
  startShift: string;
  endShift?: string | null;
  shiftStatus: ShiftStatus;
  selfieUrl: string;
  runningTime?: string;
  sales?: Sale | null;
}

// Inventory stats
export interface InventoryStats {
  totalItems: number;
  lowStock: number;
  inStock: number;
  outOfStock?: number;
}

// Dashboard statistics
export interface AdminDashboardStats {
  dailyRevenue: number;
  dailyGross?: number;
  dailyNet?: number;
  weeklyRevenue: number;
  totalPlatesToday: number;
  totalInventory: number;
  totalBranches: number;
  totalUsers: number;
  pendingOrders: number;
  activeEmployeesCount: number;
  activeShifts: ActiveEmployeeShift[];
  recentActivity: RecentActivity[];
  lowStockItems: InventoryItem[];
}

export interface RecentActivity {
  id: string;
  type: "order" | "sale" | "shift" | "adjustment";
  description: string;
  timestamp: string;
}

// Forms & Inputs
export interface StartShiftInput {
  branchId: number;
  selfieDataUrl: string;
}

export interface EndShiftSalesInput {
  sessionId: number;
  cheese: number;
  octobits: number;
  crab: number;
  cashOnhand: number;
  expenses: number;
  gcashPayment: number;
  free: number;
  shortOver: number;
  trashLeftover?: string;
}

export interface CreateOrderInput {
  branchId: number;
  items: OrderBasketItem[];
  notes?: string;
}

export interface StockAdjustmentInput {
  branchId?: number | null; // null for central
  itemId: number;
  adjustmentQuantity: number;
  reason: string;
}

export interface ReceiveStockInput {
  itemId: number;
  quantity: number;
  reason?: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}

export interface CreateBranchInput {
  branchName: string;
  address?: string;
}

export interface UpdateBranchInput {
  branchName?: string;
  address?: string;
}

export interface CreateInventoryInput {
  itemName: string;
  unit?: string;
  centralStock?: number;
  status?: StockStatus;
  photoUrl?: string;
}

export interface UpdateInventoryInput {
  itemName?: string;
  unit?: string;
  centralStock?: number;
  status?: StockStatus;
  photoUrl?: string;
}
