import { db } from "../../../lib/db";
import { eq, sql } from "drizzle-orm";
import { sessionLog } from "../../db/schema";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const upgradeHeader = request.headers.get("Upgrade");
    if (!upgradeHeader || upgradeHeader.toLowerCase() !== "websocket") {
      return new Response("Expected Upgrade: websocket", { status: 426 });
    }

    // @ts-ignore - WebSocketPair is a Cloudflare Workers global
    const [client, server] = Object.values(new WebSocketPair());

    server.accept();

    // Send initial count
    const initialResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(sessionLog)
      .where(eq(sessionLog.shiftStatus, "ACTIVE"));
    const initialCount = Number(initialResult[0]?.count || 0);
    server.send(JSON.stringify({ type: "active_count", count: initialCount }));

    // Set up interval to push updates
    const intervalId = setInterval(async () => {
      try {
        const result = await db
          .select({ count: sql<number>`count(*)` })
          .from(sessionLog)
          .where(eq(sessionLog.shiftStatus, "ACTIVE"));
        const count = Number(result[0]?.count || 0);

        server.send(JSON.stringify({ type: "active_count", count }));
      } catch (err) {
        clearInterval(intervalId);
        try {
          server.close();
        } catch {}
      }
    }, 4000);

    server.addEventListener("close", () => {
      clearInterval(intervalId);
    });

    server.addEventListener("error", () => {
      clearInterval(intervalId);
    });

    return new Response(null, {
      status: 101,
      // @ts-ignore
      webSocket: client,
    });
  } catch (err: any) {
    return new Response(err.message || "Internal Server Error", { status: 500 });
  }
}
