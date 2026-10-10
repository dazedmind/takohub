import { db } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";
import { sessionLog, sales, branchInventory, inventoryUsageLog, inventoryItems, salesRemarks, salaryMatrix, expenses } from "../../../db/schema";
import { requireAuth } from "../../../../lib/auth-utils";
import { calculateTotalPlates, calculateTotalSales, calculateSalary, calculateShortOver, calculateNetSales, calculateSalaryFromMatrix } from "../../../../lib/business-logic";

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);

    // Find the active shift
    const activeShifts = await db
      .select()
      .from(sessionLog)
      .where(and(eq(sessionLog.userId, session.id), eq(sessionLog.shiftStatus, "ACTIVE")));

    if (activeShifts.length === 0) {
      return Response.json({ message: "No active shift found to end" }, { status: 400 });
    }

    const activeShift = activeShifts[0];
    const endTime = new Date();
    const startTime = new Date(activeShift.startShift);
    const durationMinutes = Math.max(1, Math.round((endTime.getTime() - startTime.getTime()) / (1000 * 60)));

    const body = await request.json();

    if (session.role === "BS") {
      // Branch Seller ending shift with Sales Log
      const cheese = parseInt(body.cheese || 0, 10);
      const octobits = parseInt(body.octobits || 0, 10);
      const crab = parseInt(body.crab || 0, 10);
      const cashOnhand = parseInt(body.cashOnhand || 0, 10);
      const expenses = parseInt(body.expenses || 0, 10);
      const gcashPayment = parseInt(body.gcashPayment || 0, 10);
      const free = parseInt(body.free || 0, 10);
      const trashLeftover = parseInt(body.trashLeftover || 0, 10);
      const remarksText = body.remarks || "";

      // Perform business logic calculations
      const totalPlates = calculateTotalPlates(cheese, octobits, crab);
      const totalSales = calculateTotalSales(totalPlates);
      
      const dbMatrix = await db.select().from(salaryMatrix);
      const salary = calculateSalaryFromMatrix(totalPlates, dbMatrix);
      const shortOver = parseInt(body.shortOver || 0, 10);

      const grossSales = totalSales;
      const netSales = calculateNetSales(grossSales, expenses, salary, free, shortOver, trashLeftover);

      // Create Sales Record
      const [salesRecord] = await db
        .insert(sales)
        .values({
          sessionId: activeShift.sessionId,
          userId: session.id,
          branchId: activeShift.branchId,
          cheese,
          octobits,
          crab,
          totalPlates,
          totalSales,
          cashOnhand,
          expenses,
          salary,
          gcashPayment,
          free,
          shortOver,
          trashLeftover,
          grossSales,
          netSales,
          remarks: remarksText.trim() || null,
          date: endTime,
        })
        .returning();

      // Log to expenses table if branch seller had expenses
      if (expenses > 0) {
        await db.insert(expenses).values({
          amount: expenses,
          category: "Store Operations",
          description: remarksText.trim() || `Branch Seller shift expense (Branch #${activeShift.branchId})`,
          branchId: activeShift.branchId,
          userId: session.id,
          sessionId: activeShift.sessionId,
          date: endTime,
          createdAt: endTime,
        });
      }

      // Automatically deduct branch inventory for Paper Plates (itemId 9) and Toothpicks (itemId 10)
      // Paper Plates: 1 pc per plate sold (including free plates)
      // Toothpicks: 1 box/pcs or similar. Let's deduct 1 pc of plates and 1 pc of toothpicks per plate sold.
      const platesUsed = totalPlates + free;
      
      const deductItems = [
        { itemId: 9, qty: platesUsed, remark: "Paper plates used for plates sold & free" },
        { itemId: 10, qty: platesUsed, remark: "Toothpicks used for plates sold & free" },
      ];

      for (const entry of deductItems) {
        if (entry.qty > 0) {
          const branchStock = await db
            .select()
            .from(branchInventory)
            .where(and(eq(branchInventory.branchId, activeShift.branchId), eq(branchInventory.itemId, entry.itemId)));

          if (branchStock.length > 0) {
            const currentRecord = branchStock[0];
            let newStock = currentRecord.currentStock - entry.qty;
            if (newStock < 0) newStock = 0;

            let status: "OUT_OF_STOCK" | "LOW_STOCK" | "IN_STOCK" = "OUT_OF_STOCK";
            if (newStock > 10) status = "IN_STOCK";
            else if (newStock > 0) status = "LOW_STOCK";

            // Update branch stock
            await db
              .update(branchInventory)
              .set({
                currentStock: newStock,
                status,
                lastUpdated: endTime,
              })
              .where(eq(branchInventory.branchInventoryId, currentRecord.branchInventoryId));

            // Log usage
            await db.insert(inventoryUsageLog).values({
              sessionId: activeShift.sessionId,
              branchId: activeShift.branchId,
              itemId: entry.itemId,
              quantityUsed: entry.qty,
              remarks: entry.remark,
              createdAt: endTime,
            });
          }
        }
      }

      // Update shift status
      await db
        .update(sessionLog)
        .set({
          shiftStatus: "COMPLETED",
          endShift: endTime,
          durationMinutes,
        })
        .where(eq(sessionLog.sessionId, activeShift.sessionId));

      return Response.json({ success: true, sales: salesRecord });
    } else {
      // Inventory Manager (IM) or ADMIN ending shift
      const notes = body.eodReport || body.notes || "No EOD report notes provided.";
      const expensesAmount = Math.max(0, parseInt(body.expenses || 0, 10));
      const expenseCategory = body.expenseCategory || "Inventory / Operations";
      const expenseDescription = (body.expenseNotes || body.expenseDescription || "").trim() || notes.trim();

      // For managers/admins, create a Sales record where remarks stores the EOD notes, and expenses are logged
      const [salesRecord] = await db
        .insert(sales)
        .values({
          sessionId: activeShift.sessionId,
          userId: session.id,
          branchId: activeShift.branchId,
          cheese: 0,
          octobits: 0,
          crab: 0,
          totalPlates: 0,
          totalSales: 0,
          cashOnhand: 0,
          expenses: expensesAmount,
          salary: 0,
          gcashPayment: 0,
          free: 0,
          shortOver: 0,
          trashLeftover: 0,
          grossSales: 0,
          netSales: -expensesAmount,
          remarks: notes.trim(),
          date: endTime,
        })
        .returning();

      // Log to expenses table if expenses were logged
      if (expensesAmount > 0) {
        await db.insert(expenses).values({
          amount: expensesAmount,
          category: expenseCategory,
          description: expenseDescription || `IM Shift Handover Expense: ${notes.trim()}`,
          branchId: activeShift.branchId,
          userId: session.id,
          sessionId: activeShift.sessionId,
          date: endTime,
          createdAt: endTime,
        });
      }

      // Update shift status
      await db
        .update(sessionLog)
        .set({
          shiftStatus: "COMPLETED",
          endShift: endTime,
          durationMinutes,
        })
        .where(eq(sessionLog.sessionId, activeShift.sessionId));

      return Response.json({ success: true, notes, sales: salesRecord });
    }
  } catch (error: any) {
    console.error("End shift API error:", error);
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
