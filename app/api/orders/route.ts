import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { orders, branches, sessionLog } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireAuth, isAuthError } from "@/lib/auth-utils";
import type { CreateOrderInput, OrderBasketItem, OrderWithDetails } from "@/lib/types";

export async function GET(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;
  const { searchParams } = new URL(request.url);

  const branchIdParam = searchParams.get("branchId");
  const statusParam = searchParams.get("status");

  try {
    const conditions = [];

    if (currentUser.role === "BS") {
      // Branch seller can see orders they placed or their branch
      conditions.push(eq(orders.orderedBy, currentUser.id));
    } else if (branchIdParam) {
      conditions.push(eq(orders.branchId, Number(branchIdParam)));
    }

    if (statusParam) {
      conditions.push(eq(orders.status, statusParam as any));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        orderId: orders.orderId,
        branchId: orders.branchId,
        branchName: branches.branchName,
        orderedBy: orders.orderedBy,
        orderedByName: userTable.name,
        status: orders.status,
        orderList: orders.orderList,
        notes: orders.notes,
        fulfilledBy: orders.fulfilledBy,
        createdOn: orders.createdOn,
        fulfilledOn: orders.fulfilledOn,
      })
      .from(orders)
      .innerJoin(branches, eq(orders.branchId, branches.branchId))
      .innerJoin(userTable, eq(orders.orderedBy, userTable.id))
      .where(whereClause)
      .orderBy(desc(orders.createdOn));

    const formattedOrders: OrderWithDetails[] = rows.map((row) => ({
      ...row,
      items: (row.orderList as OrderBasketItem[]) || [],
    }));

    return NextResponse.json({ orders: formattedOrders });
  } catch (error) {
    console.error("Orders list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (isAuthError(authResult)) return authResult;

  const currentUser = authResult.user;

  try {
    const body = (await request.json()) as CreateOrderInput;

    if (currentUser.role === "BS") {
      const activeShift = await db.query.sessionLog.findFirst({
        where: and(
          eq(sessionLog.userId, currentUser.id),
          eq(sessionLog.shiftStatus, "ACTIVE")
        ),
      });

      if (!activeShift) {
        return NextResponse.json(
          { error: "Start your shift to request branch supplies." },
          { status: 403 }
        );
      }

      body.branchId = activeShift.branchId;
    }

    if (!body.branchId) {
      return NextResponse.json(
        { error: "Branch ID is required to place an order" },
        { status: 400 }
      );
    }

    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: "Order basket cannot be empty" },
        { status: 400 }
      );
    }

    // Validate quantities
    for (const item of body.items) {
      if (!item.itemId || Number(item.quantity) <= 0) {
        return NextResponse.json(
          { error: `Invalid item or quantity for: ${item.itemName || "Item"}` },
          { status: 400 }
        );
      }
    }

    // Insert order as PENDING
    const [newOrder] = await db
      .insert(orders)
      .values({
        branchId: body.branchId,
        orderedBy: currentUser.id,
        status: "PENDING",
        orderList: body.items,
        notes: body.notes?.trim() || null,
        createdOn: new Date(),
      })
      .returning();

    return NextResponse.json(
      {
        message: "Order request submitted successfully (Pending review by Inventory Manager)",
        order: newOrder,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create order error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create order";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
