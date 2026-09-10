import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateBeneficiaryDto) {
    const account = await this.prisma.account.findUnique({ where: { accountNumber: dto.accountNumber } });
    if (!account) throw new NotFoundException('Destination account not found');
    if (account.userId === userId) throw new ConflictException('You cannot add your own account as a beneficiary');
    const existing = await this.prisma.beneficiary.findUnique({ where: { userId_accountId: { userId, accountId: account.id } } });
    if (existing) throw new ConflictException('Beneficiary already exists');
    return this.prisma.beneficiary.create({ data: { userId, accountId: account.id, nickname: dto.nickname }, include: { account: { select: { accountNumber: true, currency: true, user: { select: { firstName: true, lastName: true } } } } } });
  }

  list(userId: string) { return this.prisma.beneficiary.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, include: { account: { select: { accountNumber: true, currency: true, user: { select: { firstName: true, lastName: true } } } } } }); }

  async remove(userId: string, beneficiaryId: string): Promise<void> {
    const result = await this.prisma.beneficiary.deleteMany({ where: { id: beneficiaryId, userId } });
    if (result.count === 0) throw new NotFoundException('Beneficiary not found');
  }
}
