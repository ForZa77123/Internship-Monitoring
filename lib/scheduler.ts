import { syncAILogs } from "@/lib/sync";

let isSyncing = false;
let syncInterval: NodeJS.Timeout | null = null;

export async function startSyncScheduler() {
  if (syncInterval) return;

  const runSync = async () => {
    if (isSyncing) return;
    isSyncing = true;

    try {
      await syncAILogs();
    } catch (err) {
      console.error("[scheduler] sync error:", err);
    } finally {
      isSyncing = false;
    }
  };

  await runSync();
  syncInterval = setInterval(runSync, 60_000);
}

export function stopSyncScheduler() {
  if (!syncInterval) return;
  clearInterval(syncInterval);
  syncInterval = null;
}
