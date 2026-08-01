import { XMLParser } from "fast-xml-parser";
import { PushpayIndividual } from "../types/pushpay.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
  isArray: (name) => name === "individual",
  parseAttributeValue: false,
  parseTagValue: false,
});

export function parseIndividuals(xml: string): PushpayIndividual[] {
  const json = parser.parse(xml);

  // Some endpoints put <individuals> inside <response>, others put it directly under <ccb_api>
  const individuals =
    json.ccb_api?.response?.individuals?.individual ||
    json.ccb_api?.individuals?.individual ||
    [];

  return individuals;
}
