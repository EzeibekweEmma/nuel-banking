import { Injectable, NotFoundException } from '@nestjs/common';
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
}
