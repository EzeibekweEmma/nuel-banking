import { Injectable } from '@nestjs/common';
import { FraudDecision, FraudRiskLevel, TransactionStatus } from '@prisma/client';
import { FRAUD_THRESHOLDS, FRAUD_WEIGHTS, FraudContext, FraudResult, FraudTransactionClient } from './fraud.types';

@Injectable()
export class FraudService {
  describeAssessment(assessment: { riskLevel: string; reasons: string[] } | null | undefined): string { return assessment ? `${assessment.riskLevel}${assessment.reasons.length ? ` (${assessment.reasons.join(', ')})` : ''}` : 'not assessed'; }
  async assess(tx: FraudTransactionClient, userId: string, sourceAccountId: string, amount: number, context: FraudContext): Promise<FraudResult> {
    let score = 0;
    const reasons: string[] = [];
    const summary = await tx.transaction.aggregate({ where: { sourceAccountId, status: TransactionStatus.COMPLETED }, _avg: { amount: true } });
    if (summary._avg.amount && amount > summary._avg.amount.toNumber() * FRAUD_THRESHOLDS.unusualAmountMultiplier) { score += FRAUD_WEIGHTS.unusualAmount; reasons.push('UNUSUAL_AMOUNT'); }
    if (context.deviceFingerprint) {
      const device = await tx.device.findUnique({ where: { userId_fingerprint: { userId, fingerprint: context.deviceFingerprint } } });
      if (!device) { score += FRAUD_WEIGHTS.newDevice; reasons.push('NEW_DEVICE'); }
    }
    if (context.location && await tx.device.findFirst({ where: { userId, lastLocation: { not: context.location } } })) { score += FRAUD_WEIGHTS.unusualLocation; reasons.push('UNUSUAL_LOCATION'); }
    const recent = await tx.transaction.count({ where: { sourceAccountId, createdAt: { gte: new Date(Date.now() - FRAUD_THRESHOLDS.frequencyWindowMinutes * 60_000) } } });
    if (recent >= FRAUD_THRESHOLDS.frequencyLimit) { score += FRAUD_WEIGHTS.highFrequency; reasons.push('HIGH_TRANSACTION_FREQUENCY'); }
    const hour = new Date().getHours();
    if (hour < 6 || hour >= 23) { score += FRAUD_WEIGHTS.unusualTime; reasons.push('UNUSUAL_TRANSACTION_TIME'); }
    const riskScore = Math.min(score, 100);
    if (riskScore >= FRAUD_THRESHOLDS.high) return { riskScore, reasons, riskLevel: FraudRiskLevel.HIGH, decision: FraudDecision.HOLD };
    if (riskScore >= FRAUD_THRESHOLDS.medium) return { riskScore, reasons, riskLevel: FraudRiskLevel.MEDIUM, decision: FraudDecision.VERIFY };
    return { riskScore, reasons, riskLevel: FraudRiskLevel.LOW, decision: FraudDecision.APPROVE };
  }
}
