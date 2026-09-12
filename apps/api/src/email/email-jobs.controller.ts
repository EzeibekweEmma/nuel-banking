import {
  Controller,
  Get,
  Headers,
  HttpCode,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiExcludeController } from "@nestjs/swagger";
import { timingSafeEqual } from "crypto";
import { EmailOutboxService } from "./email-outbox.service";

@ApiExcludeController()
@Controller("internal/email-jobs")
export class EmailJobsController {
  constructor(
    private readonly emailOutbox: EmailOutboxService,
    private readonly config: ConfigService,
  ) {}

  @Get("process")
  @HttpCode(200)
  async process(
    @Headers("authorization") authorization?: string,
  ): Promise<{ processed: number }> {
    const secret = this.config.get<string>("CRON_SECRET");
    if (!secret || !this.matchesSecret(authorization, secret)) {
      throw new UnauthorizedException();
    }
    return { processed: await this.emailOutbox.processPendingJobs() };
  }

  private matchesSecret(authorization: string | undefined, secret: string) {
    const actual = Buffer.from(authorization ?? "");
    const expected = Buffer.from(`Bearer ${secret}`);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
