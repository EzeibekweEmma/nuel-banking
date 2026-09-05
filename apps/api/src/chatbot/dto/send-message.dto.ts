import { IsOptional, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString() @MaxLength(2000) message!: string;
  @IsOptional() @IsString() conversationId?: string;
}
