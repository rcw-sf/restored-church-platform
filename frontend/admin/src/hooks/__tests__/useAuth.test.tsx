import { renderHook } from "@testing-library/react";
import type { User } from "firebase/auth";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../../context/AuthContext";
import { useAuth } from "../useAuth";

describe("useAuth", () => {
  it("should return the context value when used within an AuthProvider", () => {
    const mockContextValue = {
      loading: false,
      isAuthorized: true,
      role: "admin" as const,
      user: { email: "test@restoredchurch.com" } as User,
      login: vi.fn(),
      logout: vi.fn(),
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider value={mockContextValue}>
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current).toEqual(mockContextValue);
  });

  it("should throw an error when used outside of an AuthProvider", () => {
    // Suppress console.error for this test to keep output clean
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useAuth())).toThrow(
      "useAuth must be used within an AuthProvider",
    );

    consoleSpy.mockRestore();
  });
});
