import { db } from "../../../../lib/db";
import { eq } from "drizzle-orm";
import { branchInventory, inventoryItems } from "../../../db/schema";
import { requireRole } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN", "IM", "BS");
    
    // Parse URL params
    const { searchParams } = new URL(request.url);
    const branchIdStr = searchParams.get("branchId");

    if (!branchIdStr) {
      return Response.json({ message: "branchId parameter is required" }, { status: 400 });
    }

    const branchId = parseInt(branchIdStr, 10);
    if (isNaN(branchId)) {
      return Response.json({ message: "Invalid branchId" }, { status: 400 });
    }

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

    return Response.json(records);
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
