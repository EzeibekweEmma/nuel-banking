import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SendMessageDto {
  @ApiProperty({ example: "What is my available balance?", maxLength: 2000 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;

  @ApiPropertyOptional({
    example: "cmf8chat01q2w3e4r5t6y7u8",
    description: "Existing conversation ID. Omit to begin a new conversation.",
  })
  @IsOptional()
  @IsString()
  conversationId?: string;
}
