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
  return json.ccb_api?.response?.individuals?.individual || [];
}
