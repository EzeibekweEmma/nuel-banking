import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { ChatbotService } from './chatbot.service';

describe('ChatbotService', () => {
  const prisma = {
    chatConversation: {
      create: jest.fn().mockResolvedValue({ id: 'conversation-1' }),
      findFirst: jest.fn(),
    },
    chatMessage: { create: jest.fn().mockResolvedValue({}), findMany: jest.fn().mockResolvedValue([]) },
  };
  const accounts = {
    getOwnAccount: jest.fn().mockResolvedValue({
      accountNumber: '1234567890',
      type: 'SAVINGS',
      status: 'ACTIVE',
      balance: { toString: () => '12500.50' },
      currency: 'NGN',
    }),
  };
  const transactions = { list: jest.fn().mockResolvedValue([]) };
  const fraud = { describeAssessment: jest.fn().mockReturnValue('low risk') };
  const config = { get: jest.fn().mockReturnValue(undefined) };
  const service = new ChatbotService(config as never as ConfigService, prisma as never, accounts as never, transactions as never, fraud as never);
  const user = { id: 'user-1', email: 'customer@example.com', role: UserRole.CUSTOMER };

  beforeEach(() => jest.clearAllMocks());

  it('answers a balance question when Gemini is not configured', async () => {
    const result = await service.send(user, 'What is my balance?');

    expect(result.response).toContain('₦12,500.50');
    expect(result.response).toContain('savings account');
    expect(prisma.chatMessage.create).toHaveBeenCalledTimes(2);
  });

  it('responds to a greeting without requiring Gemini', async () => {
    const result = await service.send(user, 'hello');

    expect(result.response).toContain('Hello!');
    expect(result.response).toContain('recent transactions');
  });

  it('refuses to handle sensitive credentials', async () => {
    const result = await service.send(user, 'Can I send you my OTP?');

    expect(result.response).toContain('never share');
    expect(result.response).toContain('OTP');
  });

  it('explains the application when the provider is unavailable', async () => {
    const result = await service.send(user, 'What is this app about?');

    expect(result.response).toContain('secure digital banking app');
    expect(result.response).toContain('sending money');
  });
});
