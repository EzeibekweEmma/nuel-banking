import { ApiProperty } from "@nestjs/swagger";

export class ChatResponseDto {
  @ApiProperty({ example: "cmf8chat01q2w3e4r5t6y7u8" })
  conversationId!: string;

  @ApiProperty({
    example: "Your available balance is ₦125,000.00 in your savings account.",
  })
  response!: string;
}
