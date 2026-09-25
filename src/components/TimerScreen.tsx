import { useState } from "react";
import {
    ChevronsRight,
    Pause,
    Play,
    RotateCcw,
    Volume2,
    VolumeX,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DraftEngineHandle } from "@/hooks/useDraftEngine";
import { currentStep, nextStep, WARNING_SECONDS } from "@/lib/draft/engine";
import { stepAnnouncement, stepLabel, strings } from "@/lib/draft/messages";
import type { DraftConfig, Step } from "@/lib/draft/schedule";
import { formatClock } from "@/lib/format";
import { cn } from "@/lib/utils";

const UI = {
    it: {
        pause: "Pausa",
        resume: "Riprendi",
        skip: "Salta",
        back: "Indietro",
        exit: "Esci",
        confirmExit: "Conferma uscita",
        next: "Poi",
        paused: "IN PAUSA",
        finished: "Draft terminato",
        newDraft: "Nuovo draft",
        of: "di",
    },
    en: {
        pause: "Pause",
        resume: "Resume",
        skip: "Skip",
        back: "Back",
        exit: "Exit",
        confirmExit: "Confirm exit",
        next: "Next",
        paused: "PAUSED",
        finished: "Draft over",
        newDraft: "New draft",
        of: "of",
    },
};

const PHASE_COLOR: Record<Step["kind"], string> = {
    open: "text-phase-open",
    check: "text-phase-open",
    look: "text-phase-pick",
    draft: "text-phase-pass",
    "last-pick": "text-phase-pass",
    review: "text-phase-review",
    build: "text-phase-review",
    done: "text-foreground",
};

interface Props {
    config: DraftConfig;
    engine: DraftEngineHandle;
    muted: boolean;
    onToggleMuted(): void;
    onExit(): void;
}

export function TimerScreen({
    config,
    engine,
    muted,
    onToggleMuted,
    onExit,
}: Props) {
    const t = UI[config.locale];
    const labels = strings(config.locale).labels;
    const [confirmingExit, setConfirmingExit] = useState(false);

    const { state, remaining } = engine;
    const step = currentStep(state);
    const next = nextStep(state);
    const isPaused = state.status === "paused";
    const isFinished = state.status === "finished";
    const seconds = Math.ceil(remaining / 1000);
    const isWarning =
        state.status === "running" &&
        step.duration > WARNING_SECONDS &&
        seconds <= WARNING_SECONDS;
    const progress =
        step.duration > 0 ? 1 - remaining / (step.duration * 1000) : 1;

    const context = (() => {
        const packOf = `${labels.pack} ${step.pack} ${t.of} ${config.packs}`;
        switch (step.kind) {
            case "check":
            case "look":
            case "draft":
                return `${packOf} · ${labels.pick} ${step.pick} ${t.of} ${config.cardsPerPack} · ${labels.cardsLeft(step.cardsRemaining)}`;
            case "last-pick":
                return `${packOf} · ${labels.pick} ${step.pick} ${t.of} ${config.cardsPerPack}`;
            case "open":
            case "review":
                return packOf;
            case "build":
            case "done":
                return "";
        }
    })();

    const direction =
        step.kind === "open" ||
        step.kind === "check" ||
        step.kind === "look" ||
        step.kind === "draft"
            ? labels.direction[step.direction]
            : null;

    const exit = () => {
        if (isFinished || confirmingExit) {
            onExit();
        } else {
            setConfirmingExit(true);
            window.setTimeout(() => setConfirmingExit(false), 3000);
        }
    };

    return (
        <main
            className={cn(
                "flex min-h-full flex-col p-4 pb-[max(1rem,env(safe-area-inset-bottom))] transition-colors duration-500",
                isWarning && "bg-phase-warn/10"
            )}
            data-step-kind={step.kind}
            data-status={state.status}
        >
            <header className="flex items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">{context}</p>
                <div className="flex gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        aria-label={muted ? "Unmute" : "Mute"}
                        aria-pressed={muted}
                        onClick={onToggleMuted}
                    >
                        {muted ? <VolumeX /> : <Volume2 />}
                    </Button>
                    <Button
                        variant={confirmingExit ? "destructive" : "ghost"}
                        size={confirmingExit ? "default" : "icon"}
                        aria-label={confirmingExit ? undefined : t.exit}
                        onClick={exit}
                    >
                        <X />
                        {confirmingExit && t.confirmExit}
                    </Button>
                </div>
            </header>

            <section className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <h1
                    className={cn(
                        "text-2xl font-semibold tracking-tight",
                        PHASE_COLOR[step.kind]
                    )}
                >
                    {stepLabel(step, config.locale)}
                </h1>
                {direction && (
                    <p className="text-xl text-muted-foreground">{direction}</p>
                )}
                {isFinished ? (
                    <p className="text-6xl font-bold">🎉</p>
                ) : (
                    <p
                        className={cn(
                            "font-mono text-[clamp(6rem,38vw,14rem)] leading-none font-bold tabular-nums",
                            isWarning
                                ? "animate-pulse text-phase-warn"
                                : PHASE_COLOR[step.kind],
                            isPaused && "opacity-50"
                        )}
                        aria-live="off"
                        data-testid="clock"
                    >
                        {formatClock(remaining)}
                    </p>
                )}
                {isPaused && (
                    <p className="text-lg font-semibold tracking-widest text-muted-foreground">
                        {t.paused}
                    </p>
                )}
                <p className="max-w-sm text-balance text-muted-foreground">
                    {stepAnnouncement(step, config.locale, config.packs)}
                </p>
                {next && !isFinished && (
                    <p className="text-xs text-muted-foreground/70">
                        {t.next}: {stepLabel(next, config.locale)}
                        {next.duration > 0 && ` · ${next.duration} s`}
                    </p>
                )}
            </section>

            {!isFinished && (
                <div
                    className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                >
                    <div
                        className={cn(
                            "h-full bg-current transition-[width] duration-200 ease-linear",
                            isWarning
                                ? "text-phase-warn"
                                : PHASE_COLOR[step.kind]
                        )}
                        style={{ width: `${progress * 100}%` }}
                    />
                </div>
            )}

            <footer className="grid grid-cols-3 gap-2">
                {isFinished ? (
                    <Button
                        size="lg"
                        className="col-span-3 h-14 text-lg"
                        onClick={onExit}
                    >
                        {t.newDraft}
                    </Button>
                ) : (
                    <>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14"
                            onClick={engine.back}
                        >
                            <RotateCcw data-icon="inline-start" />
                            {t.back}
                        </Button>
                        <Button
                            size="lg"
                            className="h-14 text-base"
                            onClick={isPaused ? engine.resume : engine.pause}
                        >
                            {isPaused ? (
                                <Play data-icon="inline-start" />
                            ) : (
                                <Pause data-icon="inline-start" />
                            )}
                            {isPaused ? t.resume : t.pause}
                        </Button>
                        <Button
                            variant="outline"
                            size="lg"
                            className="h-14"
                            onClick={engine.skip}
                        >
                            {t.skip}
                            <ChevronsRight data-icon="inline-end" />
                        </Button>
                    </>
                )}
            </footer>
        </main>
    );
}
