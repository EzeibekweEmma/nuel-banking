import { Injectable } from '@nestjs/common';
import { TransactionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from './dto/pagination.dto';
import { TransactionQueryDto } from './dto/transaction-query.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async customers(query: PaginationDto) {
    const [data, total] = await Promise.all([this.prisma.user.findMany({ where: { role: 'CUSTOMER' }, select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }), this.prisma.user.count({ where: { role: 'CUSTOMER' } })]);
    return { data, total, page: query.page, limit: query.limit };
  }

  async transactions(query: TransactionQueryDto) {
    const where = query.status ? { status: query.status } : {};
    const [data, total] = await Promise.all([this.prisma.transaction.findMany({ where, include: this.transactionInclude, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }), this.prisma.transaction.count({ where })]);
    return { data, total, page: query.page, limit: query.limit };
  }

  heldTransactions(query: PaginationDto) { return this.transactions({ ...query, status: TransactionStatus.HELD }); }

  async fraudAssessments(query: PaginationDto) {
    const [data, total] = await Promise.all([this.prisma.fraudAssessment.findMany({ include: { transaction: { select: { id: true, reference: true, status: true, amount: true, createdAt: true, sourceAccount: { select: { accountNumber: true, user: { select: { firstName: true, lastName: true } } } }, destinationAccount: { select: { accountNumber: true, user: { select: { firstName: true, lastName: true } } } } } } }, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }), this.prisma.fraudAssessment.count()]);
    return { data, total, page: query.page, limit: query.limit };
  }

  async auditLogs(query: PaginationDto) {
    const [data, total] = await Promise.all([this.prisma.auditLog.findMany({ include: { user: { select: { email: true } } }, orderBy: { createdAt: 'desc' }, skip: this.skip(query), take: query.limit }), this.prisma.auditLog.count()]);
    return { data, total, page: query.page, limit: query.limit };
  }

  private skip(query: PaginationDto): number { return (query.page - 1) * query.limit; }
  private readonly transactionInclude = { sourceAccount: { select: { accountNumber: true, user: { select: { firstName: true, lastName: true } } } }, destinationAccount: { select: { accountNumber: true, user: { select: { firstName: true, lastName: true } } } }, fraudAssessment: true };
}
