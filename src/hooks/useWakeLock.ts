import { useEffect } from "react";

/**
 * Keeps the screen on while `active` (Screen Wake Lock API). The lock is
 * released by the OS whenever the tab is hidden, so it is re-acquired on
 * every return to the foreground. Silently no-ops where unsupported.
 */
export function useWakeLock(active: boolean): void {
    useEffect(() => {
        if (!active || !("wakeLock" in navigator)) return;
        let sentinel: WakeLockSentinel | null = null;
        let disposed = false;

        const acquire = async () => {
            try {
                sentinel = await navigator.wakeLock.request("screen");
                if (disposed) await sentinel.release();
            } catch {
                // Low battery, or not allowed: nothing to do.
            }
        };
        const onVisible = () => {
            if (document.visibilityState === "visible") void acquire();
        };

        void acquire();
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            disposed = true;
            document.removeEventListener("visibilitychange", onVisible);
            void sentinel?.release();
        };
    }, [active]);
}
