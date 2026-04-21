import { vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

vi.mock("firebase-admin", () => ({
  initializeApp: vi.fn(),
  firestore: vi.fn(),
}));
