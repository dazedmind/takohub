import { db } from "../../../lib/db";
import { eq, and } from "drizzle-orm";
import { inventoryItems, branchInventory, stockAdjustments, inventoryMovements } from "../../db/schema";
import { requireRole } from "../../../lib/auth-utils";

function getStockStatus(qty: number): "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" {
  if (qty <= 0) return "OUT_OF_STOCK";
  if (qty <= 10) return "LOW_STOCK";
  return "IN_STOCK";
}

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN", "IM", "BS");
    const items = await db.select().from(inventoryItems).orderBy(inventoryItems.itemId);
    return Response.json(items);
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireRole(request, "ADMIN", "IM");
    const { branchId, itemId, adjustmentQuantity, reason } = await request.json();

    if (!itemId || adjustmentQuantity === undefined) {
      return Response.json({ message: "Item ID and adjustment quantity are required" }, { status: 400 });
    }

    const adjQty = parseInt(adjustmentQuantity, 10);
    const itemRecords = await db.select().from(inventoryItems).where(eq(inventoryItems.itemId, itemId));
    if (itemRecords.length === 0) {
      return Response.json({ message: "Inventory item not found" }, { status: 404 });
    }
    const item = itemRecords[0];

    let prevQty = 0;
    let newQty = 0;

    if (branchId) {
      // Branch stock adjustment
      const bId = parseInt(branchId, 10);
      const branchStockRecords = await db
        .select()
        .from(branchInventory)
        .where(and(eq(branchInventory.branchId, bId), eq(branchInventory.itemId, itemId)));

      if (branchStockRecords.length === 0) {
        // Create entry if not exists
        prevQty = 0;
        newQty = adjQty;
        await db.insert(branchInventory).values({
          branchId: bId,
          itemId,
          currentStock: newQty,
          status: getStockStatus(newQty)
        });
      } else {
        const record = branchStockRecords[0];
        prevQty = record.currentStock;
        newQty = prevQty + adjQty;
        if (newQty < 0) newQty = 0; // Prevent negative stock

        await db
          .update(branchInventory)
          .set({
            currentStock: newQty,
            status: getStockStatus(newQty),
            lastUpdated: new Date(),
          })
          .where(eq(branchInventory.branchInventoryId, record.branchInventoryId));
      }
    } else {
      // Central stock adjustment
      prevQty = item.centralStock;
      newQty = prevQty + adjQty;
      if (newQty < 0) newQty = 0; // Prevent negative stock

      await db
        .update(inventoryItems)
        .set({
          centralStock: newQty,
          status: getStockStatus(newQty),
          lastUpdated: new Date(),
        })
        .where(eq(inventoryItems.itemId, itemId));
    }

    // Log in stock_adjustments
    await db.insert(stockAdjustments).values({
      branchId: branchId ? parseInt(branchId, 10) : null,
      itemId,
      userId: session.id,
      previousQuantity: prevQty,
      adjustmentQuantity: adjQty,
      newQuantity: newQty,
      reason: reason || "Manual stock adjustment",
    });

    // Log in inventory_movements
    await db.insert(inventoryMovements).values({
      itemId,
      branchId: branchId ? parseInt(branchId, 10) : null,
      movementType: "STOCK_ADJUSTMENT",
      quantity: adjQty,
      previousBalance: prevQty,
      newBalance: newQty,
      userId: session.id,
      reason: reason || "Manual adjustment audit log",
    });

    return Response.json({ success: true, previousQuantity: prevQty, newQuantity: newQty });
  } catch (error: any) {
    console.error("Adjustment API error:", error);
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
