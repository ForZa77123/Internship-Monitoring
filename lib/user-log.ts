import { prisma } from "@/lib/prisma";

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
