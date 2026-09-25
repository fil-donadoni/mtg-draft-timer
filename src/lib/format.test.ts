import { describe, expect, it } from "vitest";
import { formatClock, formatDuration } from "./format";

describe("formatClock", () => {
    it("shows plain seconds under a minute, rounding up", () => {
        expect(formatClock(40_000)).toBe("40");
        expect(formatClock(200)).toBe("1");
        expect(formatClock(0)).toBe("0");
    });

    it("shows m:ss from a minute up", () => {
        expect(formatClock(60_000)).toBe("1:00");
        expect(formatClock(90_500)).toBe("1:31");
        expect(formatClock(120_000)).toBe("2:00");
    });
});

describe("formatDuration", () => {
    it("rounds to minutes and splits hours", () => {
        expect(formatDuration(45 * 60 + 20)).toBe("45 min");
        expect(formatDuration(65 * 60)).toBe("1 h 05 min");
    });
});
