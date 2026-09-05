import { BadGatewayException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AccountsService } from '../accounts/accounts.service';
import { AuthUser } from '../auth/auth-user.interface';
import { FraudService } from '../fraud/fraud.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class ChatbotService {
  constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, private readonly accounts: AccountsService, private readonly transactions: TransactionsService, private readonly fraud: FraudService) {}
  async send(user: AuthUser, message: string, conversationId?: string) {
    const conversation = conversationId ? await this.prisma.chatConversation.findFirst({ where: { id: conversationId, userId: user.id } }) : await this.prisma.chatConversation.create({ data: { userId: user.id } });
    if (!conversation) throw new NotFoundException('Conversation not found');
    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, content: message, isFromCustomer: true } });
    const context = await this.contextFor(user.id, message);
    try {
      const client = new GoogleGenAI({ apiKey: this.config.getOrThrow<string>('GEMINI_API_KEY') });
      const result = await client.models.generateContent({ model: this.config.get<string>('GEMINI_MODEL') ?? 'gemini-2.5-flash', contents: `${context}\n\nCustomer question: ${message}`, config: { systemInstruction: 'You are a helpful banking assistant. Answer only banking-support questions. Never request or reveal passwords, PINs, OTPs, tokens, or sensitive credentials. You cannot execute transfers, approve transactions, modify balances, or access databases. Provide concise, safe guidance and explain that transactions must use the banking app.' } });
      const response = result.text?.trim() || 'I could not generate a response. Please try again.';
      await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, content: response, isFromCustomer: false } });
      return { conversationId: conversation.id, response };
    } catch { throw new BadGatewayException('The banking assistant is temporarily unavailable. Please try again later.'); }
  }
  private async contextFor(userId: string, message: string): Promise<string> {
    const lower = message.toLowerCase(); const needsAccount = /balance|account|status/.test(lower); const needsTransactions = /transaction|transfer|fraud|recent/.test(lower);
    const parts = ['Verified customer context:'];
    if (needsAccount) { const account = await this.accounts.getOwnAccount(userId); parts.push(`Account: ${account.type}, status ${account.status}, balance ${account.balance} ${account.currency}.`); }
    if (needsTransactions) { const transactions = await this.transactions.list(userId); const recent = transactions.slice(0, 5).map((item) => `${item.status} ${item.amount}, risk ${this.fraud.describeAssessment(item.fraudAssessment)}`).join('; '); parts.push(`Recent transactions: ${recent || 'none'}.`); }
    return parts.join('\n');
  }
}
