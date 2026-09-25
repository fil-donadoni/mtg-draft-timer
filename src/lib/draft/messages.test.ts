import { describe, expect, it } from "vitest";
import {
    milestoneAnnouncement,
    stepAnnouncement,
    stepLabel,
    warningAnnouncement,
} from "./messages";
import { buildSchedule, DEFAULT_CONFIG } from "./schedule";

describe("stepAnnouncement (it)", () => {
    const steps = buildSchedule(DEFAULT_CONFIG);
    const say = (i: number) => stepAnnouncement(steps[i], "it", 3);

    it("welcomes, opens the first pack, counts and gives the direction", () => {
        expect(say(0)).toBe(
            "Benvenuti al draft. Aprite la prima busta, contate le carte a faccia in giù e togliete i token. Controllate di avere 14 carte. Questa busta si passa a sinistra."
        );
    });

    it("says how long players may look", () => {
        expect(say(1)).toBe("Potete guardare, avete 40 secondi.");
    });

    it("calls draft when time is up", () => {
        expect(say(2)).toBe("Draft.");
    });

    it("asks to check the count after each pass", () => {
        expect(say(3)).toBe("Controllate di avere 13 carte.");
    });

    it("has the last card checked and taken", () => {
        const last = steps.find((s) => s.kind === "last-pick")!;
        expect(stepAnnouncement(last, "it", 3)).toBe(
            "Controllate di avere una carta e prendetela."
        );
    });

    it("announces the review with its length", () => {
        const review = steps.find((s) => s.kind === "review")!;
        expect(stepAnnouncement(review, "it", 3)).toBe(
            "Fine della busta 1. Periodo di revisione: 60 secondi."
        );
    });

    it("marks the last pack and its direction when opening it", () => {
        const open3 = steps.find((s) => s.kind === "open" && s.pack === 3)!;
        expect(stepAnnouncement(open3, "it", 3)).toMatch(
            /^Aprite la busta 3, l'ultima, .* si passa a sinistra\.$/
        );
        const open2 = steps.find((s) => s.kind === "open" && s.pack === 2)!;
        expect(stepAnnouncement(open2, "it", 3)).toMatch(/si passa a destra/);
    });

    it("opens deck building with the MTR minutes and closes it", () => {
        const build = steps.find((s) => s.kind === "build")!;
        expect(stepAnnouncement(build, "it", 3)).toBe(
            "Draft concluso. Avete 25 minuti per registrare e costruire il mazzo."
        );
        expect(stepAnnouncement(steps.at(-1)!, "it", 3)).toBe(
            "Tempo scaduto. Consegnate le liste. Buona partita."
        );
        expect(milestoneAnnouncement(300, "it")).toBe("5 minuti.");
        expect(milestoneAnnouncement(60, "it")).toBe("Un minuto.");
    });

    it("has a ten-second warning", () => {
        expect(warningAnnouncement("it")).toBe("Dieci secondi.");
        expect(warningAnnouncement("en")).toBe("Ten seconds.");
    });
});

describe("stepLabel", () => {
    it("is short and localized", () => {
        const steps = buildSchedule(DEFAULT_CONFIG);
        expect(stepLabel(steps[0], "it")).toBe("Apertura busta 1");
        expect(stepLabel(steps[1], "en")).toBe("Pick 1");
        expect(stepLabel(steps[2], "it")).toBe("Draft");
        expect(stepLabel(steps[3], "it")).toBe("Conteggio");
        expect(stepLabel(steps.at(-1)!, "it")).toBe("Draft terminato");
    });
});
