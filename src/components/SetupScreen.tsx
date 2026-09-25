import { useMemo } from "react";
import { Play, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    buildSchedule,
    CONFIG_LIMITS,
    DEFAULT_CONFIG,
    normalizeConfig,
    totalSeconds,
    type DraftConfig,
    type Locale,
} from "@/lib/draft/schedule";
import { stepAnnouncement } from "@/lib/draft/messages";
import { pickSeconds } from "@/lib/draft/timing";
import { formatDuration } from "@/lib/format";
import { voiceQuality, voicesFor } from "@/lib/audio/announcer";
import { useVoices } from "@/hooks/useVoices";

const UI: Record<
    Locale,
    {
        title: string;
        subtitle: string;
        packs: string;
        cardsPerPack: string;
        openPack: string;
        openPackHint: string;
        check: string;
        checkHint: string;
        pass: string;
        passHint: string;
        lastPick: string;
        lastPickHint: string;
        review: string;
        reviewHint: string;
        build: string;
        buildHint: string;
        buildMinutes: string;
        language: string;
        voice: string;
        voiceDefault: string;
        voiceMissing: string;
        voiceTip: string;
        testVoice: string;
        reset: string;
        start: string;
        defaultIs: (value: number, unit: string) => string;
        summary: (picks: number, total: string) => string;
        firstPick: (seconds: number) => string;
        mtrNote: string;
    }
> = {
    it: {
        title: "Draft Timer",
        subtitle: "Un judge in tasca. Il telefono sul tavolo guida il draft.",
        packs: "Buste",
        cardsPerPack: "Carte per busta",
        openPack: "Apertura busta (s)",
        openPackHint:
            "Aprire, contare a faccia in giù, togliere i token; poi «potete guardare».",
        check: "Conteggio (s)",
        checkHint:
            "«Controllate di avere N carte», prima di «potete guardare».",
        pass: "Draft e passaggio (s)",
        passHint: "Dopo «draft»: scegliere la carta e passare la busta.",
        lastPick: "Ultima carta (s)",
        lastPickHint: "L'ultima carta non ha tempo limite (MTR).",
        review: "Revisione tra le buste (s)",
        reviewHint: "Le MTR dicono 60 s dopo la prima busta, +30 s a busta.",
        build: "Costruzione del mazzo",
        buildHint: "Registrazione e costruzione dopo il draft (MTR: 25 min).",
        buildMinutes: "Costruzione (min)",
        language: "Lingua del judge",
        voice: "Voce",
        voiceDefault: "Automatica (la migliore installata)",
        voiceMissing:
            "Nessuna voce per questa lingua installata: userò quella di sistema.",
        voiceTip:
            "Su iPhone le voci di serie sono le «compatte». Per una voce buona: Impostazioni → Accessibilità → Contenuto letto → Voci → Italiano → scarica Alice (Premium) o Federica (Migliorata). Poi riapri questa pagina.",
        testVoice: "Prova voce",
        reset: "Ripristina predefiniti",
        start: "Inizia il draft",
        defaultIs: (value, unit) => `Predefinito: ${value} ${unit}.`,
        summary: (picks, total) => `${picks} pick · circa ${total}`,
        firstPick: (seconds) => `Prima pick: ${seconds} s`,
        mtrNote:
            "Tempi per pick dalle Magic Tournament Rules, Appendice B. Il resto è a scelta del tavolo.",
    },
    en: {
        title: "Draft Timer",
        subtitle:
            "A judge in your pocket. The phone on the table runs the draft.",
        packs: "Packs",
        cardsPerPack: "Cards per pack",
        openPack: "Open pack (s)",
        openPackHint:
            "Open, count face down, remove tokens; then “you may look”.",
        check: "Count check (s)",
        checkHint: "“Check that you have N cards”, before “you may look”.",
        pass: "Draft and pass (s)",
        passHint: "After “draft”: take a card and pass the pack.",
        lastPick: "Last card (s)",
        lastPickHint: "The last card has no time limit (MTR).",
        review: "Review between packs (s)",
        reviewHint: "The MTR say 60 s after the first pack, +30 s per pack.",
        build: "Deck building",
        buildHint:
            "Registration and construction after the draft (MTR: 25 min).",
        buildMinutes: "Deck building (min)",
        language: "Judge language",
        voice: "Voice",
        voiceDefault: "Automatic (best installed)",
        voiceMissing:
            "No voice installed for this language: the system one will be used.",
        voiceTip:
            "iPhones ship with the “compact” voices. For a good one: Settings → Accessibility → Spoken Content → Voices → English → download a Premium or Enhanced voice, then reopen this page.",
        testVoice: "Test voice",
        reset: "Reset defaults",
        start: "Start the draft",
        defaultIs: (value, unit) => `Default: ${value} ${unit}.`,
        summary: (picks, total) => `${picks} picks · about ${total}`,
        firstPick: (seconds) => `First pick: ${seconds} s`,
        mtrNote:
            "Pick timings from the Magic Tournament Rules, Appendix B. The rest is up to the table.",
    },
};

interface Props {
    config: DraftConfig;
    voiceURI: string | null;
    onConfigChange(config: DraftConfig): void;
    onVoiceChange(voiceURI: string | null): void;
    onTestVoice(text: string): void;
    onReset(): void;
    onStart(): void;
}

