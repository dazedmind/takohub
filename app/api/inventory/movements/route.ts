import { db } from "../../../../lib/db";
import { eq, desc } from "drizzle-orm";
import { inventoryMovements, inventoryItems, branches } from "../../../db/schema";
import { user } from "../../../db/auth-schema";
import { requireRole } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN", "IM");

    // Fetch movements joined with items and user details
    const movements = await db
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
        userName: user.name,
        referenceId: inventoryMovements.referenceId,
        reason: inventoryMovements.reason,
        createdAt: inventoryMovements.createdAt,
      })
      .from(inventoryMovements)
      .innerJoin(inventoryItems, eq(inventoryMovements.itemId, inventoryItems.itemId))
      .leftJoin(branches, eq(inventoryMovements.branchId, branches.branchId))
      .innerJoin(user, eq(inventoryMovements.userId, user.id))
      .orderBy(desc(inventoryMovements.createdAt))
      .limit(100);

    return Response.json(movements);
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
