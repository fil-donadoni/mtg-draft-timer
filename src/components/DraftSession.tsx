import { useCallback, useEffect, useMemo, useState } from "react";
import { TimerScreen } from "@/components/TimerScreen";
import { useDraftEngine } from "@/hooks/useDraftEngine";
import { useWakeLock } from "@/hooks/useWakeLock";
import type { Announcer } from "@/lib/audio/announcer";
import type { Cue } from "@/lib/draft/engine";
import {
    milestoneAnnouncement,
    stepAnnouncement,
    warningAnnouncement,
} from "@/lib/draft/messages";
import { buildSchedule, type DraftConfig } from "@/lib/draft/schedule";

interface Props {
    config: DraftConfig;
    announcer: Announcer;
    onExit(): void;
}

/** One running draft: builds the schedule, wires cues to the announcer. */
export function DraftSession({ config, announcer, onExit }: Props) {
    const steps = useMemo(() => buildSchedule(config), [config]);
    const [muted, setMuted] = useState(false);

    const onCue = useCallback(
        (cue: Cue) => {
            switch (cue.type) {
                case "announce":
                    announcer.beep("chime");
                    announcer.speak(
                        stepAnnouncement(cue.step, config.locale, config.packs),
                        { interrupt: true }
                    );
                    break;
                case "warning":
                    announcer.speak(warningAnnouncement(config.locale));
                    break;
                case "countdown":
                    announcer.beep("tick");
                    break;
                case "milestone":
                    announcer.beep("chime");
                    announcer.speak(
                        milestoneAnnouncement(cue.seconds, config.locale)
                    );
                    break;
                case "finished":
                    announcer.beep("end");
                    break;
            }
        },
        [announcer, config.locale, config.packs]
    );

    const engine = useDraftEngine(steps, onCue);
    const { start } = engine;

    // Auto-start: the tap on "Start" that mounted us is the audio unlock.
    useEffect(() => {
        start();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useWakeLock(engine.state.status === "running");

    useEffect(() => {
        announcer.setMuted(muted);
    }, [announcer, muted]);

    return (
        <TimerScreen
            config={config}
            engine={engine}
            muted={muted}
            onToggleMuted={() => setMuted((m) => !m)}
            onExit={onExit}
        />
    );
}
