import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/crypto";

export const runtime = "nodejs";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("auth_session")?.value;
    
    if (!token) {
      return NextResponse.json({ session: null });
    }
    
    const user = await verifySessionToken(token);
    
    if (!user) {
      return NextResponse.json({ session: null });
    }
    
    return NextResponse.json({ session: { user } });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
