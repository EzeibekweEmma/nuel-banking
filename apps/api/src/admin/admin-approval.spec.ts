import { TransactionsService } from '../transactions/transactions.service';

describe('held transaction approval', () => {
  it('rejects a duplicate approval when the HELD reservation is unavailable', async () => {
    const tx = { transaction: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) } };
    const prisma = { $transaction: jest.fn().mockImplementation((callback: (client: typeof tx) => unknown) => callback(tx)) };
    const service = new TransactionsService(prisma as never, {} as never);
    await expect(service.approveHeld('admin-1', 'transaction-1')).rejects.toThrow('Held transaction has already been processed');
    expect(tx.transaction.updateMany).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'transaction-1', status: 'HELD' } }));
  });
});
