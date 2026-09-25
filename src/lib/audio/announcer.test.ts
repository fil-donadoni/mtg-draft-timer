import { describe, expect, it } from "vitest";
import { defaultVoice, voiceQuality, voicesFor } from "./announcer";

const voice = (
    name: string,
    lang: string,
    localService = true,
    voiceURI = name
): SpeechSynthesisVoice =>
    ({
        name,
        lang,
        localService,
        voiceURI,
        default: false,
    }) as SpeechSynthesisVoice;

describe("voicesFor", () => {
    const voices = [
        voice("Samantha", "en-US"),
        voice("Alice", "it-IT"),
        voice("Luca", "it_IT"),
        voice("Google italiano", "it-IT", false),
        voice("Amélie", "fr-FR"),
    ];

    it("keeps only the locale's voices, local ones first", () => {
        expect(voicesFor(voices, "it").map((v) => v.name)).toEqual([
            "Alice",
            "Luca",
            "Google italiano",
        ]);
        expect(voicesFor(voices, "en").map((v) => v.name)).toEqual([
            "Samantha",
        ]);
    });

    it("ranks Apple premium > enhanced > compact and auto-picks the best", () => {
        const apple = [
            voice(
                "Alice",
                "it-IT",
                true,
                "com.apple.voice.compact.it-IT.Alice"
            ),
            voice(
                "Alice",
                "it-IT",
                true,
                "com.apple.voice.premium.it-IT.Alice"
            ),
            voice(
                "Federica",
                "it-IT",
                true,
                "com.apple.voice.enhanced.it-IT.Federica"
            ),
            voice(
                "Eddy (Italian (Italy))",
                "it-IT",
                true,
                "com.apple.eloquence.it-IT.Eddy"
            ),
        ];
        expect(voicesFor(apple, "it").map((v) => v.voiceURI)).toEqual([
            "com.apple.voice.premium.it-IT.Alice",
            "com.apple.voice.enhanced.it-IT.Federica",
            "com.apple.voice.compact.it-IT.Alice",
            "com.apple.eloquence.it-IT.Eddy",
        ]);
        expect(defaultVoice(apple, "it")?.voiceURI).toBe(
            "com.apple.voice.premium.it-IT.Alice"
        );
        expect(defaultVoice(apple, "en")).toBeNull();
        expect(voiceQuality(voice("Google italiano", "it-IT", false))).toBe(2);
    });
});
