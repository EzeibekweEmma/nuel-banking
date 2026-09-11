import { Transform } from "class-transformer";
import { IsString, Length } from "class-validator";

export class AccountControlDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string" ? value.trim() : value,
  )
  @IsString()
  @Length(10, 500, {
    message: "Reason must contain between 10 and 500 characters",
  })
  reason!: string;
}
