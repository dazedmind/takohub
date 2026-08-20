import { db } from "../../../lib/db";
import { eq } from "drizzle-orm";
import { branches, branchInventory, inventoryItems, sessionLog } from "../../db/schema";
import { requireRole } from "../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    // Anyone who is authenticated can see branches
    await requireRole(request, "ADMIN", "BS", "IM");
    
    const activeShiftsResult = await db
      .select({ branchId: sessionLog.branchId })
      .from(sessionLog)
      .where(eq(sessionLog.shiftStatus, "ACTIVE"));
    const activeBranchIds = new Set(activeShiftsResult.map(s => s.branchId));

    const allBranches = await db.select().from(branches);
    const result = allBranches.map(b => ({
      ...b,
      hasActiveShift: activeBranchIds.has(b.branchId)
    }));

    return Response.json(result);
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: error.message === "Unauthorized" ? 401 : 403 });
  }
}

export async function POST(request: Request) {
  try {
    await requireRole(request, "ADMIN");
    const { branchName, address } = await request.json();

    if (!branchName) {
      return Response.json({ message: "Branch name is required" }, { status: 400 });
    }

    const [newBranch] = await db
      .insert(branches)
      .values({ branchName, address })
      .returning();

    // Map all existing master inventory items to this new branch with stock 0
    const allItems = await db.select().from(inventoryItems);
    for (const item of allItems) {
      await db.insert(branchInventory).values({
        branchId: newBranch.branchId,
        itemId: item.itemId,
        currentStock: 0,
        status: "OUT_OF_STOCK"
      }).onConflictDoNothing();
    }

    return Response.json(newBranch, { status: 201 });
  } catch (error: any) {
    return Response.json({ message: error.message || "Forbidden" }, { status: 403 });
  }
}
