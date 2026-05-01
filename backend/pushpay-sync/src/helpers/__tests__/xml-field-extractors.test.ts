import { describe, it, expect } from "vitest";
import {
  normalizeArray,
  extractTextValue,
  getTextFromFields,
  getSelectFromFields,
  getSuperRegion,
  getNormalizedRegion,
} from "../xml-field-extractors.js";

describe("normalizeArray", () => {
  it("should return empty array for undefined", () => {
    expect(normalizeArray(undefined)).toEqual([]);
  });

  it("should return empty array for null", () => {
    expect(normalizeArray(null as unknown as undefined)).toEqual([]);
  });

  it("should wrap single object in array", () => {
    const single = { id: "1" };
    expect(normalizeArray(single)).toEqual([single]);
  });

  it("should return array unchanged", () => {
    const arr = [{ id: "1" }, { id: "2" }];
    expect(normalizeArray(arr)).toEqual(arr);
  });
});

describe("extractTextValue", () => {
  it("should return string directly", () => {
    expect(extractTextValue("100")).toBe("100");
  });

  it("should extract #text from object", () => {
    expect(extractTextValue({ "#text": "100" })).toBe("100");
  });

  it("should return undefined for undefined", () => {
    expect(extractTextValue(undefined)).toBeUndefined();
  });

  it("should return undefined for object without #text", () => {
    expect(extractTextValue({})).toBeUndefined();
  });
});

describe("getTextFromFields", () => {
  it("should find field by label with direct string text", () => {
    const fields = [{ label: "Pledge", text: "100" }];
    expect(getTextFromFields(fields, "Pledge")).toBe("100");
  });

  it("should find field by label with #text object", () => {
    const fields = [{ label: "Pledge", text: { "#text": "100" } }];
    expect(getTextFromFields(fields, "Pledge")).toBe("100");
  });

  it("should return undefined when field not found", () => {
    const fields = [{ label: "Other", text: "value" }];
    expect(getTextFromFields(fields, "Pledge")).toBeUndefined();
  });

  it("should return undefined for empty fields", () => {
    expect(getTextFromFields([], "Pledge")).toBeUndefined();
  });
});

describe("getSelectFromFields", () => {
  it("should extract selection #text", () => {
    const fields = [
      { label: "Region", selection: { "#text": "San Mateo", id: "1" } },
    ];
    expect(getSelectFromFields(fields, "Region")).toBe("San Mateo");
  });

  it("should return undefined when field not found", () => {
    const fields = [{ label: "Other", selection: { "#text": "value" } }];
    expect(getSelectFromFields(fields, "Region")).toBeUndefined();
  });
});

describe("getSuperRegion", () => {
  it("should return Peninsula for San Mateo", () => {
    expect(getSuperRegion("San Mateo")).toBe("Peninsula");
  });

  it("should return Peninsula for San Francisco", () => {
    expect(getSuperRegion("San Francisco")).toBe("Peninsula");
  });

  it("should return South Bay for Silicon Valley", () => {
    expect(getSuperRegion("Silicon Valley")).toBe("South Bay");
  });

  it("should return South Bay for San Jose", () => {
    expect(getSuperRegion("San Jose")).toBe("South Bay");
  });

  it("should return East Bay for Berkeley", () => {
    expect(getSuperRegion("Berkeley")).toBe("East Bay");
  });

  it("should return East Bay for Contra Costa", () => {
    expect(getSuperRegion("Contra Costa")).toBe("East Bay");
  });

  it("should return East Bay for Hayward", () => {
    expect(getSuperRegion("Hayward")).toBe("East Bay");
  });

  it("should return East Bay for Outer East", () => {
    expect(getSuperRegion("Outer East")).toBe("East Bay");
  });

  it("should return empty string for undefined", () => {
    expect(getSuperRegion(undefined)).toBe("");
  });

  it("should return empty string for unknown region", () => {
    expect(getSuperRegion("Unknown")).toBe("");
  });
});

describe("getNormalizedRegion", () => {
  it("should normalize South Bay to San Jose", () => {
    expect(getNormalizedRegion("South Bay")).toBe("San Jose");
  });

  it("should normalize Santa Cruz to San Jose", () => {
    expect(getNormalizedRegion("Santa Cruz")).toBe("San Jose");
  });

  it("should normalize Outer East to Contra Costa", () => {
    expect(getNormalizedRegion("Outer East")).toBe("Contra Costa");
  });

  it("should return region unchanged for others", () => {
    expect(getNormalizedRegion("San Mateo")).toBe("San Mateo");
    expect(getNormalizedRegion("Berkeley")).toBe("Berkeley");
  });

  it("should return empty string for undefined", () => {
    expect(getNormalizedRegion(undefined)).toBe("");
  });
});
