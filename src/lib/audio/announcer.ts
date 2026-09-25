import type { Locale } from "@/lib/draft/schedule";

export type BeepKind = "chime" | "tick" | "end";

/** What the judge can do: talk, and make the table beep. */
export interface Announcer {
    /**
     * Speak `text`. `interrupt` cancels whatever is still being spoken —
     * used for step announcements, since the previous step's line is stale.
     */
    speak(text: string, options?: { interrupt?: boolean }): void;
    beep(kind: BeepKind): void;
    /**
     * Must be called from a user gesture: mobile browsers refuse to play
     * audio or synthesize speech until a tap has "unlocked" the page.
     */
    unlock(): Promise<void>;
    setMuted(muted: boolean): void;
    /** Point the voice at a (new) language/voice; takes effect on the next `speak`. */
    configure(options: AnnouncerOptions): void;
}

export interface AnnouncerOptions {
    locale: Locale;
    /** `voiceURI` of the voice to use, or null for the platform default. */
    voiceURI: string | null;
    rate?: number;
}

export const silentAnnouncer: Announcer = {
    speak() {},
    beep() {},
    async unlock() {},
    setMuted() {},
    configure() {},
};

const BCP47: Record<Locale, string> = { it: "it-IT", en: "en-US" };

/**
 * How good a voice is likely to sound. Apple ships three tiers of the same
 * voice and exposes the tier only in the URI (`com.apple.voice.premium.*`,
 * `…enhanced…`, `…compact…`); the compact one is what a fresh iPhone has.
 * Higher is better.
 */
export function voiceQuality(voice: SpeechSynthesisVoice): number {
    const id = `${voice.voiceURI} ${voice.name}`.toLowerCase();
    if (/premium/.test(id)) return 4;
    if (/enhanced|migliorat|neural|natural/.test(id)) return 3;
    if (/compact|eloquence|ttsbundle/.test(id)) return 1;
    return 2;
}

/** Voices for `locale`, best-sounding first, then local before network. */
export function voicesFor(
    voices: readonly SpeechSynthesisVoice[],
    locale: Locale
): SpeechSynthesisVoice[] {
    const lang = BCP47[locale].slice(0, 2).toLowerCase();
    return voices
        .filter((v) => v.lang.toLowerCase().replace("_", "-").startsWith(lang))
        .sort(
            (a, b) =>
                voiceQuality(b) - voiceQuality(a) ||
                Number(b.localService) - Number(a.localService)
        );
}

/** The voice used when none is chosen: the best installed one for `locale`. */
export function defaultVoice(
    voices: readonly SpeechSynthesisVoice[],
    locale: Locale
): SpeechSynthesisVoice | null {
    return voicesFor(voices, locale)[0] ?? null;
}

/**
 * Real announcer on the Web Speech API + Web Audio. Speech goes through
 * `speechSynthesis`; beeps are short oscillator envelopes so no audio
 * assets are needed.
 */
export function createWebAnnouncer(initial: AnnouncerOptions): Announcer {
    let audio: AudioContext | null = null;
    let muted = false;
    let options = initial;

    const synth: SpeechSynthesis | undefined =
        typeof window !== "undefined" ? window.speechSynthesis : undefined;

    function ensureAudio(): AudioContext | null {
        if (audio) return audio;
        const Ctor =
            typeof window !== "undefined"
                ? (window.AudioContext ??
                  (
                      window as unknown as {
                          webkitAudioContext?: typeof AudioContext;
                      }
                  ).webkitAudioContext)
                : undefined;
        if (!Ctor) return null;
        audio = new Ctor();
        return audio;
    }

    function tone(
        ctx: AudioContext,
        freq: number,
        startAt: number,
        length: number,
        gain = 0.25
    ) {
        const osc = ctx.createOscillator();
        const env = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        env.gain.setValueAtTime(0, startAt);
        env.gain.linearRampToValueAtTime(gain, startAt + 0.01);
        env.gain.exponentialRampToValueAtTime(0.001, startAt + length);
        osc.connect(env).connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + length + 0.02);
    }

    return {
        speak(text, { interrupt = false } = {}) {
            if (muted || !synth) return;
            if (interrupt) synth.cancel();
            const { locale, voiceURI, rate = 1 } = options;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = BCP47[locale];
            utterance.rate = rate;
            const voices = synth.getVoices();
            const voice = voiceURI
                ? voices.find((v) => v.voiceURI === voiceURI)
                : defaultVoice(voices, locale);
            if (voice) utterance.voice = voice;
            synth.speak(utterance);
        },

        beep(kind) {
            if (muted) return;
            const ctx = ensureAudio();
            if (!ctx) return;
            const t = ctx.currentTime;
            switch (kind) {
                case "tick":
                    tone(ctx, 880, t, 0.08);
                    break;
                case "chime":
                    tone(ctx, 660, t, 0.12);
                    tone(ctx, 990, t + 0.12, 0.18);
                    break;
                case "end":
                    tone(ctx, 1320, t, 0.1, 0.3);
                    tone(ctx, 1320, t + 0.14, 0.1, 0.3);
                    tone(ctx, 1320, t + 0.28, 0.25, 0.3);
                    break;
            }
        },

        async unlock() {
            const ctx = ensureAudio();
            if (ctx && ctx.state !== "running") {
                await ctx.resume().catch(() => {});
            }
            // iOS Safari needs a spoken (even empty) utterance from a tap
            // before later, programmatic ones are allowed.
            if (synth) {
                synth.cancel();
                const primer = new SpeechSynthesisUtterance("");
                primer.volume = 0;
                synth.speak(primer);
            }
        },

        setMuted(value) {
            muted = value;
            if (value && synth) synth.cancel();
        },

        configure(next) {
            options = next;
        },
    };
}
