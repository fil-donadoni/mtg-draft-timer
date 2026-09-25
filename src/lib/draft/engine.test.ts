import { describe, expect, it } from "vitest";
import {
    back,
    createEngine,
    currentStep,
    pause,
    remainingMs,
    resume,
    skip,
    start,
    tick,
    type Cue,
    type EngineState,
} from "./engine";
import type { Step } from "./schedule";

const at = { pack: 1, pick: 1, cardsRemaining: 14, direction: "left" } as const;

const steps: Step[] = [
    {
        kind: "open",
        pack: 1,
        cardsRemaining: 14,
        direction: "left",
        duration: 20,
    },
    { kind: "look", ...at, duration: 40 },
    { kind: "draft", ...at, duration: 5 },
    { kind: "check", ...at, pick: 2, cardsRemaining: 2, duration: 4 },
    { kind: "look", ...at, pick: 2, cardsRemaining: 2, duration: 5 },
    { kind: "draft", ...at, pick: 2, cardsRemaining: 2, duration: 5 },
    { kind: "last-pick", pack: 1, pick: 3, duration: 4 },
    { kind: "review", pack: 1, duration: 60 },
    { kind: "build", pack: 1, duration: 25 * 60 },
    { kind: "done", pack: 1, duration: 0, afterBuild: true },
];

const T0 = 1_000_000;

/** Run ticks every `stepMs` up to `until`, collecting cues. */
function run(
    state: EngineState,
    from: number,
    until: number,
    stepMs = 250
): { state: EngineState; cues: Cue[] } {
    const cues: Cue[] = [];
    for (let t = from; t <= until; t += stepMs) {
        const r = tick(state, t);
        state = r.state;
        cues.push(...r.cues);
    }
    return { state, cues };
}

/** Start and skip forward to step `index`. */
function at_(index: number): EngineState {
    let s = start(createEngine(steps), T0).state;
    for (let i = 0; i < index; i++) s = skip(s, T0).state;
    return s;
}

