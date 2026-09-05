import { AccountStatus, Prisma } from '@prisma/client';
import { TransactionsService } from './transactions.service';

describe('TransactionsService', () => {
  const sender = { id: 'sender-account', userId: 'customer-1', status: AccountStatus.ACTIVE, currency: 'NGN' };
  const recipient = { id: 'recipient-account', userId: 'customer-2', status: AccountStatus.ACTIVE, currency: 'NGN' };
  const tx = { account: { findUnique: jest.fn(), updateMany: jest.fn(), update: jest.fn() }, transaction: { create: jest.fn() }, auditLog: { create: jest.fn() } };
  const prisma = { $transaction: jest.fn(), auditLog: { create: jest.fn() } };
  const service = new TransactionsService(prisma as never);

  beforeEach(() => { jest.clearAllMocks(); prisma.$transaction.mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx)); });

  it('debits and credits within one database transaction', async () => {
    tx.account.findUnique.mockResolvedValueOnce(sender).mockResolvedValueOnce(recipient); tx.account.updateMany.mockResolvedValue({ count: 1 }); tx.account.update.mockResolvedValue({}); tx.transaction.create.mockResolvedValue({ id: 'transaction-1', status: 'COMPLETED' }); tx.auditLog.create.mockResolvedValue({});
    await service.transfer('customer-1', { destinationAccountNumber: '1234567890', amount: '100.00' });
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.account.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: { balance: { decrement: new Prisma.Decimal('100.00') } } }));
    expect(tx.account.update).toHaveBeenCalledWith(expect.objectContaining({ data: { balance: { increment: new Prisma.Decimal('100.00') } } }));
  });

  it('does not credit when the conditional debit fails', async () => {
    tx.account.findUnique.mockResolvedValueOnce(sender).mockResolvedValueOnce(recipient); tx.account.updateMany.mockResolvedValue({ count: 0 }); prisma.auditLog.create.mockResolvedValue({});
    await expect(service.transfer('customer-1', { destinationAccountNumber: '1234567890', amount: '100.00' })).rejects.toThrow('Insufficient account balance');
    expect(tx.account.update).not.toHaveBeenCalled();
  });
});
