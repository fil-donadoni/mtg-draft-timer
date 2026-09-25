import { useEffect, useState } from "react";
import { DraftSession } from "@/components/DraftSession";
import { SetupScreen } from "@/components/SetupScreen";
import { createWebAnnouncer, type Announcer } from "@/lib/audio/announcer";
import {
    DEFAULT_CONFIG,
    normalizeConfig,
    type DraftConfig,
} from "@/lib/draft/schedule";
import { loadSettings, saveSettings } from "@/lib/storage";

interface Props {
    /** Test seam: replaces the Web Speech / Web Audio announcer. */
    announcer?: Announcer;
}

export function App({ announcer: injected }: Props) {
    const [settings, setSettings] = useState(loadSettings);
    const [running, setRunning] = useState(false);
    const { config, voiceURI } = settings;

    const [announcer] = useState(
        () =>
            injected ?? createWebAnnouncer({ locale: config.locale, voiceURI })
    );

    useEffect(() => {
        announcer.configure({ locale: config.locale, voiceURI });
    }, [announcer, config.locale, voiceURI]);

    useEffect(() => {
        saveSettings(settings);
    }, [settings]);

    const setConfig = (next: DraftConfig) =>
        setSettings((s) => ({ ...s, config: next }));

    if (running) {
        return (
            <DraftSession
                config={config}
                announcer={announcer}
                onExit={() => setRunning(false)}
            />
        );
    }

    return (
        <SetupScreen
            config={config}
            voiceURI={voiceURI}
            onConfigChange={setConfig}
            onVoiceChange={(v) => setSettings((s) => ({ ...s, voiceURI: v }))}
            onReset={() =>
                setSettings({ config: DEFAULT_CONFIG, voiceURI: null })
            }
            onTestVoice={(text) => {
                void announcer.unlock().then(() => {
                    announcer.beep("chime");
                    announcer.speak(text, { interrupt: true });
                });
            }}
            onStart={() => {
                // Clamp once more on the way in: the inputs let you type out
                // of range while editing.
                setConfig(normalizeConfig(config));
                void announcer.unlock();
                setRunning(true);
            }}
        />
    );
}
