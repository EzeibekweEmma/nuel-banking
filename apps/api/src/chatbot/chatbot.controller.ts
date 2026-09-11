import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { SendMessageDto } from "./dto/send-message.dto";
import { ChatbotService } from "./chatbot.service";

@UseGuards(JwtAuthGuard)
@Controller("chatbot")
export class ChatbotController {
  constructor(private readonly chatbot: ChatbotService) {}

  @RateLimit({
    bucket: "chatbot-messages",
    limit: 20,
    windowMs: 60 * 1000,
    identity: "user",
  })
  @Post("messages")
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chatbot.send(user, dto.message, dto.conversationId);
  }
}
