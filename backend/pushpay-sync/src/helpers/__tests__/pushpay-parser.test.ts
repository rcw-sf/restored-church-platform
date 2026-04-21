import { describe, it, expect } from "vitest";
import { parseIndividuals } from "../pushpay-parser.js";

describe("parseIndividuals", () => {
  it("should parse multiple individuals correctly into an array", () => {
    const xml = `
      <ccb_api>
        <response>
          <individuals count="2">
            <individual id="1001">
              <first_name>John</first_name>
              <last_name>Doe</last_name>
              <email>john@example.com</email>
            </individual>
            <individual id="1002">
              <first_name>Jane</first_name>
              <last_name>Smith</last_name>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    const result = parseIndividuals(xml);

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      id: "1001",
      first_name: "John",
      last_name: "Doe",
      email: "john@example.com",
    });
    expect(result[1]).toMatchObject({
      id: "1002",
      first_name: "Jane",
      last_name: "Smith",
    });
  });

  it("should handle a single individual correctly (as an array)", () => {
    const xml = `
      <ccb_api>
        <response>
          <individuals count="1">
            <individual id="1001">
              <first_name>John</first_name>
            </individual>
          </individuals>
        </response>
      </ccb_api>
    `;

    const result = parseIndividuals(xml);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0].first_name).toBe("John");
  });

  it("should return an empty array when no individuals are found", () => {
    const xml = `
      <ccb_api>
        <response>
          <individuals count="0" />
        </response>
      </ccb_api>
    `;

    const result = parseIndividuals(xml);
    expect(result).toEqual([]);
  });

  it("should handle missing ccb_api structure gracefully", () => {
    const xml = "<wrong_tag>data</wrong_tag>";

    const result = parseIndividuals(xml);
    expect(result).toEqual([]);
  });
});
