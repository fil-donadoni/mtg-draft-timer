import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// https://vite.dev/config/
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
});
