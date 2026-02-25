import { WifiOff, RefreshCw, CloudOff, Check } from "lucide-react";
import { useOfflineSync } from "@/hooks/use-offline-sync";
import { useToast } from "@/hooks/use-toast";
import { AnimatePresence, motion } from "framer-motion";

/**
 * Offline indicator banner — shows when the device is offline
 * and displays the number of pending requests queued for sync.
 * Automatically syncs when back online.
 */
export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, triggerSync } = useOfflineSync();
  const { toast } = useToast();

  const handleManualSync = async () => {
    const synced = await triggerSync();
    if (synced > 0) {
      toast({ title: `Synced ${synced} pending item${synced > 1 ? "s" : ""}` });
    } else {
      toast({ title: "Nothing to sync", variant: "default" });
    }
  };

  // Nothing to show when online and no pending items
  if (isOnline && pendingCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ height: 0, opacity: 0 }}
        animate={{ height: "auto", opacity: 1 }}
        exit={{ height: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className={`px-4 py-2 text-sm font-medium flex items-center justify-between gap-2 ${
          isOnline
            ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
            : "bg-red-500/10 text-red-700 dark:text-red-400"
        }`}
      >
        <div className="flex items-center gap-2">
          {isOnline ? (
            <CloudOff className="h-4 w-4" />
          ) : (
            <WifiOff className="h-4 w-4" />
          )}
          <span>
            {!isOnline
              ? "You're offline — changes will sync when reconnected"
              : `${pendingCount} pending item${pendingCount > 1 ? "s" : ""} to sync`}
          </span>
        </div>

        {isOnline && pendingCount > 0 && (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="h-3 w-3 animate-spin" />
                Syncing…
              </>
            ) : (
              <>
                <Check className="h-3 w-3" />
                Sync now
              </>
            )}
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  );
}

