import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/app/db/schema";
import { isAuthError, requireRole } from "@/lib/auth-utils";
import type { UpdateInventoryInput, StockStatus } from "@/lib/types";

const LOW_STOCK_THRESHOLD = 10;

function deriveStatus(stock: number, status?: StockStatus): StockStatus {
  if (status) return status;
  return stock <= LOW_STOCK_THRESHOLD ? "LOW_STOCK" : "IN_STOCK";
}

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN", "IM", "BS");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const itemId = Number(id);

  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const [item] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.itemId, itemId));

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PATCH(request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const itemId = Number(id);

  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const body = (await request.json()) as UpdateInventoryInput;

  const [existing] = await db
    .select()
    .from(inventoryItems)
    .where(eq(inventoryItems.itemId, itemId));

  if (!existing) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const centralStock = body.centralStock ?? existing.centralStock ?? 0;
  const status = deriveStatus(centralStock, body.status ?? existing.status ?? undefined);

  const [item] = await db
    .update(inventoryItems)
    .set({
      ...(body.itemName !== undefined && { itemName: body.itemName.trim() }),
      ...(body.unit !== undefined && { unit: body.unit.trim() || null }),
      ...(body.centralStock !== undefined && { centralStock: body.centralStock }),
      ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl.trim() || null }),
      status,
      lastUpdated: new Date(),
    })
    .where(eq(inventoryItems.itemId, itemId))
    .returning();

  return NextResponse.json({ item });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const { id } = await context.params;
  const itemId = Number(id);

  if (Number.isNaN(itemId)) {
    return NextResponse.json({ error: "Invalid item ID" }, { status: 400 });
  }

  const [deleted] = await db
    .delete(inventoryItems)
    .where(eq(inventoryItems.itemId, itemId))
    .returning();

  if (!deleted) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
