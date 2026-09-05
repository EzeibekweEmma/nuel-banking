import { IsOptional, IsString, Length, MaxLength, MinLength } from 'class-validator';

export class CreateTransferDto {
  @IsString()
  @Length(10, 10)
  destinationAccountNumber!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(18)
  amount!: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}
