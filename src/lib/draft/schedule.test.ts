import { describe, expect, it } from "vitest";
import {
    buildSchedule,
    DEFAULT_CONFIG,
    normalizeConfig,
    totalSeconds,
    type Step,
} from "./schedule";

const ofKind = <K extends Step["kind"]>(steps: Step[], kind: K) =>
    steps.filter((s): s is Extract<Step, { kind: K }> => s.kind === kind);

describe("buildSchedule", () => {
    it("runs a 3×14 draft: 13 timed picks per pack, last card, review between packs", () => {
        const steps = buildSchedule(DEFAULT_CONFIG);

        expect(ofKind(steps, "open")).toHaveLength(3);
        expect(ofKind(steps, "look")).toHaveLength(3 * 13);
        expect(ofKind(steps, "draft")).toHaveLength(3 * 13);
        // The open step stands in for the first pick's check.
        expect(ofKind(steps, "check")).toHaveLength(3 * 12);
        expect(ofKind(steps, "last-pick")).toHaveLength(3);
        // Review only between packs.
        expect(ofKind(steps, "review").map((r) => r.duration)).toEqual([
            60, 90,
        ]);
        expect(steps.at(-1)?.kind).toBe("done");
    });

    it("cycles open/check → look → draft, then the last card", () => {
        const kinds = buildSchedule({
            ...DEFAULT_CONFIG,
            packs: 1,
            cardsPerPack: 4,
            deckBuilding: false,
        }).map((s) => s.kind);
        expect(kinds).toEqual([
            "open",
            "look",
            "draft",
            "check",
            "look",
            "draft",
            "check",
            "look",
            "draft",
            "last-pick",
            "done",
        ]);
    });

    it("assigns MTR seconds to the look step by cards remaining", () => {
        const looks = ofKind(buildSchedule(DEFAULT_CONFIG), "look").filter(
            (p) => p.pack === 1
        );
        expect(looks.map((p) => [p.cardsRemaining, p.duration])).toEqual([
            [14, 40],
            [13, 35],
            [12, 30],
            [11, 25],
            [10, 25],
            [9, 20],
            [8, 20],
            [7, 15],
            [6, 10],
            [5, 10],
            [4, 5],
            [3, 5],
            [2, 5],
        ]);
    });

    it("uses the configured fixed times for open, check, draft and last card", () => {
        const steps = buildSchedule({
            ...DEFAULT_CONFIG,
            packs: 1,
            cardsPerPack: 3,
            openPackSeconds: 20,
            checkSeconds: 4,
            passSeconds: 6,
            lastPickSeconds: 7,
            deckBuilding: false,
        });
        expect(steps.map((s) => [s.kind, s.duration])).toEqual([
            ["open", 20],
            ["look", 5],
            ["draft", 6],
            ["check", 4],
            ["look", 5],
            ["draft", 6],
            ["last-pick", 7],
            ["done", 0],
        ]);
        expect(totalSeconds(steps)).toBe(53);
    });

    it("alternates passing direction per pack", () => {
        const steps = buildSchedule(DEFAULT_CONFIG);
        const byPack = (n: number) =>
            new Set(
                steps.flatMap((s) =>
                    (s.kind === "open" || s.kind === "look") && s.pack === n
                        ? [s.direction]
                        : []
                )
            );
        expect(byPack(1)).toEqual(new Set(["left"]));
        expect(byPack(2)).toEqual(new Set(["right"]));
        expect(byPack(3)).toEqual(new Set(["left"]));
    });

    it("times deck building after the last pack by default (MTR: 25 min)", () => {
        const steps = buildSchedule(DEFAULT_CONFIG);
        expect(steps.at(-2)).toEqual({
            kind: "build",
            pack: 3,
            duration: 25 * 60,
        });
        expect(steps.at(-1)).toMatchObject({ kind: "done", afterBuild: true });
    });

    it("ends at the last card when deck building is off", () => {
        const steps = buildSchedule({ ...DEFAULT_CONFIG, deckBuilding: false });
        expect(ofKind(steps, "build")).toHaveLength(0);
        expect(steps.at(-2)?.kind).toBe("last-pick");
        expect(steps.at(-1)).toMatchObject({ kind: "done", afterBuild: false });
    });

    it("handles a 15-card pack (older boosters, cubes)", () => {
        const steps = buildSchedule({
            ...DEFAULT_CONFIG,
            packs: 1,
            cardsPerPack: 15,
        });
        expect(ofKind(steps, "open")[0].cardsRemaining).toBe(15);
        const looks = ofKind(steps, "look");
        expect(looks).toHaveLength(14);
        expect(looks[0]).toMatchObject({ cardsRemaining: 15, duration: 40 });
    });
});

describe("normalizeConfig", () => {
    it("fills defaults and clamps out-of-range values", () => {
        expect(normalizeConfig({})).toEqual(DEFAULT_CONFIG);
        expect(
            normalizeConfig({ packs: 99, cardsPerPack: 0, passSeconds: -1 })
        ).toMatchObject({ packs: 6, cardsPerPack: 2, passSeconds: 1 });
    });

    it("falls back to Italian for unknown locales", () => {
        expect(
            normalizeConfig({ locale: "xx" as unknown as "it" }).locale
        ).toBe("it");
    });
});
