import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { syncAILogs } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const session = await auth();
  const apiSecret = req.headers.get("X-API-Secret");
  const isValidSecret =
    !!apiSecret &&
    !!process.env.PRESENCE_API_SECRET &&
    apiSecret === process.env.PRESENCE_API_SECRET;

  if ((!session || session.user.role !== "ADMIN") && !isValidSecret) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await syncAILogs();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: "Sync gagal", details: message }, { status: 502 });
  }
}
