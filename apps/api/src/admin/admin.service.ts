import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}
  customers() { return this.prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, email: true, firstName: true, lastName: true, createdAt: true, accounts: { select: { accountNumber: true, status: true } } }, orderBy: { createdAt: 'desc' } }); }
  transactions() { return this.prisma.transaction.findMany({ include: { sourceAccount: { select: { accountNumber: true } }, destinationAccount: { select: { accountNumber: true } }, fraudAssessment: true }, orderBy: { createdAt: 'desc' } }); }
  heldTransactions() { return this.prisma.transaction.findMany({ where: { status: 'HELD' }, include: { sourceAccount: { select: { accountNumber: true } }, destinationAccount: { select: { accountNumber: true } }, fraudAssessment: true }, orderBy: { createdAt: 'desc' } }); }
  fraudAssessments() { return this.prisma.fraudAssessment.findMany({ include: { transaction: { select: { id: true, reference: true, status: true, amount: true } } }, orderBy: { createdAt: 'desc' } }); }
  auditLogs() { return this.prisma.auditLog.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' } }); }
}
