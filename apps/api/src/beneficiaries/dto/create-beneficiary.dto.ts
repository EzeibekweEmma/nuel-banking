import { IsString, Length, Matches, MaxLength, MinLength } from 'class-validator';

export class CreateBeneficiaryDto {
  @IsString()
  @Length(10, 10)
  @Matches(/^\d{10}$/)
  accountNumber!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nickname!: string;
}
