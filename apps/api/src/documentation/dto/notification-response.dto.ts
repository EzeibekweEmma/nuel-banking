import { ApiProperty } from "@nestjs/swagger";

export class NotificationResponseDto {
  @ApiProperty({ example: "cmf8notification01q2w3e4r5" })
  id!: string;

  @ApiProperty({
    enum: ["FRAUD_ALERT", "TRANSACTION_UPDATE", "SECURITY_ALERT"],
    example: "TRANSACTION_UPDATE",
  })
  type!: string;

  @ApiProperty({ example: "Money received" })
  title!: string;

  @ApiProperty({ example: "You received ₦25,000.00 from Chidi Eze." })
  message!: string;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ example: "2026-09-11T12:00:00.000Z", format: "date-time" })
  createdAt!: string;
}

export class UpdatedCountResponseDto {
  @ApiProperty({ example: 3 })
  updated!: number;
}
