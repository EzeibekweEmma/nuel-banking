import { FraudDecision, FraudRiskLevel } from "@prisma/client";
import { FraudService } from "./fraud.service";

describe("FraudService", () => {
  const tx = {
    transaction: { aggregate: jest.fn(), count: jest.fn() },
    device: { findUnique: jest.fn(), findFirst: jest.fn() },
  };
  const service = new FraudService();
  beforeEach(() => {
    jest.clearAllMocks();
    tx.transaction.aggregate.mockResolvedValue({ _avg: { amount: null } });
    tx.transaction.count.mockResolvedValue(0);
    tx.device.findUnique.mockResolvedValue({});
    tx.device.findFirst.mockResolvedValue(null);
  });
  it("classifies ordinary activity as LOW", async () => {
    const result = await service.assess(tx as never, "user", "account", 100, {
      source: "CLIENT_HEADERS",
    });
    expect(result.riskLevel).toBe(FraudRiskLevel.LOW);
    expect(result.decision).toBe(FraudDecision.APPROVE);
  });
  it("classifies combined indicators as MEDIUM", async () => {
    tx.transaction.aggregate.mockResolvedValue({
      _avg: { amount: { toNumber: () => 10 } },
    });
    tx.device.findUnique.mockResolvedValue(null);
    const result = await service.assess(tx as never, "user", "account", 100, {
      source: "CLIENT_HEADERS",
      deviceFingerprintHint: "new-device",
    });
    expect(result.riskLevel).toBe(FraudRiskLevel.MEDIUM);
    expect(result.decision).toBe(FraudDecision.VERIFY);
  });
  it("classifies multiple indicators as HIGH", async () => {
    tx.transaction.aggregate.mockResolvedValue({
      _avg: { amount: { toNumber: () => 10 } },
    });
    tx.device.findUnique.mockResolvedValue(null);
    tx.device.findFirst.mockResolvedValue({});
    tx.transaction.count.mockResolvedValue(3);
    const result = await service.assess(tx as never, "user", "account", 100, {
      source: "CLIENT_HEADERS",
      deviceFingerprintHint: "new-device",
      locationHint: "Lagos",
    });
    expect(result.riskLevel).toBe(FraudRiskLevel.HIGH);
    expect(result.decision).toBe(FraudDecision.HOLD);
  });
});
