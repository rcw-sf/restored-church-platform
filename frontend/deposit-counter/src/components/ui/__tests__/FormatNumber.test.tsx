import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import FormatNumber from "@/components/ui/FormatNumber";

describe("FormatNumber", () => {
  it("renders formatted currency string", () => {
    const { container } = render(<FormatNumber value={100} />);
    // Matches currency format (e.g., $100.00)
    expect(container.textContent).toContain("$100.00");
  });

  it("renders decimals when requested", () => {
    const { container } = render(
      <FormatNumber value={0.25} minimumFractionDigits={2} />,
    );
    expect(container.textContent).toContain("$0.25");
  });

  it("renders as decimal style", () => {
    const { container } = render(
      <FormatNumber value={1234} style="decimal" />,
    );
    expect(container.textContent).toBe("1,234");
  });
});