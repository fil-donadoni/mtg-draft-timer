import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

export default defineConfig({
    resolve: {
        alias: [
            {
                find: "@",
                replacement: path.resolve(import.meta.dirname, "src"),
            },
        ],
    },
    plugins: [tailwindcss(), react()],
    test: {
        environment: "happy-dom",
        setupFiles: ["./vitest.setup.ts"],
        include: ["src/**/*.test.{ts,tsx}"],
    },
});
