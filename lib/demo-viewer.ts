import { NextResponse } from "next/server";
import type { Session } from "next-auth";

export const DEMO_VIEWER_ADMIN_EMAIL = "viewer.admin@bigbox.com";
export const DEMO_VIEWER_INTERN_EMAIL = "viewer.intern@bigbox.com";
export const DEMO_VIEWER_PASSWORD = "viewer-readonly-demo";
export const DEMO_VIEWER_ADMIN_ID = "demo-viewer-admin";

export function isDemoViewerSession(session: Session | null | undefined): boolean {
  return Boolean(session?.user?.isDemoViewer);
}

export function demoViewerBlockedResponse() {
  return NextResponse.json(
    {
      error:
        "Mode Viewer (Read-Only): Anda hanya dapat melihat tampilan sistem dan tidak dapat mengubah atau menghapus data.",
    },
    { status: 403 }
  );
}
