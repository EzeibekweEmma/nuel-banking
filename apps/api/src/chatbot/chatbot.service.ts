import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { AccountsService } from '../accounts/accounts.service';
import { AuthUser } from '../auth/auth-user.interface';
import { FraudService } from '../fraud/fraud.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionsService } from '../transactions/transactions.service';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly transactions: TransactionsService,
    private readonly fraud: FraudService,
  ) {}

  async send(user: AuthUser, message: string, conversationId?: string) {
    const conversation = conversationId
      ? await this.prisma.chatConversation.findFirst({ where: { id: conversationId, userId: user.id } })
      : await this.prisma.chatConversation.create({ data: { userId: user.id } });
    if (!conversation) throw new NotFoundException('Conversation not found');

    const history = conversationId
      ? await this.prisma.chatMessage.findMany({ where: { conversationId: conversation.id }, orderBy: { createdAt: 'desc' }, take: 8 })
      : [];
    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, content: message, isFromCustomer: true } });
    const context = await this.contextFor(user.id, message);
    const response = await this.generateResponse(user.id, message, context, history.reverse());
    await this.prisma.chatMessage.create({ data: { conversationId: conversation.id, content: response, isFromCustomer: false } });
    return { conversationId: conversation.id, response };
  }

  private async generateResponse(userId: string, message: string, context: string, history: Array<{ content: string; isFromCustomer: boolean }>): Promise<string> {
    try {
      const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
      if (!apiKey || apiKey === 'replace-with-your-gemini-api-key') return this.fallbackResponse(userId, message);

      const client = new GoogleGenAI({ apiKey });
      const recentConversation = history
        .map((item) => (item.isFromCustomer ? 'Customer: ' : 'Assistant: ') + item.content)
        .join('\n')
        .slice(-8_000);
      const result = await client.interactions.create({
        model: this.config.get<string>('GEMINI_MODEL') ?? 'gemini-3.5-flash-lite',
        input: context + (recentConversation ? '\n\nRecent conversation:\n' + recentConversation : '') + '\n\nCustomer: ' + message,
        system_instruction: 'You are Nuel, a helpful assistant inside a banking application. Answer banking questions and questions about the Nuel app naturally and directly. Use verified customer context when supplied. Never request or reveal passwords, PINs, OTPs, tokens, or sensitive credentials. You cannot execute transfers, approve transactions, modify balances, or access databases. Keep answers concise and explain that transactions must be completed in the banking app.',
        generation_config: { max_output_tokens: 300, thinking_level: 'minimal' },
        store: false,
      }, { timeout: 18_000, maxRetries: 1 });
      return result.output_text?.trim() || this.fallbackResponse(userId, message);
    } catch {
      this.logger.warn('Gemini was unavailable; a safe local banking response was used.');
      return this.fallbackResponse(userId, message);
    }
  }

  private async fallbackResponse(userId: string, message: string): Promise<string> {
    const lower = message.trim().toLowerCase();

    if (/(password|passcode|pin|otp|one[- ]?time code|access token)/.test(lower)) {
      return 'For your security, never share passwords, PINs, OTPs, or login codes. You can reset a forgotten password from the sign-in page.';
    }
    if (/^(hi|hello|hey|good (morning|afternoon|evening))[!. ]*$/.test(lower)) {
      return 'Hello! I can help with your balance, recent transactions, transfers, beneficiaries, and account security. What would you like to know?';
    }
    if (/what.*(app|nuel).*about|what can (the |this )?app do|app features|about nuel/.test(lower)) {
      return 'Nuel is a secure digital banking app for checking your balance, sending money, managing beneficiaries, reviewing transactions and alerts, and getting banking guidance from this assistant.';
    }
    if (/balance|how much.*account|available funds/.test(lower)) {
      const account = await this.accounts.getOwnAccount(userId);
      return 'Your available balance is ' + this.formatMoney(account.balance.toString(), account.currency) + ' in your ' + account.type.toLowerCase() + ' account.';
    }
    if (/account.*status|status.*account|is my account/.test(lower)) {
      const account = await this.accounts.getOwnAccount(userId);
      return 'Your ' + account.type.toLowerCase() + ' account ending in ' + account.accountNumber.slice(-4) + ' is currently ' + account.status.toLowerCase() + '.';
    }
    if (/recent|transaction|payment history|last transfer/.test(lower)) {
      const items = await this.transactions.list(userId);
      if (items.length === 0) return 'You do not have any transfers yet. New transactions will appear in your transaction history.';
      const latest = items[0];
      const recipient = latest.destinationAccount.user;
      const recipientName = recipient ? recipient.firstName + ' ' + recipient.lastName : 'account ending in ' + latest.destinationAccount.accountNumber.slice(-4);
      const account = await this.accounts.getOwnAccount(userId);
      return 'Your most recent transfer was ' + this.formatMoney(latest.amount.toString(), account.currency) + ' to ' + recipientName + '. Its status is ' + latest.status.toLowerCase() + '.';
    }
    if (/fraud|scam|suspicious|security|safe/.test(lower)) {
      return 'Every transfer is checked by Nuel’s fraud monitoring. If activity looks unusual, the transfer may be held for review and you will receive a notification. Never share your password, PIN, or OTP.';
    }
    if (/transfer|send money|make a payment/.test(lower)) {
      return 'To send money, open Send money, verify the recipient’s name, enter the amount, review the details, and confirm. I can guide you, but I cannot execute a transfer.';
    }
    if (/beneficiar|saved recipient/.test(lower)) {
      return 'Open Beneficiaries to add or remove trusted recipients. Confirm the account number and recipient name carefully before saving.';
    }
    if (/notification|alert/.test(lower)) {
      return 'Open Notifications to review transaction, fraud, and security updates. Unread alerts are marked with a green dot.';
    }
    return 'I can help with your balance, recent transactions, transfers, beneficiaries, notifications, or account security. Try asking “What is my balance?”';
  }

  private async contextFor(userId: string, message: string): Promise<string> {
    const lower = message.toLowerCase();
    const needsAccount = /balance|account|status/.test(lower);
    const needsTransactions = /transaction|transfer|fraud|recent/.test(lower);
    const parts = ['Verified customer context:'];

    if (needsAccount) {
      const account = await this.accounts.getOwnAccount(userId);
      parts.push('Account: ' + account.type + ', status ' + account.status + ', balance ' + account.balance + ' ' + account.currency + '.');
    }
    if (needsTransactions) {
      const transactions = await this.transactions.list(userId);
      const recent = transactions.slice(0, 5).map((item) => item.status + ' ' + item.amount + ', risk ' + this.fraud.describeAssessment(item.fraudAssessment)).join('; ');
      parts.push('Recent transactions: ' + (recent || 'none') + '.');
    }
    return parts.join('\n');
  }

  private formatMoney(amount: string, currency: string): string {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency, minimumFractionDigits: 2 }).format(Number(amount));
  }
}
