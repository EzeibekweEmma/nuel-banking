import { FraudDecision, FraudRiskLevel, Prisma } from '@prisma/client';

export interface FraudContext { deviceFingerprint?: string; location?: string; }
export interface FraudResult { riskScore: number; riskLevel: FraudRiskLevel; decision: FraudDecision; reasons: string[]; }
export const FRAUD_WEIGHTS = { unusualAmount: 30, newDevice: 20, unusualLocation: 20, highFrequency: 20, unusualTime: 10 } as const;
export const FRAUD_THRESHOLDS = { medium: 40, high: 70, frequencyWindowMinutes: 10, frequencyLimit: 3, unusualAmountMultiplier: 3 } as const;
export type FraudTransactionClient = Prisma.TransactionClient;
