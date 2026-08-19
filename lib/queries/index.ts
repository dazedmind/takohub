import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  AdminDashboardStats,
  ActiveEmployeeShift,
  Branch,
  CreateBranchInput,
  CreateUserInput,
  InventoryItem,
  InventoryMovementWithDetails,
  InventoryStats,
  OrderStatus,
  OrderWithDetails,
  User,
} from "@/lib/types";

// ==========================================
// 1. Branches Queries & Mutations
// ==========================================
export function useBranchesQuery() {
  return useQuery<{ branches: Branch[] }>({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch("/api/branches");
      if (!res.ok) throw new Error("Failed to load branches");
      const data = await res.json();
      return Array.isArray(data) ? { branches: data } : data;
    },
  });
}

export function useCreateBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateBranchInput) => {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create branch");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useUpdateBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ branchId, data }: { branchId: number; data: CreateBranchInput }) => {
      const res = await fetch(`/api/branches/${branchId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update branch");
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

export function useDeleteBranchMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (branchId: number) => {
      const res = await fetch(`/api/branches/${branchId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete branch");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
    },
  });
}

// ==========================================
// 2. Inventory Queries & Mutations
// ==========================================
export function useCentralInventoryQuery(enabled = true) {
  return useQuery<{ items: InventoryItem[]; stats: InventoryStats }>({
    queryKey: ["inventory", "central"],
    queryFn: async () => {
      const res = await fetch("/api/inventory");
      if (!res.ok) throw new Error("Failed to load central inventory");
      const data = await res.json();
      return Array.isArray(data) ? { items: data } : data;
    },
    enabled,
    refetchInterval: 10000,
  });
}

export interface BranchStockItem {
  branchInventoryId: number;
  branchId: number;
  branchName: string;
  itemId: number;
  itemName: string;
  unit: string;
  currentStock: number;
  status: "LOW_STOCK" | "IN_STOCK" | "OUT_OF_STOCK";
  lastUpdated: string;
}

export function useBranchInventoryQuery(branchId?: number | "", enabled = true) {
  return useQuery<{
    hasActiveShift?: boolean;
    branchId?: number;
    branchName?: string;
    branchItems: BranchStockItem[];
  }>({
    queryKey: ["inventory", "branch", branchId ?? "all"],
    queryFn: async () => {
      const url = branchId
        ? `/api/inventory/branch?branchId=${branchId}`
        : "/api/inventory/branch";
      const res = await fetch(url);
      const data = await res.json();
      if (!res.ok && data.hasActiveShift === false) {
        return { hasActiveShift: false, branchItems: [] };
      }
      if (!res.ok) throw new Error(data.error || "Failed to load branch inventory");
      
      const result = Array.isArray(data) ? { branchItems: data } : data;
      
      if (result.branchName === undefined && branchId) {
        try {
          const bRes = await fetch("/api/branches");
          if (bRes.ok) {
            const bData = await bRes.json();
            const branchesList = Array.isArray(bData) ? bData : (bData.branches || []);
            const currentBranch = branchesList.find((b: any) => b.branchId === Number(branchId));
            if (currentBranch) {
              result.branchName = currentBranch.branchName;
            }
          }
        } catch {}
      }

      if (result.hasActiveShift === undefined) {
        try {
          const sRes = await fetch("/api/attendance/active");
          if (sRes.ok) {
            const sData = await sRes.json();
            const activeShift = sData?.activeShift;
            if (activeShift) {
              result.hasActiveShift = Number(activeShift.branchId) === Number(branchId);
            } else {
              result.hasActiveShift = false;
            }
          } else {
            result.hasActiveShift = false;
          }
        } catch {
          result.hasActiveShift = false;
        }
      }

      return result;
    },
    enabled,
    refetchInterval: 10000,
  });
}

export function useMovementsQuery(enabled = true) {
  return useQuery<{ movements: InventoryMovementWithDetails[] }>({
    queryKey: ["inventory", "movements"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/movements");
      if (!res.ok) throw new Error("Failed to load inventory movements");
      const data = await res.json();
      return Array.isArray(data) ? { movements: data } : data;
    },
    enabled,
  });
}

