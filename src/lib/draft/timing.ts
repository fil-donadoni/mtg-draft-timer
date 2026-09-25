/**
 * Official pick timing — Magic Tournament Rules, Appendix B "Booster Draft
 * Timing" (MTR effective 2026-02-27). Keyed by cards remaining in the pack
 * at the moment of the pick. A 1-card pick has no time limit ("N/A"): the
 * last card is simply taken.
 */
export const MTR_PICK_SECONDS: ReadonlyMap<number, number> = new Map([
    [15, 40],
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

/** Largest pack size the MTR table covers; bigger packs use its top row. */
const MTR_MAX_CARDS = 15;

/**
 * Seconds allowed for a pick with `cardsRemaining` cards in the pack, or
 * `null` when the pick is untimed (1 card left).
 */
export function pickSeconds(cardsRemaining: number): number | null {
    if (!Number.isInteger(cardsRemaining) || cardsRemaining < 1) {
        throw new RangeError(
            `cardsRemaining must be a positive integer, got ${cardsRemaining}`
        );
    }
    if (cardsRemaining === 1) return null;
    if (cardsRemaining >= MTR_MAX_CARDS) {
        return MTR_PICK_SECONDS.get(MTR_MAX_CARDS)!;
    }
    return MTR_PICK_SECONDS.get(cardsRemaining)!;
}

export type PassDirection = "left" | "right";

/**
 * Passing direction for pack `packNumber` (1-based): left for the first
 * pack, then reversed for each subsequent pack (MTR 7.7).
 */
export function passDirection(packNumber: number): PassDirection {
    return packNumber % 2 === 1 ? "left" : "right";
}
