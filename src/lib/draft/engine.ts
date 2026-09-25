import type { Step } from "./schedule";

/**
 * Pure timer engine. All transitions take an explicit `now` (ms) so the
 * behaviour is deterministic under test and drift-free at runtime: the
 * remaining time is always `duration - (now - startedAt)`, never a counter
 * decremented per tick.
 */

export type EngineStatus = "idle" | "running" | "paused" | "finished";

export interface EngineState {
    steps: readonly Step[];
    index: number;
    status: EngineStatus;
    /** Wall-clock ms at which the current step (re)started; null unless running. */
    startedAt: number | null;
    /** Remaining ms captured on pause; null unless paused. */
    pausedRemainingMs: number | null;
    /**
     * Whole seconds remaining the last time we ticked, used to detect the
     * countdown crossing a cue threshold (10 s warning, 3-2-1 beeps) even
     * when ticks arrive late or several seconds apart.
     */
    lastWholeSeconds: number;
}

export type Cue =
    | { type: "announce"; step: Step }
    | { type: "warning" }
    | { type: "countdown"; seconds: number }
    | { type: "milestone"; seconds: number }
    | { type: "finished" };

export interface Transition {
    state: EngineState;
    cues: Cue[];
}

/** Seconds remaining at which the "ten seconds" call is spoken. */
export const WARNING_SECONDS = 10;
/** Seconds at which a short beep sounds. */
export const COUNTDOWN_SECONDS: readonly number[] = [3, 2, 1];

/** Steps shorter than this get no 10-second call (it would be immediate). */
const MIN_DURATION_FOR_WARNING = WARNING_SECONDS + 3;

/** The 10-second call is for the clocks players are racing: picks, reviews, building. */
export function hasWarning(step: Step): boolean {
    return (
        (step.kind === "look" ||
            step.kind === "review" ||
            step.kind === "build") &&
        step.duration >= MIN_DURATION_FOR_WARNING
    );
}

/** Minute calls on the long construction clock (seconds remaining). */
export function milestones(step: Step): readonly number[] {
    if (step.kind !== "build") return [];
    return [600, 300, 60].filter((s) => s < step.duration);
}

/** The 3-2-1 beeps lead into "draft", so only the pick clock gets them. */
export function hasCountdown(step: Step): boolean {
    return step.kind === "look";
}

export function createEngine(steps: readonly Step[]): EngineState {
    if (steps.length === 0) throw new RangeError("schedule is empty");
    return {
        steps,
        index: 0,
        status: "idle",
        startedAt: null,
        pausedRemainingMs: null,
        lastWholeSeconds: steps[0].duration,
    };
}

export function currentStep(state: EngineState): Step {
    return state.steps[state.index];
}

export function nextStep(state: EngineState): Step | null {
    return state.steps[state.index + 1] ?? null;
}

export function remainingMs(state: EngineState, now: number): number {
    const step = currentStep(state);
    switch (state.status) {
        case "running":
            return Math.max(0, step.duration * 1000 - (now - state.startedAt!));
        case "paused":
            return state.pausedRemainingMs!;
        case "idle":
            return step.duration * 1000;
        case "finished":
            return 0;
    }
}

function enterStep(state: EngineState, index: number, now: number): Transition {
    const step = state.steps[index];
    if (step.kind === "done") {
        return {
            state: {
                ...state,
                index,
                status: "finished",
                startedAt: null,
                pausedRemainingMs: null,
                lastWholeSeconds: 0,
            },
            cues: [{ type: "announce", step }, { type: "finished" }],
        };
    }
    return {
        state: {
            ...state,
            index,
            status: "running",
            startedAt: now,
            pausedRemainingMs: null,
            lastWholeSeconds: step.duration,
        },
        cues: [{ type: "announce", step }],
    };
}

export function start(state: EngineState, now: number): Transition {
    if (state.status !== "idle") return { state, cues: [] };
    return enterStep(state, state.index, now);
}

export function pause(state: EngineState, now: number): Transition {
    if (state.status !== "running") return { state, cues: [] };
    return {
        state: {
            ...state,
            status: "paused",
            pausedRemainingMs: remainingMs(state, now),
            startedAt: null,
        },
        cues: [],
    };
}

export function resume(state: EngineState, now: number): Transition {
    if (state.status !== "paused") return { state, cues: [] };
    const step = currentStep(state);
    return {
        state: {
            ...state,
            status: "running",
            startedAt: now - (step.duration * 1000 - state.pausedRemainingMs!),
            pausedRemainingMs: null,
        },
        cues: [],
    };
}

/** Jump straight to the next step, announcing it. */
export function skip(state: EngineState, now: number): Transition {
    if (state.status === "finished" || state.status === "idle") {
        return { state, cues: [] };
    }
    return enterStep(state, state.index + 1, now);
}

/** Restart the current step, or go back one step if it just began. */
export function back(state: EngineState, now: number): Transition {
    if (state.status === "idle") return { state, cues: [] };
    const step = currentStep(state);
    const elapsedMs =
        state.status === "finished"
            ? Infinity
            : step.duration * 1000 - remainingMs(state, now);
    const target =
        elapsedMs < 2000 && state.index > 0 ? state.index - 1 : state.index;
    return enterStep(state, target, now);
}

/**
 * Advance the clock. Emits the cues whose thresholds were crossed since the
 * last tick and rolls over into following steps when time is up — possibly
 * several at once if the tab was asleep, in which case only the step we
 * actually land on is announced.
 */
export function tick(state: EngineState, now: number): Transition {
    if (state.status !== "running") return { state, cues: [] };

    const step = currentStep(state);
    const remaining = remainingMs(state, now);
    const cues: Cue[] = [];

    if (remaining <= 0) {
        let overflow = now - state.startedAt! - step.duration * 1000;
        let index = state.index + 1;
        // Consume the whole steps that already elapsed while we were away.
        while (
            state.steps[index].kind !== "done" &&
            overflow >= state.steps[index].duration * 1000
        ) {
            overflow -= state.steps[index].duration * 1000;
            index++;
        }
        return enterStep(state, index, now - overflow);
    }

    const whole = Math.ceil(remaining / 1000);
    if (whole < state.lastWholeSeconds) {
        for (let s = state.lastWholeSeconds - 1; s >= whole; s--) {
            if (s === WARNING_SECONDS && hasWarning(step)) {
                cues.push({ type: "warning" });
            }
            if (COUNTDOWN_SECONDS.includes(s) && hasCountdown(step)) {
                cues.push({ type: "countdown", seconds: s });
            }
            if (milestones(step).includes(s)) {
                cues.push({ type: "milestone", seconds: s });
            }
        }
        return { state: { ...state, lastWholeSeconds: whole }, cues };
    }

    return { state, cues };
}