export function useCatalogQuery(enabled = true) {
  return useQuery<{ items: Array<{ itemId: number; itemName: string; unit: string | null }> }>({
    queryKey: ["inventory", "catalog"],
    queryFn: async () => {
      const res = await fetch("/api/inventory/catalog");
      if (!res.ok) throw new Error("Failed to load product catalog");
      const data = await res.json();
      return Array.isArray(data) ? { items: data } : data;
    },
    enabled,
  });
}

export function useReceiveStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { itemId: number; quantity: number; reason?: string }) => {
      const res = await fetch("/api/inventory/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive stock");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

export function useAdjustStockMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      itemId: number;
      branchId: number | null;
      adjustmentQuantity: number;
      reason: string;
    }) => {
      const res = await fetch("/api/inventory/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to adjust stock");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}

// ==========================================
// 3. Orders Queries & Mutations
// ==========================================
export function useOrdersQuery() {
  return useQuery<{ orders: OrderWithDetails[] }>({
    queryKey: ["orders"],
    queryFn: async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) throw new Error("Failed to load orders");
      const data = await res.json();
      return Array.isArray(data) ? { orders: data } : data;
    },
  });
}

export function useSubmitOrderMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { branchId: number; items: any[]; notes?: string }) => {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to submit order");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useUpdateOrderStatusMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: OrderStatus }) => {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update order status");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

// ==========================================
// 4. Attendance & Shift Queries
// ==========================================
export function useActiveShiftQuery() {
  return useQuery<{ activeShift: ActiveEmployeeShift | null }>({
    queryKey: ["attendance", "active"],
    queryFn: async () => {
      const res = await fetch("/api/attendance/active");
      if (!res.ok) return { activeShift: null };
      return res.json();
    },
    refetchInterval: 10000,
  });
}

export function useAttendanceHistoryQuery(filters: {
  date?: string;
  userId?: string;
  role?: string;
  branchId?: string;
  status?: string;
}) {
  return useQuery<{ records: any[] }>({
    queryKey: ["attendance", "history", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.date) {
        params.append("startDate", filters.date);
        params.append("endDate", filters.date);
      }
      if (filters.userId) params.append("userId", filters.userId);
      if (filters.role) params.append("role", filters.role);
      if (filters.branchId) params.append("branchId", filters.branchId);
      if (filters.status) params.append("status", filters.status);

      const res = await fetch(`/api/attendance/history?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load attendance records");
      return res.json();
    },
  });
}

// ==========================================
// 5. Sales Queries
// ==========================================
export function useSalesQuery(filters: {
  branchId?: string;
  startDate?: string;
  endDate?: string;
}) {
  return useQuery<{ sales: any[]; summary: any }>({
    queryKey: ["sales", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.branchId) params.append("branchId", filters.branchId);
      if (filters.startDate) params.append("startDate", filters.startDate);
      if (filters.endDate) params.append("endDate", filters.endDate);

      const res = await fetch(`/api/sales?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load sales history");
      return res.json();
    },
  });
}

// ==========================================
// 6. Dashboard Stats Query
// ==========================================
export function useDashboardStatsQuery(enabled = true) {
  return useQuery<{ stats: AdminDashboardStats }>({
    queryKey: ["dashboard", "stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats");
      if (!res.ok) throw new Error("Failed to load dashboard stats");
      return res.json();
    },
    enabled,
    refetchInterval: 10000,
  });
}

// ==========================================
// 7. Users Queries & Mutations
// ==========================================
export function useUsersQuery(enabled = true) {
  return useQuery<{ users: User[] }>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to load users");
      const data = await res.json();
      return Array.isArray(data) ? { users: data } : data;
    },
    enabled,
  });
}

export function useCreateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: CreateUserInput) => {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create user");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: Partial<CreateUserInput> }) => {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed to update user");
      return resData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteUserMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete user");
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
