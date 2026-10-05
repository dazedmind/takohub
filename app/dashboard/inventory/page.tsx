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
import { ArrowRightLeft, Lock, Minus, Pen, Plus } from "lucide-react";
import { ActionTooltip } from "@/components/ui/tooltip";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { useSessionContext } from "@/components/providers/session-provider";
import { CameraModal } from "@/components/camera-modal";
import {
  useActiveShiftQuery,
  useBranchesQuery,
  useCentralInventoryQuery,
  useBranchInventoryQuery,
  useMovementsQuery,
  useReceiveStockMutation,
  useAdjustStockMutation,
  useUpdateInventoryMutation,
} from "@/lib/queries";
import { formatPeso } from "@/lib/business-logic";
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

  // Edit Item Modal (IM / Admin)
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editItemId, setEditItemId] = useState<number | null>(null);
  const [editItemName, setEditItemName] = useState<string>("");
  const [editUnit, setEditUnit] = useState<string>("pcs");
  const [editPrice, setEditPrice] = useState<string>("0");

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

  const { data: activeShiftData } = useActiveShiftQuery();
  const hasActiveShift = !!activeShiftData?.activeShift;
  const isShiftRequired = (isBS || isIM) && !hasActiveShift;

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
  const updateItemMutation = useUpdateInventoryMutation();

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

  const openEditDialog = (item: { itemId: number; itemName: string; unit: string; price?: number }) => {
    setEditItemId(item.itemId);
    setEditItemName(item.itemName);
    setEditUnit(item.unit || "pcs");
    setEditPrice(String(item.price ?? 0));
    setEditModalOpen(true);
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItemId) return;

    if (!editItemName.trim()) {
      dialog.show({ title: "Verification Required", message: "Please enter an item name", type: "error" });
      return;
    }

    if (!editUnit.trim()) {
      dialog.show({ title: "Verification Required", message: "Please enter a unit of measurement", type: "error" });
      return;
    }

    const priceNum = Number(editPrice);
    if (isNaN(priceNum) || priceNum < 0) {
      dialog.show({ title: "Verification Required", message: "Please enter a valid non-negative price", type: "error" });
      return;
    }

    try {
      await updateItemMutation.mutateAsync({
        itemId: editItemId,
        data: {
          itemName: editItemName.trim(),
          unit: editUnit.trim(),
          price: Math.round(priceNum),
        },
      });
      dialog.show({ title: "Success", message: `Updated "${editItemName.trim()}" successfully!`, type: "success" });
      setEditModalOpen(false);
    } catch (err) {
      dialog.show({ title: "Error", message: err instanceof Error ? err.message : "Failed to update item", type: "error" });
    }
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
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            {isBS ? "Branch Inventory" : "Inventory Management"}
          </h1>
        </div>

        {/* Actions for IM / Admin */}
        {!isBS && !isShiftRequired && (
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

      {/* LOCKED IF SHIFT REQUIRED BUT NOT ACTIVE */}
      {isShiftRequired ? (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center py-12">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Shift Required
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              You must start your shift on the dashboard before you can access Inventory.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                window.location.href = "/dashboard";
              }}
            >
              Go to Dashboard to Start Shift
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Navigation Tabs for IM / Admin */}
          {!isBS && (
            <div className="flex items-end gap-1 border-b border-zinc-200 dark:border-zinc-800 overflow-x-auto">
              <button
                type="button"
                onClick={() => setActiveTab("CENTRAL")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-all -mb-px border-b-2 ${
                  activeTab === "CENTRAL"
                    ? "bg-orange-100/80 dark:bg-orange-950/50 text-orange-950 dark:text-orange-100 font-bold border-b-orange-500"
                    : "border-b-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                }`}
              >
                Central Warehouse ({items.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("BRANCH")}
                className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-all -mb-px border-b-2 ${
                  activeTab === "BRANCH"
                    ? "bg-orange-100/80 dark:bg-orange-950/50 text-orange-950 dark:text-orange-100 font-bold border-b-orange-500"
                    : "border-b-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                }`}
              >
                Branch Inventory
              </button>

              {(isIM || isAdmin) && (
                <button
                  type="button"
                  onClick={() => setActiveTab("MOVEMENTS")}
                  className={`px-4 py-2 text-xs font-semibold rounded-t-md transition-all -mb-px border-b-2 ${
                    activeTab === "MOVEMENTS"
                      ? "bg-orange-100/80 dark:bg-orange-950/50 text-orange-950 dark:text-orange-100 font-bold border-b-orange-500"
                      : "border-b-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100/60 dark:hover:bg-zinc-800/40"
                  }`}
                >
                  Movements Audit ({movements.length})
                </button>
              )}
            </div>
          )}

          {/* Search & Location Bar */}
          <div className="flex flex-col sm:flex-row-reverse items-stretch sm:items-center justify-between gap-3">
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
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
              <CardContent className="p-0">
                {isCentralLoading ? (
                  <p className="text-xs text-zinc-500 py-6 text-center">Loading inventory...</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                          <th className="py-3 px-4 font-semibold">Item</th>
                          <th className="py-3 px-4 font-semibold">Price</th>
                          <th className="py-3 px-4 font-semibold text-center">Stock</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredCentralItems.map((item) => (
                          <tr
                            key={item.itemId}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.itemName}
                              <span className="ml-2 text-xs font-normal text-zinc-400">({item.unit || "pcs"})</span>
                            </td>
                            <td className="py-3 px-4 font-medium text-zinc-900 dark:text-zinc-100 text-base">
                              {formatPeso(item.price)}
                            </td>
                            {/* <td className="py-3 px-4 text-zinc-500 font-medium">{item.unit || "—"}</td> */}
                            <td className="py-3 px-4 text-center font-semibold text-base">{item.centralStock}</td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "LOW_STOCK"
                                    ? "border-yellow-500 text-yellow-600 bg-yellow-500 text-[10px] p-1 font-semibold"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-500 text-[10px] p-1 font-semibold"
                                }
                              >
                                {item.status === "LOW_STOCK" ? "" : ""}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end gap-1">
                                <ActionTooltip label="Adjust Stock">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openAdjustDialog(item.itemId, null)}
                                    aria-label="Adjust Stock"
                                  >
                                    <ArrowRightLeft size={15} />
                                  </Button>
                                </ActionTooltip>
                                <ActionTooltip label="Edit Item">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openEditDialog(item)}
                                    aria-label="Edit Item"
                                  >
                                    <Pen size={15} />
                                  </Button>
                                </ActionTooltip>
                              </div>
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
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
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
                          <th className="py-3 px-4 font-semibold">Product</th>
                          {/* <th className="py-3 px-4 font-semibold">Unit</th> */}
                          <th className="py-3 px-4 font-semibold text-center">Stock</th>
                          <th className="py-3 px-4 font-semibold">Status</th>
                          <th className="py-3 px-4 font-semibold text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                        {filteredBranchItems.map((item) => (
                          <tr
                            key={item.branchInventoryId}
                            className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                          >
                            <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                              {item.itemName}
                            </td>
                            {/* <td className="py-3 px-4 text-zinc-500 font-medium">{item.unit}</td> */}
                            <td className="py-3 px-4 text-center font-semibold text-zinc-900 dark:text-zinc-100 text-base">
                              {item.currentStock}
                            </td>
                            <td className="py-3 px-4">
                              <Badge
                                variant="outline"
                                className={
                                  item.status === "LOW_STOCK"
                                    ? "border-yellow-500 text-yellow-600 bg-yellow-500 p-1 font-semibold"
                                    : "border-emerald-500 text-emerald-600 bg-emerald-500 p-1 font-semibold"
                                }
                              >
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex justify-end">
                                <ActionTooltip label="Adjust Stock">
                                  <Button
                                    variant="ghost"
                                    size="icon-sm"
                                    onClick={() => openAdjustDialog(item.itemId, item.branchId)}
                                    aria-label="Adjust Stock"
                                  >
                                    <ArrowRightLeft size={15} />
                                  </Button>
                                </ActionTooltip>
                              </div>
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
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
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
                          <th className="py-3 px-4 font-semibold">Timestamp</th>
                          <th className="py-3 px-4 font-semibold">Item</th>
                          <th className="py-3 px-4 font-semibold">Event</th>
                          <th className="py-3 px-4 font-semibold">Location</th>
                          <th className="py-3 px-4 font-semibold text-center">Change</th>
                          <th className="py-3 px-4 font-semibold text-center">Balance</th>
                          <th className="py-3 px-4 font-semibold">User</th>
                          <th className="py-3 px-4 font-semibold">Reason</th>
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
                              <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">
                                {mov.itemName}
                              </td>
                              <td className="py-3 px-4 text-zinc-700 dark:text-zinc-300 font-medium">
                                {mov.movementType}
                              </td>
                              <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-semibold">
                                {mov.branchName || "Central Warehouse"}
                              </td>
                              <td
                                className={`py-3 px-4 text-center font-mono font-semibold ${
                                  isPositive ? "text-emerald-600" : "text-red-600"
                                }`}
                              >
                                {isPositive ? `+${mov.quantity}` : mov.quantity}
                              </td>
                              <td className="py-3 px-4 text-center font-mono text-zinc-500 font-semibold">
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

      {/* Edit Item Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleUpdateItem}>
            <DialogHeader>
              <DialogTitle>Edit Inventory Item</DialogTitle>
            </DialogHeader>

            <div className="space-y-3 py-3 text-sm">
              <div>
                <label className="text-xs text-zinc-500 block mb-1">Item Name</label>
                <Input
                  value={editItemName}
                  onChange={(e) => setEditItemName(e.target.value)}
                  placeholder="e.g. Cheese, Octopus, Flour"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Unit</label>
                <Input
                  value={editUnit}
                  onChange={(e) => setEditUnit(e.target.value)}
                  placeholder="e.g. pcs, kg, packs, boxes"
                  required
                  className="h-9 text-xs"
                />
              </div>

              <div>
                <label className="text-xs text-zinc-500 block mb-1">Price (₱)</label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  placeholder="0"
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={updateItemMutation.isPending}
              >
                {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
