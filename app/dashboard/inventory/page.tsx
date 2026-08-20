"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Minus, Pen, Plus } from "lucide-react";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { useSessionContext } from "@/components/providers/session-provider";
import { CameraModal } from "@/components/camera-modal";
import {
  useBranchesQuery,
  useCentralInventoryQuery,
  useBranchInventoryQuery,
  useMovementsQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
} from "@/lib/queries";
import type { SessionUser } from "@/lib/types";

export default function InventoryPage() {
  const { user } = useSessionContext();
  const dialog = useGlobalDialog();
  const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
  const [activeTab, setActiveTab] = useState<"CENTRAL" | "BRANCH" | "MOVEMENTS">(
    "BRANCH"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [cameraModalOpen, setCameraModalOpen] = useState(false);

  // Stock Receiving Modal (IM / Admin)
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveItemId, setReceiveItemId] = useState<number | "">("");
  const [receiveQty, setReceiveQty] = useState<string>("10");
  const [receiveReason, setReceiveReason] = useState<string>("Supplier restock");

  // Stock Adjustment Modal
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustItemId, setAdjustItemId] = useState<number | "">("");
  const [adjustBranchId, setAdjustBranchId] = useState<number | null>(null);
  const [adjustQty, setAdjustQty] = useState<string>("-1");
  const [adjustTargetQty, setAdjustTargetQty] = useState<number>(0);
  const [lastInitializedId, setLastInitializedId] = useState<string>("");
  const [adjustReason, setAdjustReason] = useState<string>("");

  const isBS = user?.role === "BS";
  const isIM = user?.role === "IM";
  const isAdmin = user?.role === "ADMIN";

  useEffect(() => {
    if (user && user.role !== "BS") {
      setActiveTab("CENTRAL");
    }
  }, [user]);

  // TanStack Queries
  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  // Set default selectedBranchId once branches load
  useEffect(() => {
    if (branches.length > 0 && selectedBranchId === "") {
      setSelectedBranchId(branches[0].branchId);
    }
  }, [branches, selectedBranchId]);

  const { data: centralData, isLoading: isCentralLoading } = useCentralInventoryQuery(
    !isBS && activeTab === "CENTRAL"
  );
  const items = centralData?.items || [];

  const { data: branchData, isLoading: isBranchLoading } = useBranchInventoryQuery(
    isBS ? undefined : selectedBranchId,
    activeTab === "BRANCH"
  );
  const branchItems = branchData?.branchItems || [];
  const bsHasActiveShift = branchData?.hasActiveShift;
  const bsBranchName = branchData?.branchName || "";
  const branchItemStock = branchItems.find((i) => i.itemId === adjustItemId)?.currentStock || 0;

  useEffect(() => {
    if (adjustModalOpen && adjustItemId) {
      const key = `${adjustBranchId}_${adjustItemId}`;
      if (lastInitializedId !== key) {
        const currentStock = (adjustBranchId 
          ? branchItems.find((i) => i.itemId === adjustItemId)?.currentStock 
          : items.find((i) => i.itemId === adjustItemId)?.centralStock) || 0;
        setAdjustTargetQty(currentStock);
        
        const hasItems = adjustBranchId ? branchItems.length > 0 : items.length > 0;
        if (hasItems) {
          setLastInitializedId(key);
        }
      }
    } else if (!adjustModalOpen && lastInitializedId !== "") {
      setLastInitializedId("");
    }
  }, [adjustItemId, adjustBranchId, adjustModalOpen, items, branchItems, lastInitializedId]);

  const { data: movementsData, isLoading: isMovementsLoading } = useMovementsQuery(
    !isBS && activeTab === "MOVEMENTS"
  );
  const movements = movementsData?.movements || [];

  // Mutations
  const receiveMutation = useReceiveStockMutation();
  const adjustMutation = useAdjustStockMutation();

  const handleReceiveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!receiveItemId || Number(receiveQty) <= 0) {
      dialog.show({ title: "Verification Required", message: "Please enter a valid item and quantity", type: "error" });
      return;
    }

    try {
      await receiveMutation.mutateAsync({
        itemId: Number(receiveItemId),
        quantity: Number(receiveQty),
        reason: receiveReason.trim(),
      });
      dialog.show({ title: "Success", message: `Received ${receiveQty} units into Central Inventory`, type: "success" });
      setReceiveModalOpen(false);
    } catch (err) {
      dialog.show({ title: "Error", message: err instanceof Error ? err.message : "Failed to receive stock", type: "error" });
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    const originalStock = (adjustBranchId 
      ? branchItems.find((i) => i.itemId === adjustItemId)?.currentStock 
      : items.find((i) => i.itemId === adjustItemId)?.centralStock) || 0;
    const diff = adjustTargetQty - originalStock;

    if (!adjustItemId || diff === 0) {
      dialog.show({ title: "Verification Required", message: "Please enter a valid non-zero adjustment quantity", type: "error" });
      return;
    }

    if (!adjustReason.trim()) {
      dialog.show({ title: "Verification Required", message: "Please provide a reason for the adjustment", type: "error" });
      return;
    }

    try {
      await adjustMutation.mutateAsync({
        itemId: Number(adjustItemId),
        branchId: adjustBranchId,
        adjustmentQuantity: diff,
        reason: adjustReason.trim(),
      });
      dialog.show({ title: "Success", message: "Stock adjustment applied successfully!", type: "success" });
      setAdjustModalOpen(false);
    } catch (err) {
      dialog.show({ title: "Error", message: err instanceof Error ? err.message : "Failed to adjust stock", type: "error" });
    }
  };

  const openAdjustDialog = (itemId: number, branchId: number | null) => {
    setAdjustItemId(itemId);
    setAdjustBranchId(branchId);
    setAdjustQty("-1");
    setAdjustReason("");
    setAdjustModalOpen(true);
  };

  const filteredCentralItems = items.filter((i) =>
    i.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredBranchItems = branchItems.filter((i) =>
    i.itemName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isBS ? "Branch Inventory" : "Inventory Management"}
          </h1>
          <p className="text-xs text-zinc-500">
            {isBS
              ? "View current quantities for your assigned branch."
              : "Central warehouse stock, branch distribution, and adjustments."}
          </p>
        </div>

        {/* Actions for IM / Admin */}
        {!isBS && (
          <div className="flex items-center gap-2">
            {(isIM || isAdmin) && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (items.length > 0 && !receiveItemId) {
                    setReceiveItemId(items[0].itemId);
                  }
                  setReceiveModalOpen(true);
                }}
                className="gap-1.5"
              >
                <Plus size={14} />
                <span>Receive Stock</span>
              </Button>
            )}

            <Button
              variant="tertiary"
              size="sm"
              onClick={() => {
                if (items.length > 0 && !adjustItemId) {
                  setAdjustItemId(items[0].itemId);
                }
                setAdjustBranchId(null);
                setAdjustModalOpen(true);
              }}
              className="gap-1.5"
            >
              <Pen size={13} />
              <span>Stock Adjustment</span>
            </Button>
          </div>
        )}
      </div>

      {/* BRANCH SELLER WITHOUT ACTIVE SHIFT */}
      {isBS && bsHasActiveShift === false && (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-center py-12">
          <CardContent className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Manage Inventory
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Start your shift to access branch inventory.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCameraModalOpen(true)}
            >
              Start Shift Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* BRANCH SELLER WITH ACTIVE SHIFT OR ADMIN/IM VIEW */}
      {(!isBS || bsHasActiveShift === true) && (
        <div className="space-y-4">
          {/* Navigation Tabs for IM / Admin */}
          {!isBS && (
            <div className="flex gap-2 border-b border-zinc-200 dark:border-zinc-800 pb-2">
              <button
                type="button"
                onClick={() => setActiveTab("CENTRAL")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "CENTRAL"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Central Warehouse ({items.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("BRANCH")}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                  activeTab === "BRANCH"
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                Branch Inventory
              </button>

              {(isIM || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setActiveTab("MOVEMENTS")}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                    activeTab === "MOVEMENTS"
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                      : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  Movements Audit ({movements.length})
                </button>
              )}
            </div>
          )}

          {/* Search & Location Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search items..."
              className="h-9 text-xs max-w-xs"
            />

            {!isBS && activeTab === "BRANCH" && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-500">Branch:</span>
                <select
                  className="flex h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedBranchId}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : "";
                    setSelectedBranchId(val);
                  }}
                >
                  {branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isBS && (
              <div className="text-xs text-zinc-600 dark:text-zinc-400">
                Current Branch: <span className="font-semibold text-zinc-900 dark:text-zinc-100">{bsBranchName}</span>
              </div>
            )}
          </div>

          {/* TAB 1: CENTRAL INVENTORY (IM / ADMIN ONLY) */}
          {activeTab === "CENTRAL" && !isBS && (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isCentralLoading ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">Loading inventory...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                          <th className="py-3 px-4 font-bold">Item</th>
                          {/* <th className="py-3 px-4 font-bold">Unit</th> */}
                          <th className="py-3 px-4 font-bold text-center">Stock</th>
                          <th className="py-3 px-4 font-bold">Status</th>
                          <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredCentralItems.map((item) => (
                          <tr
                            key={item.itemId}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                              {item.itemName}
                            </td>
                            {/* <td className="py-3 px-4 text-zinc-500 font-medium">{item.unit || "—"}</td> */}
                            <td className="py-3 px-4 text-center font-bold text-base">{item.centralStock}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "LOW_STOCK"
                                    ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20 text-xs px-2.5 py-0.5 font-bold"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-xs px-2.5 py-0.5 font-bold"
                                }
                              >
                                {item.status === "LOW_STOCK" ? "Low Stock" : "In Stock"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAdjustDialog(item.itemId, null)}
                                className="h-8 gap-1.5 text-zinc-600 hover:text-zinc-900 text-xs font-semibold"
                              >
                                <Pen size={14} />
                                <span>Adjust</span>
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 2: BRANCH INVENTORY (BS / ADMIN / IM) */}
          {activeTab === "BRANCH" && (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isBranchLoading ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">Loading branch inventory...</p>
                ) : filteredBranchItems.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    No items recorded for this branch.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                          <th className="py-3 px-4 font-bold">Product</th>
                          {/* <th className="py-3 px-4 font-bold">Unit</th> */}
                          <th className="py-3 px-4 font-bold text-center">Current Quantity</th>
                          <th className="py-3 px-4 font-bold">Status</th>
                          <th className="py-3 px-4 font-bold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredBranchItems.map((item) => (
                          <tr
                            key={item.branchInventoryId}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                              {item.itemName}
                            </td>
                            {/* <td className="py-3 px-4 text-zinc-500 font-medium">{item.unit}</td> */}
                            <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100 text-base">
                              {item.currentStock}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "LOW_STOCK"
                                    ? "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20 text-xs px-2.5 py-0.5 font-bold"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-xs px-2.5 py-0.5 font-bold"
                                }
                              >
                                {item.status === "LOW_STOCK" ? "Low Stock" : "In Stock"}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openAdjustDialog(item.itemId, item.branchId)}
                                className="h-8 gap-1.5 text-xs font-semibold"
                              >
                                <Pen size={14} />
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* TAB 3: MOVEMENTS AUDIT (IM / ADMIN ONLY) */}
          {activeTab === "MOVEMENTS" && !isBS && (
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <CardContent className="p-0">
                {isMovementsLoading ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">Loading audit log...</p>
                ) : movements.length === 0 ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">
                    No movements recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                          <th className="py-3 px-4 font-bold">Timestamp</th>
                          <th className="py-3 px-4 font-bold">Item</th>
                          <th className="py-3 px-4 font-bold">Event</th>
                          <th className="py-3 px-4 font-bold">Location</th>
                          <th className="py-3 px-4 font-bold text-center">Change</th>
                          <th className="py-3 px-4 font-bold text-center">Balance</th>
                          <th className="py-3 px-4 font-bold">User</th>
                          <th className="py-3 px-4 font-bold">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {movements.map((mov) => {
                          const isPositive = mov.quantity > 0;
                          return (
                            <tr
                              key={mov.movementId}
                              className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                                {new Date(mov.createdAt).toLocaleString("en-PH", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </td>
                              <td className="py-3 px-4 font-bold text-zinc-900 dark:text-zinc-100">
                                {mov.itemName}
                              </td>
                              <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                                {mov.movementType}
                              </td>
                              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-semibold">
                                {mov.branchName || "Central Warehouse"}
                              </td>
                              <td
                                className={`py-3 px-4 text-center font-mono font-bold ${
                                  isPositive ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {isPositive ? `+${mov.quantity}` : mov.quantity}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-zinc-500 font-bold">
                                {mov.previousBalance} → {mov.newBalance}
                              </td>
                              <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                                {mov.userName || "System"}
                              </td>
                              <td className="py-3 px-4 text-zinc-500 italic font-medium max-w-xs truncate">
                                {mov.reason || "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Camera Modal for starting shift */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onSuccess={() => {}}
        branches={branches}
      />

      {/* Stock Receiving Modal */}
      <Dialog open={receiveModalOpen} onOpenChange={setReceiveModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleReceiveStock}>
            <DialogHeader>
              <DialogTitle>Receive Central Stock</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3 text-sm">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Product Item</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={receiveItemId}
                  onChange={(e) => setReceiveItemId(Number(e.target.value))}
                  required
                >
                  {items.map((i) => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.itemName} ({i.unit || "pcs"}) — Current: {i.centralStock}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Quantity Received</label>
                <Input
                  type="number"
                  min={1}
                  value={receiveQty}
                  onChange={(e) => setReceiveQty(e.target.value)}
                  required
                  className="h-9 text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Reason / Supplier Note</label>
                <Input
                  value={receiveReason}
                  onChange={(e) => setReceiveReason(e.target.value)}
                  placeholder="Notes"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setReceiveModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={receiveMutation.isPending}
              >
                {receiveMutation.isPending ? "Recording..." : "Confirm Received"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Stock Adjustment Modal */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleAdjustStock}>
            <DialogHeader>
              <DialogTitle>Stock Adjustment</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3 text-sm">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Target Location</label>
                <div className="p-2 rounded-md bg-zinc-100 dark:bg-zinc-800 text-xs font-medium">
                  {adjustBranchId
                    ? branches.find((b) => b.branchId === adjustBranchId)?.branchName || bsBranchName
                    : "Central Warehouse"}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Product Item</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={adjustItemId}
                  onChange={(e) => setAdjustItemId(Number(e.target.value))}
                  required
                >
                  {(isBS ? branchItems : items).map((i) => (
                    <option key={i.itemId} value={i.itemId}>
                      {i.itemName} ({i.unit || "pcs"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Adjust Quantity (Target Stock)</label>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={(e) => { e.preventDefault(); setAdjustTargetQty((prev) => Math.max(0, prev - 1)); }}
                    className="h-9 w-9 p-0 flex items-center justify-center"
                  >
                    <Minus size={14} strokeWidth={4} />
                  </Button>
                  <Input
                    value={adjustTargetQty}
                    onChange={(e) => setAdjustTargetQty(Math.max(0, Number(e.target.value)))}
                    required
                    className="h-9 text-sm text-center font-mono flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={(e) => { e.preventDefault(); setAdjustTargetQty((prev) => prev + 1); }}
                    className="h-9 w-9 p-0 flex items-center justify-center"
                  >
                    <Plus size={14} strokeWidth={4} />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Reason for Adjustment</label>
                <Input
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Damaged / Count correction"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setAdjustModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={adjustMutation.isPending}
              >
                {adjustMutation.isPending ? "Submitting..." : "Apply Adjustment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
