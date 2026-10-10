import { db } from "@/lib/db";
import { and, desc, eq, gte, ilike, isNull, lte, or, sql } from "drizzle-orm";
import { expenses, branches } from "@/app/db/schema";
import { user as userTable } from "@/app/db/auth-schema";
import { requireRole } from "@/lib/auth-utils";

export async function GET(request: Request) {
  try {
    await requireRole(request, "ADMIN");

    const { searchParams } = new URL(request.url);
    const branchIdParam = searchParams.get("branchId");
    const categoryParam = searchParams.get("category");
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");
    const searchParam = searchParams.get("search");

    const conditions = [];

    if (branchIdParam) {
      if (branchIdParam === "central" || branchIdParam === "null") {
        conditions.push(isNull(expenses.branchId));
      } else {
        conditions.push(eq(expenses.branchId, Number(branchIdParam)));
      }
    }

    if (categoryParam && categoryParam !== "ALL") {
      conditions.push(eq(expenses.category, categoryParam));
    }

    if (startDateParam) {
      const start = new Date(startDateParam);
      start.setHours(0, 0, 0, 0);
      conditions.push(gte(expenses.date, start));
    }

    if (endDateParam) {
      const end = new Date(endDateParam);
      end.setHours(23, 59, 59, 999);
      conditions.push(lte(expenses.date, end));
    }

    if (searchParam && searchParam.trim()) {
      const query = `%${searchParam.trim()}%`;
      conditions.push(
        or(
          ilike(expenses.description, query),
          ilike(expenses.category, query),
          ilike(userTable.name, query)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        expenseId: expenses.expenseId,
        amount: expenses.amount,
        category: expenses.category,
        description: expenses.description,
        branchId: expenses.branchId,
        branchName: branches.branchName,
        userId: expenses.userId,
        userName: userTable.name,
        userRole: userTable.role,
        sessionId: expenses.sessionId,
        date: expenses.date,
        createdAt: expenses.createdAt,
      })
      .from(expenses)
      .innerJoin(userTable, eq(expenses.userId, userTable.id))
      .leftJoin(branches, eq(expenses.branchId, branches.branchId))
      .where(whereClause)
      .orderBy(desc(expenses.date), desc(expenses.createdAt));

    // Summary calculations
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const monthStart = new Date(todayStart.getFullYear(), todayStart.getMonth(), 1);

    const totalExpenses = rows.reduce((sum, r) => sum + (r.amount || 0), 0);
    const todayExpenses = rows
      .filter((r) => new Date(r.date) >= todayStart)
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const monthExpenses = rows
      .filter((r) => new Date(r.date) >= monthStart)
      .reduce((sum, r) => sum + (r.amount || 0), 0);

    return Response.json({
      expenses: rows,
      summary: {
        totalExpenses,
        todayExpenses,
        monthExpenses,
        recordCount: rows.length,
      },
    });
  } catch (error: any) {
    console.error("GET /api/expenses error:", error);
    return Response.json(
      { message: error.message || "Forbidden" },
      { status: error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const currentUser = await requireRole(request, "ADMIN");
    const body = await request.json();

    const amount = Number(body.amount);
    if (!amount || isNaN(amount) || amount <= 0) {
      return Response.json({ error: "A valid positive amount is required" }, { status: 400 });
    }

    const category = body.category ? String(body.category).trim() : "";
    if (!category) {
      return Response.json({ error: "Expense category is required" }, { status: 400 });
    }

    const description = body.description ? String(body.description).trim() : null;
    const branchId = body.branchId ? Number(body.branchId) : null;
    const date = body.date ? new Date(body.date) : new Date();

    const [newExpense] = await db
      .insert(expenses)
      .values({
        amount: Math.round(amount),
        category,
        description,
        branchId,
        userId: currentUser.id,
        date,
      })
      .returning();

    return Response.json(newExpense, { status: 201 });
  } catch (error: any) {
    console.error("POST /api/expenses error:", error);
    return Response.json(
      { error: error.message || "Forbidden" },
      { status: error.message === "Unauthorized" ? 401 : 403 }
    );
  }
}
