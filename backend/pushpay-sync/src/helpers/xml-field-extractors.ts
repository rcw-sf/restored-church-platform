/**
 * XML Field Extractors
 *
 * Helper functions to safely extract values from fast-xml-parser output.
 * The parser returns different structures depending on whether elements
 * have attributes, child elements, or text content.
 */

/**
 * Normalizes a potentially single-element XML array to always return an array.
 * XML parser returns a single object instead of array when there's only one element.
 * Also handles empty strings when parent element has no children.
 */
export function normalizeArray<T>(value: T | T[] | undefined | string): T[] {
  if (value === undefined || value === null || typeof value === "string") {
    return [];
  }
  return Array.isArray(value) ? value : [value];
}

/**
 * Safely extracts a child array from an XML parent element.
 * Handles cases where parent might be empty string or undefined.
 */
export function extractXmlArray<T>(
  parent: Record<string, unknown> | string | undefined,
  childKey: string,
): T[] {
  if (!parent || typeof parent === "string") {
    return [];
  }
  return normalizeArray<T>(parent[childKey] as T | T[] | undefined);
}

/**
 * Extracts text value from XML field that may be either:
 * - A direct string: "value"
 * - An object with #text property: { "#text": "value" }
 * - Undefined
 */
export function extractTextValue(
  value: string | { "#text"?: string } | undefined,
): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  return value?.["#text"];
}

/**
 * Finds a field by label in an array of XML fields and extracts its text value.
 */
export function getTextFromFields(
  fields: Array<{ label?: string; text?: string | { "#text"?: string } }>,
  label: string,
): string | undefined {
  const field = fields.find((f) => f.label === label);
  return extractTextValue(field?.text);
}

/**
 * Finds a field by label in an array of XML pulldown fields and extracts
 * the selection's #text value.
 */
export function getSelectFromFields(
  fields: Array<{
    label?: string;
    selection?: { "#text"?: string };
  }>,
  label: string,
): string | undefined {
  const field = fields.find((f) => f.label === label);
  return field?.selection?.["#text"];
}

/**
 * Determines super region based on region name.
 */
export function getSuperRegion(region: string | undefined): string {
  if (!region) return "";

  switch (region) {
    case "San Mateo":
    case "San Francisco":
      return "Peninsula";
    case "Silicon Valley":
    case "San Jose":
      return "South Bay";
    case "South Bay":
    case "Santa Cruz":
      return "South Bay";
    case "Berkeley":
    case "Contra Costa":
    case "Hayward":
      return "East Bay";
    case "Outer East":
      return "East Bay";
    default:
      return "";
  }
}

/**
 * Determines the actual region name, with fallback logic for special cases.
 */
export function getNormalizedRegion(region: string | undefined): string {
  if (!region) return "";

  // South Bay and Santa Cruz are grouped under San Jose
  if (region === "South Bay" || region === "Santa Cruz") {
    return "San Jose";
  }

  // Outer East is grouped under Contra Costa
  if (region === "Outer East") {
    return "Contra Costa";
  }

  return region;
}
