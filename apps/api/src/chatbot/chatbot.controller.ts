import { Body, Controller, Post, UseGuards } from "@nestjs/common";
import { ApiCreatedResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import { ChatResponseDto } from "../documentation/dto/api-response.dto";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { SendMessageDto } from "./dto/send-message.dto";
import { ChatbotService } from "./chatbot.service";

@ApiTags("Assistant")
@AuthenticatedApi()
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
  @ApiOperation({ summary: "Send a message to the Nuel banking assistant" })
  @ApiCreatedResponse({ type: ChatResponseDto })
  @Post("messages")
  send(@CurrentUser() user: AuthUser, @Body() dto: SendMessageDto) {
    return this.chatbot.send(user, dto.message, dto.conversationId);
  }
}
