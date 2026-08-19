import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { branchInventory, inventoryItems, branches, sessionLog } from "@/app/db/schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { searchParams } = new URL(request.url);

  try {
    // 1. If user is Branch Seller (BS)
    if (currentUser.role === "BS") {
      // Must have an ACTIVE shift to access branch inventory
      const activeShift = await db.query.sessionLog.findFirst({
        where: and(
          eq(sessionLog.userId, currentUser.id),
          eq(sessionLog.shiftStatus, "ACTIVE")
        ),
      });

      if (!activeShift) {
        return NextResponse.json(
          {
            error: "Start your shift to access branch inventory.",
            hasActiveShift: false,
            branchItems: [],
          },
          { status: 403 }
        );
      }

      // Strictly force branchId from the active shift (ignore query params)
      const authorizedBranchId = activeShift.branchId;

      const rows = await db
        .select({
          branchInventoryId: branchInventory.branchInventoryId,
          branchId: branchInventory.branchId,
          branchName: branches.branchName,
          itemId: branchInventory.itemId,
          itemName: inventoryItems.itemName,
          unit: inventoryItems.unit,
          currentStock: branchInventory.currentStock,
          status: branchInventory.status,
          lastUpdated: branchInventory.lastUpdated,
        })
        .from(branchInventory)
        .innerJoin(branches, eq(branchInventory.branchId, branches.branchId))
        .innerJoin(
          inventoryItems,
          eq(branchInventory.itemId, inventoryItems.itemId)
        )
        .where(eq(branchInventory.branchId, authorizedBranchId))
        .orderBy(inventoryItems.itemName);

      const branchName = rows[0]?.branchName || `Branch ${authorizedBranchId}`;

      return NextResponse.json({
        hasActiveShift: true,
        branchId: authorizedBranchId,
        branchName,
        branchItems: rows,
      });
    }

    // 2. If user is Admin or Inventory Manager (IM)
    const branchIdParam = searchParams.get("branchId");

    if (!branchIdParam) {
      // Return all branch inventory
      const allRows = await db
        .select({
          branchInventoryId: branchInventory.branchInventoryId,
          branchId: branchInventory.branchId,
          branchName: branches.branchName,
          itemId: branchInventory.itemId,
          itemName: inventoryItems.itemName,
          unit: inventoryItems.unit,
          currentStock: branchInventory.currentStock,
          status: branchInventory.status,
          lastUpdated: branchInventory.lastUpdated,
        })
        .from(branchInventory)
        .innerJoin(branches, eq(branchInventory.branchId, branches.branchId))
        .innerJoin(
          inventoryItems,
          eq(branchInventory.itemId, inventoryItems.itemId)
        )
        .orderBy(branches.branchName, inventoryItems.itemName);

      return NextResponse.json({
        hasActiveShift: true,
        branchItems: allRows,
      });
    }

    const branchId = Number(branchIdParam);

    const rows = await db
      .select({
        branchInventoryId: branchInventory.branchInventoryId,
        branchId: branchInventory.branchId,
        branchName: branches.branchName,
        itemId: branchInventory.itemId,
        itemName: inventoryItems.itemName,
        unit: inventoryItems.unit,
        currentStock: branchInventory.currentStock,
        status: branchInventory.status,
        lastUpdated: branchInventory.lastUpdated,
      })
      .from(branchInventory)
      .innerJoin(branches, eq(branchInventory.branchId, branches.branchId))
      .innerJoin(
        inventoryItems,
        eq(branchInventory.itemId, inventoryItems.itemId)
      )
      .where(eq(branchInventory.branchId, branchId))
      .orderBy(inventoryItems.itemName);

    const branchName = rows[0]?.branchName;

    return NextResponse.json({
      hasActiveShift: true,
      branchId,
      branchName,
      branchItems: rows,
    });
  } catch (error) {
    console.error("Branch inventory error:", error);
    return NextResponse.json(
      { error: "Failed to fetch branch inventory" },
      { status: 500 }
    );
  }
}
