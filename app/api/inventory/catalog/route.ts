import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/app/db/schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";

// Returns master item catalog (name and unit only) for order basket selection
export async function GET() {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const catalog = await db
    .select({
      itemId: inventoryItems.itemId,
      itemName: inventoryItems.itemName,
      unit: inventoryItems.unit,
    })
    .from(inventoryItems)
    .orderBy(asc(inventoryItems.itemName));

  return NextResponse.json({ items: catalog });
}
