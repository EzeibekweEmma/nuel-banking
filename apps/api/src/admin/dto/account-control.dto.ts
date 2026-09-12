import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";
import { ApiProperty } from "@nestjs/swagger";

export class AccountControlDto {
  @ApiProperty({
    example: "Customer reported an unrecognized device login.",
    minLength: 10,
    maxLength: 500,
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(10, 500, {
    message: "Reason must contain between 10 and 500 characters",
  })
  reason!: string;
}
