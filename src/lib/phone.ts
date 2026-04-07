export const phoneCountryCodes = [
  { value: "+1", label: "US +1" },
  { value: "+44", label: "UK +44" },
  { value: "+971", label: "AE +971" },
  { value: "+966", label: "SA +966" },
  { value: "+20", label: "EG +20" },
  { value: "+91", label: "IN +91" },
  { value: "+92", label: "PK +92" },
  { value: "+61", label: "AU +61" },
  { value: "+49", label: "DE +49" },
  { value: "+33", label: "FR +33" },
] as const;

const defaultPhoneCountryCode = phoneCountryCodes[0].value;

export function splitStoredPhoneNumber(value?: string | null) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) {
    return { countryCode: defaultPhoneCountryCode, localNumber: "" };
  }

  const matched = [...phoneCountryCodes]
    .sort((left, right) => right.value.length - left.value.length)
    .find((option) => trimmed.startsWith(option.value));

  if (!matched) {
    return { countryCode: defaultPhoneCountryCode, localNumber: trimmed.replace(/[^\d]/g, "") };
  }

  const localNumber = trimmed.slice(matched.value.length).trim().replace(/[^\d]/g, "");
  return {
    countryCode: matched.value,
    localNumber,
  };
}

export function normalizePhoneForStorage(countryCode: string, localNumber: string) {
  const normalized = localNumber.replace(/[^\d]/g, "");
  return normalized ? `${countryCode} ${normalized}` : null;
}

export function normalizePhoneForMfa(countryCode: string, localNumber: string) {
  const normalized = localNumber.replace(/[^\d]/g, "");
  return normalized ? `${countryCode}${normalized}` : null;
}

export function isValidPhoneDigits(localNumber: string) {
  const normalized = localNumber.replace(/[^\d]/g, "");
  return normalized.length >= 6 && normalized.length <= 14;
}
