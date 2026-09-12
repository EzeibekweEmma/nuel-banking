import { ApiProperty } from "@nestjs/swagger";

export class AccountOwnerResponseDto {
  @ApiProperty({ example: "Ada" })
  firstName!: string;

  @ApiProperty({ example: "Okafor" })
  lastName!: string;
}

export class AccountResponseDto {
  @ApiProperty({ example: "cmf8account01q2w3e4r5t6y7u" })
  id!: string;

  @ApiProperty({ example: "0123456789", pattern: "^\\d{10}$" })
  accountNumber!: string;

  @ApiProperty({ enum: ["SAVINGS", "CURRENT"], example: "SAVINGS" })
  type!: string;

  @ApiProperty({ example: "125000.00", description: "Decimal string." })
  balance!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ enum: ["ACTIVE", "FROZEN", "CLOSED"], example: "ACTIVE" })
  status!: string;

  @ApiProperty({ example: "2026-09-01T09:30:00.000Z", format: "date-time" })
  createdAt!: string;

  @ApiProperty({ type: () => AccountOwnerResponseDto })
  user!: AccountOwnerResponseDto;
}

export class BalanceResponseDto {
  @ApiProperty({ example: "125000.00", description: "Decimal string." })
  balance!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;
}

export class RecipientResponseDto {
  @ApiProperty({ example: "0123456789" })
  accountNumber!: string;

  @ApiProperty({ example: "NGN" })
  currency!: string;

  @ApiProperty({ example: "Chidi" })
  firstName!: string;

  @ApiProperty({ example: "Eze" })
  lastName!: string;
}
