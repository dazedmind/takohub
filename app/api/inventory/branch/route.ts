import { db } from "../../../../lib/db";
import { eq, and } from "drizzle-orm";
import { branchInventory, inventoryItems, sessionLog, branches } from "../../../db/schema";
import { requireRole } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await requireRole(request, "ADMIN", "IM", "BS");
    
    // Parse URL params
    const { searchParams } = new URL(request.url);
    const branchIdStr = searchParams.get("branchId");

    const activeShifts = await db
      .select()
      .from(sessionLog)
      .where(and(eq(sessionLog.userId, session.id), eq(sessionLog.shiftStatus, "ACTIVE")));
    
    const hasActiveShift = activeShifts.length > 0;

    let branchId: number;
    if (!branchIdStr) {
      if (!hasActiveShift) {
        return Response.json({ hasActiveShift: false, branchItems: [] });
      }
      branchId = activeShifts[0].branchId;
    } else {
      branchId = parseInt(branchIdStr, 10);
      if (isNaN(branchId)) {
        return Response.json({ message: "Invalid branchId" }, { status: 400 });
      }
    }

    const branchInfo = await db
      .select({ branchName: branches.branchName })
      .from(branches)
      .where(eq(branches.branchId, branchId));
    const branchName = branchInfo[0]?.branchName || "";

    // Retrieve inventories joined with inventory item names/units
    const records = await db
      .select({
        branchInventoryId: branchInventory.branchInventoryId,
        branchId: branchInventory.branchId,
        itemId: branchInventory.itemId,
        itemName: inventoryItems.itemName,
        unit: inventoryItems.unit,
        currentStock: branchInventory.currentStock,
        status: branchInventory.status,
        lastUpdated: branchInventory.lastUpdated,
      })
      .from(branchInventory)
      .innerJoin(inventoryItems, eq(branchInventory.itemId, inventoryItems.itemId))
      .where(eq(branchInventory.branchId, branchId))
      .orderBy(inventoryItems.itemId);

    return Response.json({
      hasActiveShift: branchIdStr ? true : hasActiveShift,
      branchId,
      branchName,
      branchItems: records,
    });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
