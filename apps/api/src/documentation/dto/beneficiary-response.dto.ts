import { ApiProperty } from "@nestjs/swagger";
import { AccountOwnerResponseDto } from "./account-response.dto";

export class BeneficiaryAccountResponseDto {
  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ type: () => AccountOwnerResponseDto })
  user!: AccountOwnerResponseDto;
}

export class BeneficiaryResponseDto {
  @ApiProperty({ example: "cmf8beneficiary01q2w3e4r5" })
  id!: string;

  @ApiProperty({ example: "Mum" })
  nickname!: string;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: () => BeneficiaryAccountResponseDto })
  account!: BeneficiaryAccountResponseDto;
}
