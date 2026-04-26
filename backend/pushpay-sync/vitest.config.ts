import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root: dirname,
    silent: true,
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
    reporters: ["default", "github-actions", "junit"],
    outputFile: {
      junit: "./reports/junit.xml",
    },
    setupFiles: ["./vitest.setup.ts"],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary", "json"],
      reportsDirectory: "./coverage",
      reportOnFailure: true,
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "index.ts",
        "types/",
        "src/config",
        "src/env.ts",
      ],
      thresholds: {
        lines: 85,
        functions: 80,
        branches: 60,
        statements: 70,
      },
    },
  },
});
