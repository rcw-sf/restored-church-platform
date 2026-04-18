import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      root: dirname,
      environment: "jsdom",
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
          "src/main.tsx",
          "src/vite-env.d.ts",
          "App.tsx",
          "types/",
          "src/lib",
        ],
        thresholds: {
          lines: 85,
          functions: 80,
          branches: 60,
          statements: 70,
        },
      },
    },
  }),
);