export function SetupScreen({
    config,
    voiceURI,
    onConfigChange,
    onVoiceChange,
    onTestVoice,
    onReset,
    onStart,
}: Props) {
    const t = UI[config.locale];
    const voices = useVoices();
    const localeVoices = useMemo(
        () => voicesFor(voices, config.locale),
        [voices, config.locale]
    );
    // The inputs can hold out-of-range or empty values mid-edit; derive the
    // summary from the clamped config so it never throws.
    const safe = useMemo(() => normalizeConfig(config), [config]);
    const schedule = useMemo(() => buildSchedule(safe), [safe]);
    const picks = safe.packs * safe.cardsPerPack;

    const set = <K extends keyof DraftConfig>(key: K, value: DraftConfig[K]) =>
        onConfigChange({ ...config, [key]: value });

    // The best installed voice is only "good" from the enhanced tier up; below
    // that, point at the OS download.
    const bestQuality = localeVoices[0] ? voiceQuality(localeVoices[0]) : 0;
    const showVoiceTip = voices.length > 0 && bestQuality < 3;

    const numberField = (
        key: Extract<keyof DraftConfig, keyof typeof CONFIG_LIMITS>,
        label: string,
        hint?: string,
        unit = "s"
    ) => (
        <div className="grid gap-1.5">
            <Label htmlFor={key}>{label}</Label>
            <Input
                id={key}
                type="number"
                inputMode="numeric"
                min={CONFIG_LIMITS[key].min}
                max={CONFIG_LIMITS[key].max}
                value={config[key]}
                onChange={(e) => set(key, Number(e.target.value))}
                onBlur={() => onConfigChange(normalizeConfig(config))}
                className="h-11 text-lg"
            />
            <p className="text-xs text-muted-foreground">
                {hint && `${hint} `}
                {t.defaultIs(DEFAULT_CONFIG[key], unit)}
            </p>
        </div>
    );

    return (
        <main className="mx-auto flex min-h-full w-full max-w-md flex-col gap-4 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <header className="pt-4">
                <h1 className="text-3xl font-semibold tracking-tight">
                    {t.title}
                </h1>
                <p className="text-muted-foreground">{t.subtitle}</p>
            </header>

            <Card>
                <CardHeader>
                    <CardTitle>Draft</CardTitle>
                    <CardDescription>
                        {t.summary(
                            picks,
                            formatDuration(totalSeconds(schedule))
                        )}
                        {" · "}
                        {t.firstPick(pickSeconds(safe.cardsPerPack) ?? 0)}
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                    {numberField("packs", t.packs)}
                    {numberField("cardsPerPack", t.cardsPerPack)}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Judge</CardTitle>
                    <CardDescription>{t.mtrNote}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    {numberField("openPackSeconds", t.openPack, t.openPackHint)}
                    {numberField("checkSeconds", t.check, t.checkHint)}
                    {numberField("passSeconds", t.pass, t.passHint)}
                    {numberField("lastPickSeconds", t.lastPick, t.lastPickHint)}
                    {numberField("reviewSeconds", t.review, t.reviewHint)}
                    <div className="flex items-center justify-between gap-4">
                        <div className="grid gap-1">
                            <Label htmlFor="deckBuilding">{t.build}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t.buildHint}
                            </p>
                        </div>
                        <Switch
                            id="deckBuilding"
                            checked={config.deckBuilding}
                            onCheckedChange={(v) => set("deckBuilding", v)}
                        />
                    </div>
                    {config.deckBuilding &&
                        numberField(
                            "deckBuildingMinutes",
                            t.buildMinutes,
                            undefined,
                            "min"
                        )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Audio</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="grid gap-1.5">
                        <Label htmlFor="locale">{t.language}</Label>
                        <select
                            id="locale"
                            className="h-11 rounded-lg border border-input bg-background px-3 text-base"
                            value={config.locale}
                            onChange={(e) => {
                                set("locale", e.target.value as Locale);
                                onVoiceChange(null);
                            }}
                        >
                            <option value="it">Italiano</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div className="grid gap-1.5">
                        <Label htmlFor="voice">{t.voice}</Label>
                        <select
                            id="voice"
                            className="h-11 rounded-lg border border-input bg-background px-3 text-base"
                            value={voiceURI ?? ""}
                            onChange={(e) =>
                                onVoiceChange(e.target.value || null)
                            }
                        >
                            <option value="">{t.voiceDefault}</option>
                            {localeVoices.map((v) => (
                                <option key={v.voiceURI} value={v.voiceURI}>
                                    {v.name}
                                </option>
                            ))}
                        </select>
                        {voices.length > 0 && localeVoices.length === 0 && (
                            <p className="text-xs text-muted-foreground">
                                {t.voiceMissing}
                            </p>
                        )}
                        {showVoiceTip && (
                            <p className="text-xs text-muted-foreground">
                                {t.voiceTip}
                            </p>
                        )}
                    </div>
                    <Button
                        variant="outline"
                        size="lg"
                        onClick={() =>
                            onTestVoice(
                                stepAnnouncement(
                                    schedule[1],
                                    config.locale,
                                    config.packs
                                )
                            )
                        }
                    >
                        <Volume2 data-icon="inline-start" />
                        {t.testVoice}
                    </Button>
                </CardContent>
            </Card>

            <Button size="lg" className="mt-2 h-14 text-lg" onClick={onStart}>
                <Play data-icon="inline-start" />
                {t.start}
            </Button>
            <Button variant="ghost" size="sm" onClick={onReset}>
                <RotateCcw data-icon="inline-start" />
                {t.reset}
            </Button>
        </main>
    );
}
