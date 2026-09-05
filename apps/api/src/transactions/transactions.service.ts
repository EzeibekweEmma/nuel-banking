import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, AuditAction, FraudDecision, Prisma, TransactionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { FraudContext, FraudTransactionClient } from '../fraud/fraud.types';
import { FraudService } from '../fraud/fraud.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService, private readonly fraudService: FraudService) {}

  async transfer(senderId: string, idempotencyKey: string, dto: CreateTransferDto, context: FraudContext = {}) {
    const amount = this.toAmount(dto.amount);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sender = await tx.account.findUnique({ where: { userId: senderId } });
        if (!sender || sender.status !== AccountStatus.ACTIVE) throw new BadRequestException('Sender account is unavailable');
        const existing = await tx.transaction.findUnique({ where: { sourceAccountId_idempotencyKey: { sourceAccountId: sender.id, idempotencyKey } } });
        if (existing) return existing;
        const recipient = await tx.account.findUnique({ where: { accountNumber: dto.destinationAccountNumber } });
        if (!recipient || recipient.status !== AccountStatus.ACTIVE) throw new NotFoundException('Destination account not found');
        if (sender.id === recipient.id || sender.currency !== recipient.currency) throw new BadRequestException('Invalid destination account');
        const transaction = await tx.transaction.create({ data: { sourceAccountId: sender.id, destinationAccountId: recipient.id, idempotencyKey, amount, reference: randomUUID(), description: dto.description, status: TransactionStatus.PENDING } });
        const fraud = await this.fraudService.assess(tx, senderId, sender.id, amount.toNumber(), context);
        await tx.fraudAssessment.create({ data: { transactionId: transaction.id, ...fraud } });
        await this.recordDevice(tx, senderId, context);
        if (fraud.decision === FraudDecision.HOLD) {
          const held = await tx.transaction.update({ where: { id: transaction.id }, data: { status: TransactionStatus.HELD } });
          await tx.notification.create({ data: { userId: senderId, type: 'FRAUD_ALERT', title: 'Transfer held for review', message: 'Your transfer is being reviewed for security.' } });
          await tx.auditLog.create({ data: { userId: senderId, action: AuditAction.FRAUD_ALERT_GENERATED, entityType: 'Transaction', entityId: transaction.id, metadata: { riskScore: fraud.riskScore, reasons: fraud.reasons } } });
          return held;
        }
        if (fraud.decision === FraudDecision.VERIFY) return transaction;
        return this.completeTransfer(tx, transaction.id, sender.id, recipient.id, amount, senderId);
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        const existing = await this.prisma.transaction.findFirst({ where: { sourceAccount: { userId: senderId }, idempotencyKey } });
        if (existing) return existing;
      }
      await this.prisma.auditLog.create({ data: { userId: senderId, action: AuditAction.TRANSFER_FAILED, entityType: 'Transaction', metadata: { destinationAccountNumber: dto.destinationAccountNumber } } });
      throw error;
    }
  }

  async verify(senderId: string, transactionId: string) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.findFirst({ where: { id: transactionId, sourceAccount: { userId: senderId }, status: TransactionStatus.PENDING }, include: { fraudAssessment: true } });
      if (!transaction || transaction.fraudAssessment?.decision !== FraudDecision.VERIFY) throw new NotFoundException('Transfer awaiting verification not found');
      return this.completeTransfer(tx, transaction.id, transaction.sourceAccountId, transaction.destinationAccountId, transaction.amount, senderId);
    });
  }

  list(senderId: string) { return this.prisma.transaction.findMany({ where: { sourceAccount: { userId: senderId } }, orderBy: { createdAt: 'desc' }, include: { destinationAccount: { select: { accountNumber: true } }, fraudAssessment: true } }); }
  async getDetail(senderId: string, transactionId: string) { const transaction = await this.prisma.transaction.findFirst({ where: { id: transactionId, sourceAccount: { userId: senderId } }, include: { fraudAssessment: true } }); if (!transaction) throw new NotFoundException('Transaction not found'); return transaction; }

  private async completeTransfer(tx: FraudTransactionClient, transactionId: string, sourceAccountId: string, destinationAccountId: string, amount: Prisma.Decimal, userId: string) {
    const debit = await tx.account.updateMany({ where: { id: sourceAccountId, status: AccountStatus.ACTIVE, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
    if (debit.count !== 1) throw new BadRequestException('Insufficient account balance');
    await tx.account.update({ where: { id: destinationAccountId, status: AccountStatus.ACTIVE }, data: { balance: { increment: amount } } });
    const transaction = await tx.transaction.update({ where: { id: transactionId }, data: { status: TransactionStatus.COMPLETED, completedAt: new Date() } });
    await tx.auditLog.create({ data: { userId, action: AuditAction.TRANSFER_COMPLETED, entityType: 'Transaction', entityId: transactionId } });
    return transaction;
  }

  private async recordDevice(tx: FraudTransactionClient, userId: string, context: FraudContext) { if (context.deviceFingerprint) await tx.device.upsert({ where: { userId_fingerprint: { userId, fingerprint: context.deviceFingerprint } }, create: { userId, fingerprint: context.deviceFingerprint, lastLocation: context.location }, update: { lastLocation: context.location, lastSeenAt: new Date() } }); }
  private toAmount(value: string): Prisma.Decimal { if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new BadRequestException('Amount must be a positive value with up to two decimal places'); const amount = new Prisma.Decimal(value); if (amount.lte(0)) throw new BadRequestException('Amount must be greater than zero'); return amount; }
}
