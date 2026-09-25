import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

// base-ui defers popup unmount until exit animations settle; with no real
// animation under happy-dom that deferral can strand portal nodes across
// tests. The flag makes the unmount synchronous.
(
    globalThis as { BASE_UI_ANIMATIONS_DISABLED?: boolean }
).BASE_UI_ANIMATIONS_DISABLED = true;

afterEach(() => {
    cleanup();
});
