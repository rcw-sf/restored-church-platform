import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});
