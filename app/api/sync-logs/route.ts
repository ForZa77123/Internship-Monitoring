import { NextRequest, NextResponse } from "next/server";
import { syncAILogs } from "@/lib/sync";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url") || undefined;

  try {
    const result = await syncAILogs(url);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: "Sync gagal", details: err.message }, { status: 502 });
  }
}
