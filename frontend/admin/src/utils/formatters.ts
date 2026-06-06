import { parseIncompletePhoneNumber, AsYouType } from "libphonenumber-js";
import { DateTime } from "luxon";

export const formatPhone = (input: string): string => {
  if (!input) return "";

  const clean = parseIncompletePhoneNumber(input);
  if (!clean) return "";

  // Check if it's a US number with a country code (starting with +1 or 1 followed by 10 digits)
  let isUSWithCountryCode = false;
  let nationalPart = clean;

  if (clean.startsWith("+1")) {
    isUSWithCountryCode = true;
    nationalPart = clean.slice(2);
  } else if (clean.startsWith("1") && clean.length > 10) {
    isUSWithCountryCode = true;
    nationalPart = clean.slice(1);
  }

  // For US numbers with country code, format the national part with US layout
  // and prepend the "+1 " country code to preserve parentheses.
  if (isUSWithCountryCode) {
    const formattedNational = new AsYouType("US").input(nationalPart);
    return formattedNational ? `+1 ${formattedNational}` : "+1";
  }

  // For other international numbers (starts with '+' or longer than 10 digits without '1' prefix)
  let parseString = clean;
  if (!parseString.startsWith("+") && parseString.length > 10) {
    parseString = "+" + parseString;
  }

  if (parseString.startsWith("+")) {
    const formatter = new AsYouType();
    return formatter.input(parseString);
  }

  // Default to US formatting for national numbers
  const formatter = new AsYouType("US");
  return formatter.input(clean);
};

export const getLocalIsoDate = (baseDate: Date = new Date()) => {
  return DateTime.fromJSDate(baseDate, { zone: "local" }).toFormat(
    "yyyy-MM-dd",
  );
};

export const removeUndefinedFields = <T extends Record<string, unknown>>(
  obj: T,
): Partial<T> => {
  const newObj: Partial<T> = {};
  Object.keys(obj).forEach((key) => {
    const typedKey = key as keyof T;
    if (obj[typedKey] !== undefined) {
      newObj[typedKey] = obj[typedKey];
    }
  });
  return newObj;
};
