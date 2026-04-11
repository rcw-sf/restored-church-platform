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
      environment: "node",
      include: ["src/**/__tests__/**/*.test.{ts,tsx}"],
      reporters: ["default", "github-actions"],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "json"],
        reportsDirectory: "./coverage",
        reportOnFailure: true,
        include: ["src/utils/**/*.ts"],
        exclude: ["**/__tests__/**"],
        thresholds: {
          lines: 95,
          functions: 100,
          branches: 90,
          statements: 95,
        },
      },
    },
  }),
);