describe("engine", () => {
    it("starts idle on the first step with the full duration", () => {
        const s = createEngine(steps);
        expect(s.status).toBe("idle");
        expect(remainingMs(s, T0)).toBe(20_000);
        expect(tick(s, T0).cues).toEqual([]);
    });

    it("announces the first step on start and counts down by wall clock", () => {
        const { state, cues } = start(createEngine(steps), T0);
        expect(cues).toEqual([{ type: "announce", step: steps[0] }]);
        expect(remainingMs(state, T0 + 7_500)).toBe(12_500);
    });

    it("gives the look step the 10 s warning and the 3-2-1 beeps", () => {
        const s = at_(1);
        const { cues } = run(s, T0, T0 + 39_900);
        expect(cues).toEqual([
            { type: "warning" },
            { type: "countdown", seconds: 3 },
            { type: "countdown", seconds: 2 },
            { type: "countdown", seconds: 1 },
        ]);
    });

    it("does not emit cues twice when ticks are dense", () => {
        const { cues } = run(at_(1), T0, T0 + 39_900, 50);
        expect(cues.filter((c) => c.type === "warning")).toHaveLength(1);
        expect(cues.filter((c) => c.type === "countdown")).toHaveLength(3);
    });

    it("still fires a crossed threshold when a tick arrives late", () => {
        // Jump from 40 s remaining straight to 8.5 s remaining.
        const { cues } = tick(at_(1), T0 + 31_500);
        expect(cues).toEqual([{ type: "warning" }]);
    });

    it("skips the 10 s warning for short picks, keeps the beeps", () => {
        const s = at_(4);
        expect(currentStep(s)).toBe(steps[4]);
        const { cues } = run(s, T0, T0 + 4_900);
        expect(cues.map((c) => c.type)).toEqual([
            "countdown",
            "countdown",
            "countdown",
        ]);
    });

    it("keeps open, check and draft steps silent until they end", () => {
        expect(run(at_(0), T0, T0 + 19_900).cues).toEqual([]);
        expect(run(at_(2), T0, T0 + 4_900).cues).toEqual([]);
        expect(run(at_(3), T0, T0 + 3_900).cues).toEqual([]);
    });

    it("warns at 10 s in the review too, without beeps", () => {
        const { cues } = run(at_(7), T0, T0 + 59_900);
        expect(cues).toEqual([{ type: "warning" }]);
    });

    it("calls the minutes on the construction clock, then 10 s", () => {
        const { cues } = run(at_(8), T0, T0 + 25 * 60_000 - 100, 1_000);
        expect(cues).toEqual([
            { type: "milestone", seconds: 600 },
            { type: "milestone", seconds: 300 },
            { type: "milestone", seconds: 60 },
            { type: "warning" },
        ]);
    });

    it("rolls into the next step when time is up, keeping the overflow", () => {
        const { state } = start(createEngine(steps), T0);
        const { state: next, cues } = tick(state, T0 + 20_300);
        expect(cues).toEqual([{ type: "announce", step: steps[1] }]);
        expect(next.index).toBe(1);
        // The 300 ms overshoot is charged to the new step.
        expect(remainingMs(next, T0 + 20_300)).toBe(39_700);
    });

    it("catches up across several elapsed steps after a long sleep", () => {
        const { state } = start(createEngine(steps), T0);
        // open 20 + look 40 + draft 5 + check 4 = 69 s; wake up at 70.5 s →
        // inside the 5-second look with 3.5 s left.
        const { state: next, cues } = tick(state, T0 + 70_500);
        expect(cues).toEqual([{ type: "announce", step: steps[4] }]);
        expect(remainingMs(next, T0 + 70_500)).toBe(3_500);
    });

    it("finishes on the terminal step", () => {
        const { state } = start(createEngine(steps), T0);
        const { state: done, cues } = tick(state, T0 + 10_000_000);
        expect(done.status).toBe("finished");
        expect(cues).toEqual([
            { type: "announce", step: steps.at(-1) },
            { type: "finished" },
        ]);
        expect(remainingMs(done, T0 + 10_000_000)).toBe(0);
        expect(tick(done, T0 + 20_000_000).cues).toEqual([]);
    });

    it("pauses and resumes without losing time", () => {
        let s = start(createEngine(steps), T0).state;
        s = pause(s, T0 + 5_000).state;
        expect(s.status).toBe("paused");
        expect(remainingMs(s, T0 + 60_000)).toBe(15_000);
        expect(tick(s, T0 + 60_000).cues).toEqual([]);
        s = resume(s, T0 + 60_000).state;
        expect(remainingMs(s, T0 + 61_000)).toBe(14_000);
    });

    it("skip jumps to the next step and announces it", () => {
        const s = start(createEngine(steps), T0).state;
        const { state, cues } = skip(s, T0 + 3_000);
        expect(state.index).toBe(1);
        expect(cues).toEqual([{ type: "announce", step: steps[1] }]);
        expect(remainingMs(state, T0 + 3_000)).toBe(40_000);
    });

    it("back restarts the current step, or goes to the previous one if just begun", () => {
        let s = start(createEngine(steps), T0).state;
        s = skip(s, T0 + 3_000).state;
        // 1 s into the look → back goes to the open step.
        let r = back(s, T0 + 4_000);
        expect(r.state.index).toBe(0);
        expect(r.cues).toEqual([{ type: "announce", step: steps[0] }]);
        // 5 s into the open step → back restarts it.
        r = back(r.state, T0 + 9_000);
        expect(r.state.index).toBe(0);
        expect(remainingMs(r.state, T0 + 9_000)).toBe(20_000);
    });

    it("ignores controls that do not apply to the current status", () => {
        const idle = createEngine(steps);
        expect(pause(idle, T0).state).toBe(idle);
        expect(resume(idle, T0).state).toBe(idle);
        expect(skip(idle, T0).state).toBe(idle);
        const running = start(idle, T0).state;
        expect(start(running, T0).state).toBe(running);
        expect(resume(running, T0).state).toBe(running);
    });
});
