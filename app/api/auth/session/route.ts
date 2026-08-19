import { getSession } from "../../../../lib/auth-utils";

export async function GET(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return Response.json({ user: null, session: null }, { status: 200 });
    }
    return Response.json({ user: session, session: { user: session } }, { status: 200 });
  } catch (error: any) {
    return Response.json({ message: error.message || "Internal server error" }, { status: 500 });
  }
}
