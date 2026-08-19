import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryMovements, inventoryItems, branches } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireRole, isAuthError } from "@/lib/auth-utils";

export async function GET() {
  // Admin and Inventory Manager can review movements audit trail
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  try {
    const rows = await db
      .select({
        movementId: inventoryMovements.movementId,
        itemId: inventoryMovements.itemId,
        itemName: inventoryItems.itemName,
        unit: inventoryItems.unit,
        branchId: inventoryMovements.branchId,
        branchName: branches.branchName,
        movementType: inventoryMovements.movementType,
        quantity: inventoryMovements.quantity,
        previousBalance: inventoryMovements.previousBalance,
        newBalance: inventoryMovements.newBalance,
        userId: inventoryMovements.userId,
        userName: userTable.name,
        referenceId: inventoryMovements.referenceId,
        reason: inventoryMovements.reason,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(
        inventoryItems,
        eq(inventoryMovements.itemId, inventoryItems.itemId)
      )
      .leftJoin(branches, eq(inventoryMovements.branchId, branches.branchId))
      .leftJoin(userTable, eq(inventoryMovements.userId, userTable.id))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(100);

    return NextResponse.json({ movements: rows });
  } catch (error) {
    console.error("Inventory movements error:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory movements" },
      { status: 500 }
    );
  }
}
