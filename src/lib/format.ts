/** "1:30" for 90 s, "45" for 45 s. Rounds up so 0.2 s still shows "1". */
export function formatClock(ms: number): string {
    const seconds = Math.max(0, Math.ceil(ms / 1000));
    if (seconds < 60) return String(seconds);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
}

/** "42 min" / "1 h 05 min" for a schedule length. */
export function formatDuration(totalSeconds: number): string {
    const minutes = Math.round(totalSeconds / 60);
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} h ${String(m).padStart(2, "0")} min`;
}
