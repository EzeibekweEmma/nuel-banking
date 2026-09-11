import { IsString, MaxLength, MinLength } from "class-validator";

export class CreateDemoDepositDto {
  @IsString()
  @MinLength(1)
  @MaxLength(18)
  amount!: string;
}
