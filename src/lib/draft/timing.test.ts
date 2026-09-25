import { describe, expect, it } from "vitest";
import { passDirection, pickSeconds } from "./timing";

describe("pickSeconds (MTR Appendix B)", () => {
    it.each([
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
    ])("%i cards remaining → %i seconds", (cards, seconds) => {
        expect(pickSeconds(cards)).toBe(seconds);
    });

    it("gives no time limit for the last card", () => {
        expect(pickSeconds(1)).toBeNull();
    });

    it("caps oversized packs at the 15-card row", () => {
        expect(pickSeconds(16)).toBe(40);
        expect(pickSeconds(20)).toBe(40);
    });

    it("rejects invalid counts", () => {
        expect(() => pickSeconds(0)).toThrow(RangeError);
        expect(() => pickSeconds(2.5)).toThrow(RangeError);
    });
});

describe("passDirection (MTR 7.7)", () => {
    it("alternates left, right, left", () => {
        expect(passDirection(1)).toBe("left");
        expect(passDirection(2)).toBe("right");
        expect(passDirection(3)).toBe("left");
    });
});
