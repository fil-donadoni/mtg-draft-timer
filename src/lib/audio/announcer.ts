import type { Locale } from "@/lib/draft/schedule";
import { BEEP_TONES, wavDataUri, type BeepKind } from "./beeps";

export type { BeepKind } from "./beeps";

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
 * Real announcer on the Web Speech API + `<audio>`. Speech goes through
 * `speechSynthesis`; beeps are in-memory WAVs played through media elements
 * (see `beeps.ts` for why not Web Audio).
 */
export function createWebAnnouncer(initial: AnnouncerOptions): Announcer {
    let muted = false;
    let options = initial;

    const synth: SpeechSynthesis | undefined =
        typeof window !== "undefined" ? window.speechSynthesis : undefined;

    const players = new Map<BeepKind, HTMLAudioElement>();
    function player(kind: BeepKind): HTMLAudioElement | null {
        if (typeof Audio === "undefined") return null;
        let el = players.get(kind);
        if (!el) {
            el = new Audio(wavDataUri(BEEP_TONES[kind]));
            el.preload = "auto";
            players.set(kind, el);
        }
        return el;
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
            const el = player(kind);
            if (!el) return;
            el.currentTime = 0;
            void el.play().catch(() => {});
        },

        async unlock() {
            // A media element only plays later if a tap played it once:
            // start each beep muted and stop it right away.
            for (const kind of Object.keys(BEEP_TONES) as BeepKind[]) {
                const el = player(kind);
                if (!el) continue;
                el.muted = true;
                try {
                    await el.play();
                } catch {
                    // Autoplay refused: the first real beep will retry.
                }
                el.pause();
                el.currentTime = 0;
                el.muted = false;
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
