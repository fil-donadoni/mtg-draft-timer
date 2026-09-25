import { useCallback, useEffect, useRef, useState } from "react";
import {
    back,
    createEngine,
    pause,
    remainingMs,
    resume,
    skip,
    start,
    tick,
    type Cue,
    type EngineState,
    type Transition,
} from "@/lib/draft/engine";
import type { Step } from "@/lib/draft/schedule";

const TICK_MS = 200;

export interface DraftEngineHandle {
    state: EngineState;
    /** Remaining ms for the current step, refreshed every tick. */
    remaining: number;
    start(): void;
    pause(): void;
    resume(): void;
    skip(): void;
    back(): void;
}

/**
 * Drives the pure engine with the wall clock and hands every cue to
 * `onCue`. Ticks on a short interval and on tab visibility changes, so a
 * phone waking from sleep catches up immediately instead of at the next
 * interval.
 */
export function useDraftEngine(
    steps: readonly Step[],
    onCue: (cue: Cue) => void
): DraftEngineHandle {
    const [state, setState] = useState<EngineState>(() => createEngine(steps));
    const [remaining, setRemaining] = useState(() =>
        remainingMs(state, Date.now())
    );
    const stateRef = useRef(state);
    const onCueRef = useRef(onCue);
    useEffect(() => {
        onCueRef.current = onCue;
    }, [onCue]);

    const apply = useCallback((transition: Transition) => {
        stateRef.current = transition.state;
        setState(transition.state);
        setRemaining(remainingMs(transition.state, Date.now()));
        for (const cue of transition.cues) onCueRef.current(cue);
    }, []);

    const run = useCallback(
        (fn: (s: EngineState, now: number) => Transition) => () =>
            apply(fn(stateRef.current, Date.now())),
        [apply]
    );

    useEffect(() => {
        const step = () => apply(tick(stateRef.current, Date.now()));
        const id = window.setInterval(step, TICK_MS);
        const onVisible = () => {
            if (document.visibilityState === "visible") step();
        };
        document.addEventListener("visibilitychange", onVisible);
        return () => {
            window.clearInterval(id);
            document.removeEventListener("visibilitychange", onVisible);
        };
    }, [apply]);

    return {
        state,
        remaining,
        start: run(start),
        pause: run(pause),
        resume: run(resume),
        skip: run(skip),
        back: run(back),
    };
}
