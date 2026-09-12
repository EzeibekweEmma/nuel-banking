import { Module } from "@nestjs/common";
import { EmailJobsController } from "./email-jobs.controller";
import { EmailOutboxService } from "./email-outbox.service";

@Module({
  controllers: [EmailJobsController],
  providers: [EmailOutboxService],
  exports: [EmailOutboxService],
})
export class EmailModule {}
