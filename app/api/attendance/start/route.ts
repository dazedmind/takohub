import { db } from "../../../../lib/db";
import { and, eq } from "drizzle-orm";
import { sessionLog } from "../../../db/schema";
import { requireAuth } from "../../../../lib/auth-utils";

export async function POST(request: Request) {
  try {
    const session = await requireAuth(request);
    const { branchId, selfieUrl, selfieDataUrl } = await request.json();
    const targetSelfie = selfieUrl || selfieDataUrl;

    if (!branchId || !targetSelfie) {
      return Response.json({ message: "Branch ID and selfie photo are required to start a shift" }, { status: 400 });
    }

    // Check if there is already an active shift for this user
    const existing = await db
      .select()
      .from(sessionLog)
      .where(and(eq(sessionLog.userId, session.id), eq(sessionLog.shiftStatus, "ACTIVE")));

    if (existing.length > 0) {
      return Response.json({ message: "You already have an active shift" }, { status: 400 });
    }

    const [newShift] = await db
      .insert(sessionLog)
      .values({
        userId: session.id,
        branchId: parseInt(branchId, 10),
        shiftStatus: "ACTIVE",
        selfieUrl: targetSelfie,
      })
      .returning();

    return Response.json({ success: true, activeShift: newShift });
  } catch (error: any) {
    return Response.json({ message: error.message || "Unauthorized" }, { status: 401 });
  }
}
