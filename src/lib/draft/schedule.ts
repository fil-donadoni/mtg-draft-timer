import {
    passDirection,
    pickSeconds,
    reviewSeconds,
    type PassDirection,
} from "./timing";

export type Locale = "it" | "en";

export interface DraftConfig {
    /** Number of booster packs each player drafts (usually 3). */
    packs: number;
    /** Cards per pack after removing tokens/ad cards (14 for Play Boosters). */
    cardsPerPack: number;
    /**
     * Seconds to open the pack, count the cards face down and remove the
     * tokens before the first "you may look" (not in the MTR).
     */
    openPackSeconds: number;
    /** Seconds for "check that you have N cards" before "you may look". */
    checkSeconds: number;
    /** Seconds after "draft" to take the card and pass the pack. */
    passSeconds: number;
    /** Seconds to check and take the last (untimed) card. */
    lastPickSeconds: number;
    /** Whether to time deck registration + construction after the draft. */
    deckBuilding: boolean;
    /** Minutes for deck registration + construction (MTR: 25 for a draft). */
    deckBuildingMinutes: number;
    locale: Locale;
}

export const DEFAULT_CONFIG: DraftConfig = {
    packs: 3,
    cardsPerPack: 14,
    openPackSeconds: 20,
    checkSeconds: 4,
    passSeconds: 5,
    lastPickSeconds: 5,
    deckBuilding: true,
    deckBuildingMinutes: 25,
    locale: "it",
};

export const CONFIG_LIMITS = {
    packs: { min: 1, max: 6 },
    cardsPerPack: { min: 2, max: 20 },
    openPackSeconds: { min: 5, max: 120 },
    checkSeconds: { min: 1, max: 30 },
    passSeconds: { min: 1, max: 30 },
    lastPickSeconds: { min: 1, max: 30 },
    deckBuildingMinutes: { min: 5, max: 90 },
} as const;

interface StepBase {
    /** Seconds this step lasts. */
    duration: number;
    pack: number;
}

/** Open the pack, count, remove tokens; doubles as the first pick's check. */
export interface OpenStep extends StepBase {
    kind: "open";
    cardsRemaining: number;
    direction: PassDirection;
}

/** "Check that you have N cards" — the pack just arrived, still face down. */
export interface CheckStep extends StepBase {
    kind: "check";
    /** 1-based pick number within the pack. */
    pick: number;
    cardsRemaining: number;
    direction: PassDirection;
}

/** "You may look" — the MTR-timed pick. */
export interface LookStep extends StepBase {
    kind: "look";
    pick: number;
    cardsRemaining: number;
    direction: PassDirection;
}

/** "Draft" — time is up: take a card and pass the pack. */
export interface DraftStep extends StepBase {
    kind: "draft";
    pick: number;
    cardsRemaining: number;
    direction: PassDirection;
}

/** One card left: check and take it, no clock. */
export interface LastPickStep extends StepBase {
    kind: "last-pick";
    pick: number;
}

/** Review period between packs. */
export interface ReviewStep extends StepBase {
    kind: "review";
}

/** Deck registration + construction after the last pack. */
export interface BuildStep extends StepBase {
    kind: "build";
}

export interface DoneStep extends StepBase {
    kind: "done";
    /** True when the construction clock, not the draft, just ran out. */
    afterBuild: boolean;
}

export type Step =
    | OpenStep
    | CheckStep
    | LookStep
    | DraftStep
    | LastPickStep
    | ReviewStep
    | BuildStep
    | DoneStep;

function clampInt(value: number, min: number, max: number): number {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, Math.round(value)));
}

/** Coerce arbitrary input (e.g. from localStorage) into a valid config. */
export function normalizeConfig(input: Partial<DraftConfig>): DraftConfig {
    const c = { ...DEFAULT_CONFIG, ...input };
    const clamp = (key: keyof typeof CONFIG_LIMITS) =>
        clampInt(c[key], CONFIG_LIMITS[key].min, CONFIG_LIMITS[key].max);
    return {
        packs: clamp("packs"),
        cardsPerPack: clamp("cardsPerPack"),
        openPackSeconds: clamp("openPackSeconds"),
        checkSeconds: clamp("checkSeconds"),
        passSeconds: clamp("passSeconds"),
        lastPickSeconds: clamp("lastPickSeconds"),
        deckBuilding: Boolean(c.deckBuilding),
        deckBuildingMinutes: clamp("deckBuildingMinutes"),
        locale: c.locale === "en" ? "en" : "it",
    };
}

/**
 * Expand a config into the ordered list of timed steps the judge runs
 * through. Pure: the same config always yields the same schedule.
 *
 * Per pack: open → look → draft → (check → look → draft)… → last-pick →
 * review (between packs) — then optionally build. The open step stands in
 * for the first pick's check.
 */
export function buildSchedule(rawConfig: DraftConfig): Step[] {
    const config = normalizeConfig(rawConfig);
    const steps: Step[] = [];

    for (let pack = 1; pack <= config.packs; pack++) {
        const direction = passDirection(pack);

        for (let pick = 1; pick <= config.cardsPerPack; pick++) {
            const cardsRemaining = config.cardsPerPack - pick + 1;
            const seconds = pickSeconds(cardsRemaining);

            if (seconds === null) {
                steps.push({
                    kind: "last-pick",
                    pack,
                    pick,
                    duration: config.lastPickSeconds,
                });
                break;
            }

            const at = { pack, pick, cardsRemaining, direction };
            if (pick === 1) {
                steps.push({
                    kind: "open",
                    pack,
                    cardsRemaining,
                    direction,
                    duration: config.openPackSeconds,
                });
            } else {
                steps.push({
                    kind: "check",
                    ...at,
                    duration: config.checkSeconds,
                });
            }
            steps.push({ kind: "look", ...at, duration: seconds });
            steps.push({ kind: "draft", ...at, duration: config.passSeconds });
        }

        if (pack < config.packs) {
            steps.push({ kind: "review", pack, duration: reviewSeconds(pack) });
        }
    }

    if (config.deckBuilding) {
        steps.push({
            kind: "build",
            pack: config.packs,
            duration: config.deckBuildingMinutes * 60,
        });
    }

    steps.push({
        kind: "done",
        pack: config.packs,
        duration: 0,
        afterBuild: config.deckBuilding,
    });
    return steps;
}

/** Total scheduled seconds, excluding the terminal step. */
export function totalSeconds(steps: readonly Step[]): number {
    return steps.reduce((sum, step) => sum + step.duration, 0);
}
