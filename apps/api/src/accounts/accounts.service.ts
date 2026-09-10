import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnAccount(userId: string) {
    const account = await this.prisma.account.findUnique({ where: { userId }, select: { id: true, accountNumber: true, type: true, balance: true, currency: true, status: true, createdAt: true, user: { select: { firstName: true, lastName: true } } } });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }

  async getOwnBalance(userId: string) {
    const account = await this.prisma.account.findUnique({ where: { userId }, select: { balance: true, currency: true } });
    if (!account) throw new NotFoundException('Bank account not found');
    return account;
  }

  async lookupRecipient(userId: string, accountNumber: string) {
    if (!/^\d{10}$/.test(accountNumber)) throw new BadRequestException('Enter a valid 10-digit account number');
    const account = await this.prisma.account.findUnique({
      where: { accountNumber },
      select: { accountNumber: true, currency: true, status: true, userId: true, user: { select: { firstName: true, lastName: true } } },
    });
    if (!account || account.status !== AccountStatus.ACTIVE) throw new NotFoundException('We could not find an active Astra account with that number');
    if (account.userId === userId) throw new BadRequestException('Choose an account other than your own');
    return { accountNumber: account.accountNumber, currency: account.currency, firstName: account.user.firstName, lastName: account.user.lastName };
  }
}
