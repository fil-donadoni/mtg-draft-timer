/**
 * Beeps as WAV files built in memory and played through `<audio>`, not the
 * Web Audio API. On iOS the ring/silent switch mutes Web Audio but not media
 * elements, and the table's phone is usually on silent — so the 3-2-1 that
 * leads into "draft" must go through a media element to be heard.
 */

export interface Tone {
    /** Hz */
    freq: number;
    /** ms */
    ms: number;
    /** 0-1 */
    gain?: number;
}

const SAMPLE_RATE = 22_050;

/** Mono 16-bit PCM WAV of the tones played back to back. */
export function wavBytes(tones: readonly Tone[]): Uint8Array {
    const frames = tones.map((t) => Math.round((t.ms / 1000) * SAMPLE_RATE));
    const total = frames.reduce((a, b) => a + b, 0);
    const bytes = new Uint8Array(44 + total * 2);
    const view = new DataView(bytes.buffer);
    const ascii = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) {
            view.setUint8(offset + i, s.charCodeAt(i));
        }
    };
    ascii(0, "RIFF");
    view.setUint32(4, 36 + total * 2, true);
    ascii(8, "WAVE");
    ascii(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // mono
    view.setUint32(24, SAMPLE_RATE, true);
    view.setUint32(28, SAMPLE_RATE * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    ascii(36, "data");
    view.setUint32(40, total * 2, true);

    let cursor = 44;
    tones.forEach((tone, i) => {
        const n = frames[i];
        const gain = tone.gain ?? 0.8;
        // 5 ms fade in, exponential-ish fade over the tail: no clicks.
        const attack = Math.round(SAMPLE_RATE * 0.005);
        for (let k = 0; k < n; k++) {
            const env =
                k < attack
                    ? k / attack
                    : Math.exp((-3 * (k - attack)) / (n - attack));
            const sample =
                Math.sin((2 * Math.PI * tone.freq * k) / SAMPLE_RATE) *
                env *
                gain;
            view.setInt16(cursor, Math.round(sample * 32767), true);
            cursor += 2;
        }
    });
    return bytes;
}

export function wavDataUri(tones: readonly Tone[]): string {
    const bytes = wavBytes(tones);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
    }
    return `data:audio/wav;base64,${btoa(binary)}`;
}

export type BeepKind = "chime" | "tick" | "end";

export const BEEP_TONES: Record<BeepKind, readonly Tone[]> = {
    tick: [{ freq: 880, ms: 140 }],
    chime: [
        { freq: 660, ms: 120 },
        { freq: 990, ms: 200 },
    ],
    end: [
        { freq: 1320, ms: 110, gain: 0.9 },
        { freq: 1320, ms: 110, gain: 0.9 },
        { freq: 1320, ms: 300, gain: 0.9 },
    ],
};
