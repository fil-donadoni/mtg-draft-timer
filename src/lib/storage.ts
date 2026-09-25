import {
    DEFAULT_CONFIG,
    normalizeConfig,
    type DraftConfig,
} from "@/lib/draft/schedule";

const CONFIG_KEY = "draft-timer:config";
const VOICE_KEY = "draft-timer:voice";

export interface Settings {
    config: DraftConfig;
    voiceURI: string | null;
}

export function loadSettings(): Settings {
    let config = DEFAULT_CONFIG;
    let voiceURI: string | null = null;
    try {
        const raw = localStorage.getItem(CONFIG_KEY);
        if (raw)
            config = normalizeConfig(JSON.parse(raw) as Partial<DraftConfig>);
        voiceURI = localStorage.getItem(VOICE_KEY);
    } catch {
        // Private mode / blocked storage: fall back to defaults.
    }
    return { config, voiceURI };
}

export function saveSettings({ config, voiceURI }: Settings): void {
    try {
        localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
        if (voiceURI) localStorage.setItem(VOICE_KEY, voiceURI);
        else localStorage.removeItem(VOICE_KEY);
    } catch {
        // Ignore: settings just won't persist.
    }
}
