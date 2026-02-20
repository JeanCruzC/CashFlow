import path from "path";
import { defineConfig } from "vitest/config";

const CRITICAL_MODULES = [
    "app/actions/onboarding.ts",
    "app/actions/transactions.ts",
    "lib/server/onboarding.ts",
];

export default defineConfig({
    esbuild: {
        jsx: "automatic",
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "."),
        },
    },
    test: {
        include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "lcov", "html", "json-summary"],
            reportsDirectory: "./coverage-critical",
            include: CRITICAL_MODULES,
            thresholds: {
                lines: 90,
                functions: 90,
                branches: 80,
                statements: 90,
                perFile: true,
            },
        },
    },
});
