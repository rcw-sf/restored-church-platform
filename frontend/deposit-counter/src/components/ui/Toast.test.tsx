import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Toast from "@/components/ui/Toast";

describe("Toast", () => {
  it("returns null if message is empty", () => {
    const { container } = render(<Toast message="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders success state", () => {
    render(<Toast message="Saved" />);
    const alert = screen.getByRole("alert");
    expect(alert.classList.contains("alert-success") || alert.firstElementChild?.classList.contains("alert-success")).toBe(true);
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("renders error state", () => {
    render(<Toast message="Failed" isError={true} />);
    const alert = screen.getByRole("alert");
    expect(alert.classList.contains("alert-error") || alert.firstElementChild?.classList.contains("alert-error")).toBe(true);
    expect(screen.getByText("Failed")).toBeDefined();
  });
});