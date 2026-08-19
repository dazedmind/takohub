"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Eye, Trash2, Lock } from "lucide-react";
import { toast } from "sonner";
import { useSessionContext } from "@/components/providers/session-provider";
import {
  useOrdersQuery,
  useBranchesQuery,
  useCatalogQuery,
  useActiveShiftQuery,
  useSubmitOrderMutation,
  useUpdateOrderStatusMutation,
} from "@/lib/queries";
import type {
  OrderWithDetails,
  OrderBasketItem,
  SessionUser,
  OrderStatus,
} from "@/lib/types";

export default function OrdersPage() {
  const { user } = useSessionContext();
  const [activeTab, setActiveTab] = useState<string>("ALL");

  // Order Creation State (Branch Seller)
  const [selectedBranchId, setSelectedBranchId] = useState<number | "">("");
  const [selectedItemId, setSelectedItemId] = useState<number | "">("");
  const [itemQuantity, setItemQuantity] = useState<string>("1");
  const [orderBasket, setOrderBasket] = useState<OrderBasketItem[]>([]);
  const [orderNotes, setOrderNotes] = useState<string>("");

  // Selected Order for Details & Status Dialog
  const [selectedOrder, setSelectedOrder] = useState<OrderWithDetails | null>(null);

  const isBS = user?.role === "BS";
  const isIM = user?.role === "IM";
  const isAdmin = user?.role === "ADMIN";

  // TanStack Queries
  const { data: ordersData, isLoading } = useOrdersQuery();
  const orders = ordersData?.orders || [];

  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  const { data: activeShiftData } = useActiveShiftQuery();
  const activeShift = activeShiftData?.activeShift;
  const bsHasActiveShift = activeShift !== null && activeShift !== undefined;

  const formatOrderIdDisplay = (orderId: number, createdOn: string | Date) => {
    const year = createdOn ? new Date(createdOn).getFullYear() : new Date().getFullYear();
    const paddedId = String(orderId).padStart(4, "0");
    return `${year}-${paddedId}`;
  };

  const { data: catalogData } = useCatalogQuery(isBS);
  const catalogItems = catalogData?.items || [];

  // Mutations
  const submitOrderMutation = useSubmitOrderMutation();
  const updateStatusMutation = useUpdateOrderStatusMutation();

  // For Branch Sellers: Auto-fill branch to their active shift branch and lock it
  useEffect(() => {
    if (isBS && activeShift?.branchId) {
      setSelectedBranchId(activeShift.branchId);
    } else if (branches.length > 0 && selectedBranchId === "") {
      setSelectedBranchId(branches[0].branchId);
    }
  }, [isBS, activeShift, branches, selectedBranchId]);

  useEffect(() => {
    if (catalogItems.length > 0 && selectedItemId === "") {
      setSelectedItemId(catalogItems[0].itemId);
    }
  }, [catalogItems, selectedItemId]);

  const activeBranchName =
    activeShift?.branchName ||
    branches.find((b) => b.branchId === Number(selectedBranchId))?.branchName ||
    `Branch ${selectedBranchId}`;

  // Basket Management
  const handleAddToBasket = () => {
    if (!selectedItemId) {
      toast.error("Please select an item");
      return;
    }

    const qty = Number(itemQuantity);
    if (!qty || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0");
      return;
    }

    const itemObj = catalogItems.find((i) => i.itemId === Number(selectedItemId));
    if (!itemObj) return;

    setOrderBasket((prev) => {
      const existingIdx = prev.findIndex((b) => b.itemId === itemObj.itemId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += qty;
        return updated;
      }
      return [
        ...prev,
        {
          itemId: itemObj.itemId,
          itemName: itemObj.itemName,
          unit: itemObj.unit || "pcs",
          quantity: qty,
        },
      ];
    });

    setItemQuantity("1");
    toast.success(`Added ${itemObj.itemName} (${qty}) to basket`);
  };

  const handleRemoveFromBasket = (itemId: number) => {
    setOrderBasket((prev) => prev.filter((b) => b.itemId !== itemId));
  };

  // Submit Order Mutation
  const handleSubmitOrder = async () => {
    if (!selectedBranchId) {
      toast.error("Please select your branch");
      return;
    }

    if (orderBasket.length === 0) {
      toast.error("Order basket is empty.");
      return;
    }

    try {
      await submitOrderMutation.mutateAsync({
        branchId: Number(selectedBranchId),
        items: orderBasket,
        notes: orderNotes.trim(),
      });
      setOrderBasket([]);
      setOrderNotes("");
      toast.success("Order submitted successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error submitting order");
    }
  };

  // Update Status Mutation
  const handleUpdateStatus = async (orderId: number, nextStatus: OrderStatus) => {
    if (nextStatus === "CANCELLED" && !confirm("Are you sure you want to cancel this order?")) {
      return;
    }
    try {
      await updateStatusMutation.mutateAsync({ orderId, status: nextStatus });
      setSelectedOrder(null);
      toast.success(
        nextStatus === "FULFILLED"
          ? "Order fulfilled! Stock transferred to branch."
          : `Order updated to ${nextStatus}`
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update order status");
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (activeTab === "ALL") return true;
    return o.status === activeTab;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {isBS ? "Manage Orders" : "Order Fulfillment Pipeline"}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {isBS
            ? "Request inventory supplies from the central warehouse."
            : "Review and process branch order requests."}
        </p>
      </div>

      {/* BRANCH SELLER WITHOUT ACTIVE SHIFT */}
      {isBS && bsHasActiveShift === false && (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm text-center py-12">
          <CardContent className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Manage Orders
            </h2>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              Start your shift to request branch supplies.
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
      )}

      {/* BRANCH SELLER ORDER BASKET */}
      {isBS && bsHasActiveShift === true && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-5">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Select Product</CardTitle>
                <CardDescription className="text-sm">
                  Choose item and quantity to add to order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {/* Branch Selection: Locked and auto-filled for Branch Seller */}
                <div>
                  <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                    Branch Location
                  </label>
                  <div className="flex h-10 w-full rounded-md border border-input bg-zinc-100 dark:bg-zinc-800 px-3 items-center text-sm font-semibold text-zinc-900 dark:text-zinc-100 cursor-not-allowed">
                    <span className="truncate">{activeBranchName}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                    Product Item
                  </label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={selectedItemId}
                    onChange={(e) =>
                      setSelectedItemId(e.target.value ? Number(e.target.value) : "")
                    }
                  >
                    {catalogItems.map((item) => (
                      <option key={item.itemId} value={item.itemId}>
                        {item.itemName} ({item.unit || "pcs"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                    Quantity
                  </label>
                  <Input
                    type="number"
                    min={1}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    className="h-10 text-base font-semibold"
                  />
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onClick={handleAddToBasket}
                  className="w-full h-10 text-sm font-bold"
                >
                  Add to Basket
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Order Basket Review */}
          <div className="lg:col-span-7">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold">Order Basket</CardTitle>
                  <CardDescription className="text-sm">
                    Items selected for this request
                  </CardDescription>
                </div>
                <span className="text-sm font-bold text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-md">
                  {orderBasket.length} items
                </span>
              </CardHeader>
              <CardContent className="space-y-4">
                {orderBasket.length === 0 ? (
                  <p className="text-sm text-zinc-500 py-8 text-center">
                    Basket is empty. Select products on the left.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="overflow-x-auto border border-zinc-200 dark:border-zinc-800 rounded-md">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                            <th className="py-3 px-3.5 font-bold">Item</th>
                            <th className="py-3 px-3.5 font-bold">Unit</th>
                            <th className="py-3 px-3.5 font-bold text-center">Qty</th>
                            <th className="py-3 px-3.5 text-right font-bold">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                          {orderBasket.map((item) => (
                            <tr key={item.itemId} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40">
                              <td className="py-2.5 px-3.5 font-medium">{item.itemName}</td>
                              <td className="py-2.5 px-3.5 text-zinc-500">{item.unit}</td>
                              <td className="py-2.5 px-3.5 text-center font-bold text-base">{item.quantity}</td>
                              <td className="py-2.5 px-3.5 text-right">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="xs"
                                  onClick={() => handleRemoveFromBasket(item.itemId)}
                                  className="h-8 text-red-600 hover:text-red-700 gap-1 text-xs"
                                >
                                  <Trash2 size={14} />
                                  <span>Remove</span>
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                        Remarks / Notes (Optional)
                      </label>
                      <Input
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="e.g. Urgent morning delivery"
                        className="h-10 text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleSubmitOrder}
                      disabled={submitOrderMutation.isPending}
                      className="w-full h-10 text-sm font-bold"
                    >
                      {submitOrderMutation.isPending ? "Submitting..." : "Submit Order Request"}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ORDERS LIST */}
      <div className="space-y-4">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 dark:border-zinc-800 pb-2">
          {["ALL", "PENDING", "PROCESSING", "READY", "FULFILLED", "CANCELLED"].map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider rounded-md transition-colors ${
                  activeTab === tab
                    ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
                    : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                }`}
              >
                {tab === "ALL" ? "All" : tab}
              </button>
            )
          )}
        </div>

        {/* Orders Table */}
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {isLoading ? (
              <p className="text-sm text-zinc-500 py-8 text-center">Loading orders...</p>
            ) : filteredOrders.length === 0 ? (
              <p className="text-sm text-zinc-500 py-8 text-center">
                No orders found for this status.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                      <th className="py-3 px-4 font-bold">Order ID</th>
                      <th className="py-3 px-4 font-bold">Branch</th>
                      <th className="py-3 px-4 font-bold">Requested By</th>
                      <th className="py-3 px-4 font-bold">Date</th>
                      <th className="py-3 px-4 font-bold text-center">Items</th>
                      <th className="py-3 px-4 font-bold">Status</th>
                      <th className="py-3 px-4 font-bold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.orderId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-zinc-900 dark:text-zinc-100">
                          #{formatOrderIdDisplay(order.orderId, order.createdOn)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-zinc-900 dark:text-zinc-100">{order.branchName}</td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400">{order.orderedByName}</td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {new Date(order.createdOn).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-center font-bold">
                          {order.items?.length || 0}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2.5 py-0.5 font-bold ${
                              order.status === "PENDING"
                                ? "border-amber-500 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                                : order.status === "PROCESSING"
                                ? "border-blue-500 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                                : order.status === "READY"
                                ? "border-purple-500 text-purple-600 bg-purple-50 dark:bg-purple-950/20"
                                : order.status === "FULFILLED"
                                ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                : "border-red-500 text-red-600 bg-red-50 dark:bg-red-950/20"
                            }`}
                          >
                            {order.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                            className="h-8 gap-1.5 text-xs font-semibold"
                          >
                            <Eye size={15} />
                            <span>View</span>
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
      </div>

      {/* Order Details & Status Workflow Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Order #{selectedOrder ? formatOrderIdDisplay(selectedOrder.orderId, selectedOrder.createdOn) : ""}</DialogTitle>
            <DialogDescription className="text-sm">
              {selectedOrder?.branchName} • Requested by {selectedOrder?.orderedByName}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 py-2 text-sm">
              <div className="space-y-1.5 text-zinc-600 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <div className="flex justify-between">
                  <span className="font-medium">Status:</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{selectedOrder.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Date:</span>
                  <span>{new Date(selectedOrder.createdOn).toLocaleString("en-PH")}</span>
                </div>
                {selectedOrder.notes && (
                  <div className="flex justify-between pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="font-medium">Notes:</span>
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">{selectedOrder.notes}</span>
                  </div>
                )}
                {selectedOrder.fulfilledOn && (
                  <div className="flex justify-between pt-1 text-emerald-600 font-medium">
                    <span>Fulfilled On:</span>
                    <span>{new Date(selectedOrder.fulfilledOn).toLocaleString("en-PH")}</span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-bold text-zinc-800 dark:text-zinc-200 block mb-2 text-sm">
                  Items Requested
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400">
                      <tr className="text-left">
                        <th className="py-2.5 px-3 font-bold">Item</th>
                        <th className="py-2.5 px-3 font-bold">Unit</th>
                        <th className="py-2.5 px-3 font-bold text-right">Qty</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                      {selectedOrder.items?.map((item) => (
                        <tr key={item.itemId}>
                          <td className="py-2.5 px-3 font-semibold text-zinc-900 dark:text-zinc-100">{item.itemName}</td>
                          <td className="py-2.5 px-3 text-zinc-500">{item.unit}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-base">{item.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* IM / Admin Status Updates */}
              {(isIM || isAdmin) &&
                selectedOrder.status !== "FULFILLED" &&
                selectedOrder.status !== "CANCELLED" && (
                  <div className="pt-3 space-y-2.5 border-t border-zinc-200 dark:border-zinc-800">
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block text-sm">
                      Update Order Status
                    </span>
                    <div className="flex gap-2">
                      {/* PENDING -> PROCESSING / CANCEL */}
                      {selectedOrder.status === "PENDING" && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedOrder.orderId, "PROCESSING")}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 h-9 text-sm font-bold"
                          >
                            Start Processing
                          </Button>
                          {(user?.role === "ADMIN" || selectedOrder.orderedBy === user?.id) && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleUpdateStatus(selectedOrder.orderId, "CANCELLED")}
                              disabled={updateStatusMutation.isPending}
                              className="h-9 text-sm font-semibold"
                            >
                              Cancel Order
                            </Button>
                          )}
                        </>
                      )}

                      {/* PROCESSING -> READY / CANCEL */}
                      {selectedOrder.status === "PROCESSING" && (
                        <>
                          <Button
                            type="button"
                            variant="primary"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedOrder.orderId, "READY")}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 h-9 text-sm font-bold"
                          >
                            Mark Ready for Delivery
                          </Button>
                          {(user?.role === "ADMIN" || selectedOrder.orderedBy === user?.id) && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleUpdateStatus(selectedOrder.orderId, "CANCELLED")}
                              disabled={updateStatusMutation.isPending}
                              className="h-9 text-sm font-semibold"
                            >
                              Cancel Order
                            </Button>
                          )}
                        </>
                      )}

                      {/* READY -> FULFILL / CANCEL */}
                      {selectedOrder.status === "READY" && (
                        <>
                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => handleUpdateStatus(selectedOrder.orderId, "FULFILLED")}
                            disabled={updateStatusMutation.isPending}
                            className="flex-1 h-9 text-sm font-bold"
                          >
                            Fulfill & Transfer Stock
                          </Button>
                          {(user?.role === "ADMIN" || selectedOrder.orderedBy === user?.id) && (
                            <Button
                              type="button"
                              variant="danger"
                              size="sm"
                              onClick={() => handleUpdateStatus(selectedOrder.orderId, "CANCELLED")}
                              disabled={updateStatusMutation.isPending}
                              className="h-9 text-sm font-semibold"
                            >
                              Cancel Order
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}
            </div>
          )}

          <DialogFooter className="pt-2 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="tertiary"
              onClick={() => setSelectedOrder(null)}
              className="text-sm h-9"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
