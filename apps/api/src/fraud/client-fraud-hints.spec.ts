import { createClientFraudHints } from "./client-fraud-hints";

describe("createClientFraudHints", () => {
  it("normalizes bounded client-provided hints", () => {
    expect(createClientFraudHints(" device-123 ", " Lagos,   NG ")).toEqual({
      source: "CLIENT_HEADERS",
      deviceFingerprintHint: "device-123",
      locationHint: "Lagos, NG",
    });
  });

  it("ignores malformed or oversized hints", () => {
    expect(createClientFraudHints("invalid value", "x".repeat(101))).toEqual({
      source: "CLIENT_HEADERS",
      deviceFingerprintHint: undefined,
      locationHint: undefined,
    });
  });
});
