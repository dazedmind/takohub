import { db } from "../../../lib/db";
import { eq, desc } from "drizzle-orm";
import { orders, branches } from "../../db/schema";
import { user } from "../../db/auth-schema";
import { requireAuth } from "../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await requireAuth(request);

    // Join orders with branch and user details
    let query = db
      .select({
        orderId: orders.orderId,
        branchId: orders.branchId,
        branchName: branches.branchName,
        orderedBy: orders.orderedBy,
        orderedByName: user.name,
        status: orders.status,
        orderList: orders.orderList,
        notes: orders.notes,
        fulfilledBy: orders.fulfilledBy,
        createdOn: orders.createdOn,
        fulfilledOn: orders.fulfilledOn,
      })
      .from(orders)
      .innerJoin(branches, eq(orders.branchId, branches.branchId))
      .innerJoin(user, eq(orders.orderedBy, user.id))
      .orderBy(desc(orders.createdOn));

    let results;
    if (session.role === "BS") {
      // Find the user's active shift branch, or let them filter by their own branch
      // For simplicity, find branches they are related to or filter by their own order
      results = await query.where(eq(orders.orderedBy, session.id));
    } else {
      results = await query;
    }

    return Response.json(results);
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    const { branchId, orderList, notes } = await request.json();

    if (!branchId || !orderList || !Array.isArray(orderList) || orderList.length === 0) {
      return Response.json({ message: "Branch ID and order list are required" }, { status: 400 });
    }

    const [newOrder] = await db
      .insert(orders)
      .values({
        branchId: parseInt(branchId, 10),
        orderedBy: session.id,
        status: "PENDING",
        orderList,
        notes: notes || "",
      })
      .returning();

    return Response.json(newOrder, { status: 201 });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
