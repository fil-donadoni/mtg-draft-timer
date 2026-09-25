import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { Announcer, BeepKind } from "@/lib/audio/announcer";

// `fireEvent`, not `@testing-library/user-event`: user-event's internal
// waits deadlock under vitest fake timers (measured, even with
// `advanceTimers` wired), and this suite needs to fast-forward a draft.

function fakeAnnouncer() {
    const spoken: string[] = [];
    const beeps: BeepKind[] = [];
    const announcer: Announcer = {
        speak: (text) => {
            spoken.push(text);
        },
        beep: (kind) => {
            beeps.push(kind);
        },
        unlock: vi.fn(async () => {}),
        setMuted: vi.fn(),
        configure: vi.fn(),
    };
    return { announcer, spoken, beeps };
}

const click = (name: RegExp | string) =>
    act(async () => {
        fireEvent.click(screen.getByRole("button", { name }));
    });

const setNumber = (label: RegExp, value: string) =>
    act(async () => {
        const input = screen.getByLabelText(label);
        fireEvent.change(input, { target: { value } });
        fireEvent.blur(input);
    });

const elapse = (ms: number) =>
    act(async () => {
        vi.advanceTimersByTime(ms);
    });

describe("App", () => {
    beforeEach(() => {
        localStorage.clear();
        // Only the timers the app uses: happy-dom schedules its own work on
        // microtasks/immediates and deadlocks if those are faked too.
        vi.useFakeTimers({
            toFake: [
                "setTimeout",
                "clearTimeout",
                "setInterval",
                "clearInterval",
                "Date",
            ],
        });
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it("runs the judge script from setup through the first picks", async () => {
        const { announcer, spoken, beeps } = fakeAnnouncer();
        render(<App announcer={announcer} />);

        // Tighten the schedule so the test stays short.
        await setNumber(/Apertura busta/, "5");
        await click(/Inizia il draft/);

        expect(announcer.unlock).toHaveBeenCalled();
        expect(spoken.at(-1)).toMatch(
            /^Benvenuti al draft.*14 carte.*sinistra\.$/
        );
        expect(screen.getByTestId("clock")).toHaveTextContent("5");
        expect(screen.getByText("Apertura busta 1")).toBeInTheDocument();

        // Open period elapses → "you may look", 40 s (14-card pack).
        await elapse(5_200);
        expect(spoken.at(-1)).toBe("Potete guardare, avete 40 secondi.");
        expect(screen.getByText("Pick 1")).toBeInTheDocument();
        expect(screen.getByText("← Sinistra")).toBeInTheDocument();
        expect(screen.getByTestId("clock")).toHaveTextContent("40");

        // 10-second warning, then 3-2-1 beeps, then "draft".
        await elapse(30_200);
        expect(spoken.at(-1)).toBe("Dieci secondi.");
        await elapse(10_200);
        expect(beeps.filter((b) => b === "tick")).toHaveLength(3);
        expect(spoken.at(-1)).toBe("Draft.");
        expect(screen.getByText("Draft")).toBeInTheDocument();
        expect(screen.getByTestId("clock")).toHaveTextContent("5");

        // Pass window elapses → count check, then the 35 s look.
        await elapse(5_200);
        expect(spoken.at(-1)).toBe("Controllate di avere 13 carte.");
        expect(screen.getByText("Conteggio")).toBeInTheDocument();
        await elapse(4_200);
        expect(spoken.at(-1)).toBe("Potete guardare, avete 35 secondi.");
        expect(screen.getByText("Pick 2")).toBeInTheDocument();
    });

    it("pauses, resumes, skips and mutes", async () => {
        const { announcer, spoken } = fakeAnnouncer();
        render(<App announcer={announcer} />);
        await click(/Inizia il draft/);

        await click("Pausa");
        expect(screen.getByText("IN PAUSA")).toBeInTheDocument();
        const frozen = screen.getByTestId("clock").textContent!;
        await elapse(3_000);
        expect(screen.getByTestId("clock")).toHaveTextContent(frozen);

        await click("Riprendi");
        expect(screen.queryByText("IN PAUSA")).not.toBeInTheDocument();
        await elapse(1_000);
        expect(screen.getByTestId("clock")).toHaveTextContent("19");

        await click("Salta");
        expect(spoken.at(-1)).toBe("Potete guardare, avete 40 secondi.");

        await click("Mute");
        expect(announcer.setMuted).toHaveBeenLastCalledWith(true);
    });

    it("asks twice before leaving a running draft", async () => {
        const { announcer } = fakeAnnouncer();
        render(<App announcer={announcer} />);
        await click(/Inizia il draft/);

        await click("Esci");
        expect(screen.getByTestId("clock")).toBeInTheDocument();
        await click(/Conferma uscita/);
        expect(screen.queryByTestId("clock")).not.toBeInTheDocument();
        expect(
            screen.getByRole("button", { name: /Inizia il draft/ })
        ).toBeInTheDocument();
    });

    it("persists the configuration and clamps it on blur", async () => {
        const { announcer } = fakeAnnouncer();
        const { unmount } = render(<App announcer={announcer} />);
        await setNumber(/Carte per busta/, "15");
        await setNumber(/Buste/, "99");
        expect(screen.getByLabelText(/Buste/)).toHaveValue(6);
        unmount();

        render(<App announcer={announcer} />);
        expect(screen.getByLabelText(/Carte per busta/)).toHaveValue(15);
        expect(screen.getByLabelText(/Buste/)).toHaveValue(6);

        await click(/Ripristina predefiniti/);
        expect(screen.getByLabelText(/Carte per busta/)).toHaveValue(14);
        expect(screen.getByLabelText(/Apertura busta/)).toHaveValue(20);
    });
});
