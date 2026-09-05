import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus, AuditAction, Prisma, TransactionStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransferDto } from './dto/create-transfer.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async transfer(senderId: string, idempotencyKey: string, dto: CreateTransferDto) {
    const amount = this.toAmount(dto.amount);
    try {
      return await this.prisma.$transaction(async (tx) => {
        const sender = await tx.account.findUnique({ where: { userId: senderId } });
        if (!sender || sender.status !== AccountStatus.ACTIVE) throw new BadRequestException('Sender account is unavailable');
        const existing = await tx.transaction.findUnique({ where: { sourceAccountId_idempotencyKey: { sourceAccountId: sender.id, idempotencyKey } } });
        if (existing) return existing;
        const recipient = await tx.account.findUnique({ where: { accountNumber: dto.destinationAccountNumber } });
        if (!recipient || recipient.status !== AccountStatus.ACTIVE) throw new NotFoundException('Destination account not found');
        if (sender.id === recipient.id) throw new BadRequestException('You cannot transfer to your own account');
        if (sender.currency !== recipient.currency) throw new BadRequestException('Account currencies do not match');

        const debit = await tx.account.updateMany({ where: { id: sender.id, status: AccountStatus.ACTIVE, balance: { gte: amount } }, data: { balance: { decrement: amount } } });
        if (debit.count !== 1) throw new BadRequestException('Insufficient account balance');
        await tx.account.update({ where: { id: recipient.id }, data: { balance: { increment: amount } } });
        const transaction = await tx.transaction.create({ data: { sourceAccountId: sender.id, destinationAccountId: recipient.id, idempotencyKey, amount, reference: randomUUID(), description: dto.description, status: TransactionStatus.COMPLETED, completedAt: new Date() } });
        await tx.auditLog.create({ data: { userId: senderId, action: AuditAction.TRANSFER_COMPLETED, entityType: 'Transaction', entityId: transaction.id, metadata: { amount: amount.toString(), destinationAccountId: recipient.id } } });
        return transaction;
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

  list(senderId: string) {
    return this.prisma.transaction.findMany({ where: { sourceAccount: { userId: senderId } }, orderBy: { createdAt: 'desc' }, include: { destinationAccount: { select: { accountNumber: true } } } });
  }

  async getDetail(senderId: string, transactionId: string) {
    const transaction = await this.prisma.transaction.findFirst({ where: { id: transactionId, sourceAccount: { userId: senderId } }, include: { sourceAccount: { select: { accountNumber: true } }, destinationAccount: { select: { accountNumber: true } } } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    return transaction;
  }

  private toAmount(value: string): Prisma.Decimal {
    if (!/^\d+(\.\d{1,2})?$/.test(value)) throw new BadRequestException('Amount must be a positive value with up to two decimal places');
    const amount = new Prisma.Decimal(value);
    if (amount.lte(0)) throw new BadRequestException('Amount must be greater than zero');
    return amount;
  }
}
