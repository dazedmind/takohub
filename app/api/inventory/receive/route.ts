import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems, inventoryMovements } from "@/app/db/schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";
import type { ReceiveStockInput } from "@/lib/types";

export async function POST(request: Request) {
  // Only Admin or Inventory Manager can receive stock into central
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;

  try {
    const body = (await request.json()) as ReceiveStockInput;

    const itemId = Number(body.itemId);
    const quantity = Number(body.quantity);

    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: "Received quantity must be greater than 0" },
        { status: 400 }
      );
    }

    const item = await db.query.inventoryItems.findFirst({
      where: eq(inventoryItems.itemId, itemId),
    });

    if (!item) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    const prevBalance = item.centralStock;
    const newBalance = prevBalance + quantity;

    // Update central stock
    const [updatedItem] = await db
      .update(inventoryItems)
      .set({
        centralStock: newBalance,
        status: newBalance <= 10 ? "LOW_STOCK" : "IN_STOCK",
        lastUpdated: new Date(),
      })
      .where(eq(inventoryItems.itemId, itemId))
      .returning();

    // Log movement
    await db.insert(inventoryMovements).values({
      itemId,
      branchId: null,
      movementType: "STOCK_RECEIVED",
      quantity,
      previousBalance: prevBalance,
      newBalance,
      userId: currentUser.id,
      reason: body.reason?.trim() || "Supplier Stock Receiving (Central Kitchen)",
      referenceId: `RCV-${Date.now()}`,
    });

    return NextResponse.json({
      message: `Successfully received ${quantity} ${item.unit || "units"} of ${item.itemName}`,
      item: updatedItem,
    });
  } catch (error) {
    console.error("Stock receive error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to receive stock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
