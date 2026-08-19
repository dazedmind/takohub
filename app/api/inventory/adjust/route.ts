import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  inventoryItems,
  branchInventory,
  stockAdjustments,
  inventoryMovements,
} from "@/app/db/schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";
import type { StockAdjustmentInput } from "@/lib/types";

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;

  try {
    const body = (await request.json()) as StockAdjustmentInput;

    const itemId = Number(body.itemId);
    const adjustmentQty = Number(body.adjustmentQuantity);
    const branchId = body.branchId ? Number(body.branchId) : null;
    const reason = body.reason?.trim();

    if (!itemId || isNaN(itemId)) {
      return NextResponse.json({ error: "Item ID is required" }, { status: 400 });
    }

    if (!adjustmentQty || adjustmentQty === 0 || isNaN(adjustmentQty)) {
      return NextResponse.json(
        { error: "Adjustment quantity must not be zero" },
        { status: 400 }
      );
    }

    if (!reason) {
      return NextResponse.json(
        { error: "A clear reason is required for any stock adjustment" },
        { status: 400 }
      );
    }

    // If BS, they must specify their branch and cannot adjust central
    if (currentUser.role === "BS" && !branchId) {
      return NextResponse.json(
        { error: "Branch Sellers can only adjust stock for their assigned branch" },
        { status: 403 }
      );
    }

    let prevQty = 0;
    let newQty = 0;

    if (branchId) {
      // Branch Inventory Adjustment
      const branchItem = await db.query.branchInventory.findFirst({
        where: and(
          eq(branchInventory.branchId, branchId),
          eq(branchInventory.itemId, itemId)
        ),
      });

      if (!branchItem) {
        return NextResponse.json(
          { error: "Branch inventory item record not found" },
          { status: 404 }
        );
      }

      prevQty = branchItem.currentStock;
      newQty = Math.max(0, prevQty + adjustmentQty);

      await db
        .update(branchInventory)
        .set({
          currentStock: newQty,
          status: newQty <= 5 ? "LOW_STOCK" : "IN_STOCK",
          lastUpdated: new Date(),
        })
        .where(
          eq(branchInventory.branchInventoryId, branchItem.branchInventoryId)
        );
    } else {
      // Central Inventory Adjustment (IM or Admin)
      const centralItem = await db.query.inventoryItems.findFirst({
        where: eq(inventoryItems.itemId, itemId),
      });

      if (!centralItem) {
        return NextResponse.json(
          { error: "Central inventory item not found" },
          { status: 404 }
        );
      }

      prevQty = centralItem.centralStock;
      newQty = Math.max(0, prevQty + adjustmentQty);

      await db
        .update(inventoryItems)
        .set({
          centralStock: newQty,
          status: newQty <= 10 ? "LOW_STOCK" : "IN_STOCK",
          lastUpdated: new Date(),
        })
        .where(eq(inventoryItems.itemId, itemId));
    }

    // 1. Record stock adjustment audit
    const [adjustment] = await db
      .insert(stockAdjustments)
      .values({
        branchId,
        itemId,
        userId: currentUser.id,
        previousQuantity: prevQty,
        adjustmentQuantity: adjustmentQty,
        newQuantity: newQty,
        reason,
        createdAt: new Date(),
      })
      .returning();

    // 2. Record inventory movement audit
    await db.insert(inventoryMovements).values({
      itemId,
      branchId,
      movementType: "STOCK_ADJUSTMENT",
      quantity: adjustmentQty,
      previousBalance: prevQty,
      newBalance: newQty,
      userId: currentUser.id,
      referenceId: `ADJ-#${adjustment.adjustmentId}`,
      reason: `Stock Adjustment: ${reason}`,
    });

    return NextResponse.json({
      message: `Stock adjusted by ${adjustmentQty > 0 ? `+${adjustmentQty}` : adjustmentQty} (New balance: ${newQty})`,
      adjustment,
    });
  } catch (error) {
    console.error("Stock adjustment error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to adjust stock";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
