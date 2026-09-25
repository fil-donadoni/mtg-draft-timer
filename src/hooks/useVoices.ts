import { useEffect, useState } from "react";

/** The browser's speech voices, re-read when the (async) list loads. */
export function useVoices(): SpeechSynthesisVoice[] {
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

    useEffect(() => {
        const synth = window.speechSynthesis;
        if (!synth) return;
        const load = () => setVoices(synth.getVoices());
        load();
        synth.addEventListener("voiceschanged", load);
        return () => synth.removeEventListener("voiceschanged", load);
    }, []);

    return voices;
}
