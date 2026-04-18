import Toast from "@/components/ui/Toast";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Toast", () => {
  it("returns null if message is empty", () => {
    const { container } = render(<Toast message="" />);
    expect(container.firstChild).toBeNull();
  });

  it("renders success state", () => {
    render(<Toast message="Saved" />);
    const alert = screen.getByRole("alert");
    expect(alert.firstElementChild!).toHaveClass("alert-success");
    expect(screen.getByText("Saved")).toBeDefined();
  });

  it("renders error state", () => {
    render(<Toast message="Failed" isError={true} />);
    const alert = screen.getByRole("alert");
    const alertDiv = alert.classList.contains("alert")
      ? alert
      : alert.firstElementChild!;
    expect(alertDiv).toHaveClass("alert-error");
    expect(screen.getByText("Failed")).toBeDefined();
  });
});
