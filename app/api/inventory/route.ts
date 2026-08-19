import { NextResponse } from "next/server";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { inventoryItems } from "@/app/db/schema";
import { isAuthError, requireRole } from "@/lib/auth-utils";
import type { CreateInventoryInput, StockStatus } from "@/lib/types";

const LOW_STOCK_THRESHOLD = 10;

function deriveStatus(stock: number, status?: StockStatus): StockStatus {
  if (status) return status;
  return stock <= LOW_STOCK_THRESHOLD ? "LOW_STOCK" : "IN_STOCK";
}

export async function GET() {
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const items = await db
    .select()
    .from(inventoryItems)
    .orderBy(asc(inventoryItems.itemId));

  // Compute stats in memory (0ms) instead of executing a second database round-trip
  const stats = {
    totalItems: items.length,
    lowStock: items.filter((i) => i.status === "LOW_STOCK").length,
    inStock: items.filter((i) => i.status === "IN_STOCK").length,
  };

  return NextResponse.json({ items, stats });
}

export async function POST(request: Request) {
  const authResult = await requireRole("ADMIN", "IM");
  if (isAuthError(authResult)) return authResult;

  const body = (await request.json()) as CreateInventoryInput;

  if (!body.itemName?.trim()) {
    return NextResponse.json({ error: "Item name is required" }, { status: 400 });
  }

  const centralStock = body.centralStock ?? 0;
  const status = deriveStatus(centralStock, body.status);

  const [item] = await db
    .insert(inventoryItems)
    .values({
      itemName: body.itemName.trim(),
      unit: body.unit?.trim() || null,
      centralStock,
      status,
      photoUrl: body.photoUrl?.trim() || null,
      lastUpdated: new Date(),
    })
    .returning();

  return NextResponse.json({ item }, { status: 201 });
}
