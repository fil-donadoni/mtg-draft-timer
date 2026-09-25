import { describe, expect, it } from "vitest";
import { BEEP_TONES, wavBytes, wavDataUri } from "./beeps";

describe("wavBytes", () => {
    it("writes a valid mono 16-bit PCM header sized to the tones", () => {
        const bytes = wavBytes([
            { freq: 440, ms: 100 },
            { freq: 880, ms: 50 },
        ]);
        const view = new DataView(bytes.buffer);
        const tag = (o: number) =>
            String.fromCharCode(...bytes.subarray(o, o + 4));
        expect(tag(0)).toBe("RIFF");
        expect(tag(8)).toBe("WAVE");
        expect(tag(36)).toBe("data");
        expect(view.getUint16(22, true)).toBe(1); // mono
        expect(view.getUint32(24, true)).toBe(22_050);
        // 150 ms at 22 050 Hz, 2 bytes per sample
        const frames = Math.round(0.1 * 22_050) + Math.round(0.05 * 22_050);
        expect(view.getUint32(40, true)).toBe(frames * 2);
        expect(bytes.length).toBe(44 + frames * 2);
    });

    it("starts silent and fades out (no clicks)", () => {
        const bytes = wavBytes([{ freq: 440, ms: 100 }]);
        const view = new DataView(bytes.buffer);
        expect(view.getInt16(44, true)).toBe(0);
        const last = view.getInt16(bytes.length - 2, true);
        expect(Math.abs(last)).toBeLessThan(32767 * 0.06);
    });
});

describe("wavDataUri", () => {
    it("is a base64 wav for every beep kind", () => {
        for (const kind of Object.keys(
            BEEP_TONES
        ) as (keyof typeof BEEP_TONES)[]) {
            const uri = wavDataUri(BEEP_TONES[kind]);
            expect(uri.startsWith("data:audio/wav;base64,UklGR")).toBe(true);
        }
    });
});
