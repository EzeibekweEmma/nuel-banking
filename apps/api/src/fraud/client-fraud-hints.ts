import { ClientFraudHints } from "./fraud.types";

const MAXIMUM_DEVICE_HINT_LENGTH = 128;
const MAXIMUM_LOCATION_HINT_LENGTH = 100;
const DEVICE_HINT_PATTERN = /^[a-zA-Z0-9._:-]+$/;

function containsControlCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
}

export function createClientFraudHints(
  deviceFingerprintHeader?: string,
  locationHeader?: string,
): ClientFraudHints {
  const deviceFingerprintHint = deviceFingerprintHeader?.trim();
  const locationHint = locationHeader?.trim().replace(/\s+/g, " ");

  return {
    source: "CLIENT_HEADERS",
    deviceFingerprintHint:
      deviceFingerprintHint &&
      deviceFingerprintHint.length <= MAXIMUM_DEVICE_HINT_LENGTH &&
      DEVICE_HINT_PATTERN.test(deviceFingerprintHint)
        ? deviceFingerprintHint
        : undefined,
    locationHint:
      locationHint &&
      locationHint.length <= MAXIMUM_LOCATION_HINT_LENGTH &&
      !containsControlCharacter(locationHint)
        ? locationHint
        : undefined,
  };
}
