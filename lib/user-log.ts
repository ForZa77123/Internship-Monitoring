import { prisma } from "@/lib/prisma";
import { DEMO_VIEWER_ADMIN_ID } from "@/lib/demo-viewer";

export type UserLogAction =
  | "LOGIN"
  | "CREATE_LOGSHEET"
  | "UPDATE_LOGSHEET"
  | "DELETE_LOGSHEET"
  | "VALIDATE_LOGSHEET"
  | "UPDATE_PROFILE"
  | "MANAGE_INTERN"
  | "EXPORT_REPORT";

export async function recordUserLog(params: {
  userId: string;
  action: UserLogAction | string;
  description: string;
}) {
  if (params.userId === DEMO_VIEWER_ADMIN_ID) {
    return;
  }
  try {
    await prisma.userLog.create({
      data: {
        userId: params.userId,
        action: params.action,
        description: params.description,
      },
    });
  } catch (err) {
    console.error("[user-log] Failed to record user log:", err);
  }
}
