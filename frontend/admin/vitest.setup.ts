import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { vi, beforeEach, afterEach } from "vitest";
import "vitest-canvas-mock";

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup();
});

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

global.ResizeObserver = ResizeObserver;

// Global Firebase mock to prevent "invalid-api-key" errors during tests
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(),
  getApp: vi.fn(),
  getApps: vi.fn(() => []),
}));

// Mock Firebase Auth
vi.mock("firebase/auth", () => ({
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  getAuth: vi.fn(),
}));

// Mock firebase/firestore functions
vi.mock("firebase/firestore", () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  getFirestore: vi.fn(),
}));
