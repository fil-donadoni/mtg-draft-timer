import type { Locale, Step } from "./schedule";
import type { PassDirection } from "./timing";

interface Strings {
    open: (
        pack: number,
        packs: number,
        cards: number,
        direction: PassDirection
    ) => string;
    check: (cards: number) => string;
    look: (seconds: number) => string;
    draft: string;
    lastPick: string;
    review: (pack: number, seconds: number) => string;
    build: (minutes: number) => string;
    done: (afterBuild: boolean) => string;
    warning: string;
    minutesLeft: (minutes: number) => string;
    /** Short on-screen labels. */
    labels: {
        open: string;
        check: string;
        pick: string;
        draft: string;
        lastPick: string;
        review: string;
        build: string;
        done: string;
        pack: string;
        cardsLeft: (n: number) => string;
        direction: Record<PassDirection, string>;
    };
}

const STRINGS: Record<Locale, Strings> = {
    it: {
        open: (pack, packs, cards, direction) => {
            const which =
                pack === 1
                    ? "Benvenuti al draft. Aprite la prima busta"
                    : `Aprite la busta ${pack}${pack === packs ? ", l'ultima" : ""}`;
            const side = direction === "left" ? "sinistra" : "destra";
            return `${which}, contate le carte a faccia in giù e togliete i token. Controllate di avere ${cards} carte. Questa busta si passa a ${side}.`;
        },
        check: (cards) => `Controllate di avere ${cards} carte.`,
        look: (seconds) => `Potete guardare, avete ${seconds} secondi.`,
        draft: "Draft.",
        lastPick: "Controllate di avere una carta e prendetela.",
        review: (pack, seconds) =>
            `Fine della busta ${pack}. Periodo di revisione: ${seconds} secondi.`,
        build: (minutes) =>
            `Draft concluso. Avete ${minutes} minuti per registrare e costruire il mazzo.`,
        done: (afterBuild) =>
            afterBuild
                ? "Tempo scaduto. Consegnate le liste. Buona partita."
                : "Il draft è terminato. Buona costruzione del mazzo.",
        warning: "Dieci secondi.",
        minutesLeft: (minutes) =>
            minutes === 1 ? "Un minuto." : `${minutes} minuti.`,
        labels: {
            open: "Apertura busta",
            check: "Conteggio",
            pick: "Pick",
            draft: "Draft",
            lastPick: "Ultima carta",
            review: "Revisione",
            build: "Costruzione",
            done: "Draft terminato",
            pack: "Busta",
            cardsLeft: (n) => (n === 1 ? "1 carta" : `${n} carte`),
            direction: { left: "← Sinistra", right: "Destra →" },
        },
    },
    en: {
        open: (pack, packs, cards, direction) => {
            const which =
                pack === 1
                    ? "Welcome to the draft. Open your first pack"
                    : `Open pack ${pack}${pack === packs ? ", the last one" : ""}`;
            return `${which}, count the cards face down and remove any tokens. Check that you have ${cards} cards. This pack passes to the ${direction}.`;
        },
        check: (cards) => `Check that you have ${cards} cards.`,
        look: (seconds) => `You may look, you have ${seconds} seconds.`,
        draft: "Draft.",
        lastPick: "Check that you have one card and take it.",
        review: (pack, seconds) =>
            `End of pack ${pack}. Review period: ${seconds} seconds.`,
        build: (minutes) =>
            `Draft complete. You have ${minutes} minutes to register and build your deck.`,
        done: (afterBuild) =>
            afterBuild
                ? "Time is up. Hand in your deck lists. Good luck."
                : "The draft is over. Happy deck building.",
        warning: "Ten seconds.",
        minutesLeft: (minutes) =>
            minutes === 1 ? "One minute." : `${minutes} minutes.`,
        labels: {
            open: "Open pack",
            check: "Count",
            pick: "Pick",
            draft: "Draft",
            lastPick: "Last card",
            review: "Review",
            build: "Deck building",
            done: "Draft over",
            pack: "Pack",
            cardsLeft: (n) => (n === 1 ? "1 card" : `${n} cards`),
            direction: { left: "← Left", right: "Right →" },
        },
    },
};

export function strings(locale: Locale): Strings {
    return STRINGS[locale];
}

/** The judge's spoken line when `step` begins. */
export function stepAnnouncement(
    step: Step,
    locale: Locale,
    packs: number
): string {
    const s = STRINGS[locale];
    switch (step.kind) {
        case "open":
            return s.open(
                step.pack,
                packs,
                step.cardsRemaining,
                step.direction
            );
        case "check":
            return s.check(step.cardsRemaining);
        case "look":
            return s.look(step.duration);
        case "draft":
            return s.draft;
        case "last-pick":
            return s.lastPick;
        case "review":
            return s.review(step.pack, step.duration);
        case "build":
            return s.build(Math.round(step.duration / 60));
        case "done":
            return s.done(step.afterBuild);
    }
}

export function warningAnnouncement(locale: Locale): string {
    return STRINGS[locale].warning;
}

/** "Five minutes." — spoken at the construction clock's milestones. */
export function milestoneAnnouncement(seconds: number, locale: Locale): string {
    return STRINGS[locale].minutesLeft(Math.round(seconds / 60));
}

/** Short on-screen title for a step. */
export function stepLabel(step: Step, locale: Locale): string {
    const l = STRINGS[locale].labels;
    switch (step.kind) {
        case "open":
            return `${l.open} ${step.pack}`;
        case "check":
            return l.check;
        case "look":
            return `${l.pick} ${step.pick}`;
        case "draft":
            return l.draft;
        case "last-pick":
            return l.lastPick;
        case "review":
            return l.review;
        case "build":
            return l.build;
        case "done":
            return l.done;
    }
}
