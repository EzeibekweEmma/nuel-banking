import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { AccountControlDto } from "./account-control.dto";

describe("AccountControlDto", () => {
  it("requires a meaningful reason", async () => {
    const dto = plainToInstance(AccountControlDto, { reason: " short " });

    expect(await validate(dto)).not.toHaveLength(0);
  });

  it("trims and accepts a reason containing at least ten characters", async () => {
    const dto = plainToInstance(AccountControlDto, {
      reason: "  Security review completed  ",
    });

    expect(await validate(dto)).toHaveLength(0);
    expect(dto.reason).toBe("Security review completed");
  });
});
