import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import {
  PaginatedNotificationsResponseDto,
  UpdatedCountResponseDto,
} from "../documentation/dto/notification-response.dto";
import { NotificationFilterApiQueries } from "../documentation/query-parameters.decorator";
import { NotificationQueryDto } from "./dto/notification-query.dto";
import { NotificationsService } from "./notifications.service";

@ApiTags("Notifications")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}
  @ApiOperation({ summary: "List customer notifications" })
  @ApiOkResponse({ type: PaginatedNotificationsResponseDto })
  @NotificationFilterApiQueries()
  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: NotificationQueryDto) {
    return this.notificationsService.list(user.id, query);
  }
  @ApiOperation({ summary: "Mark every notification as read" })
  @ApiOkResponse({ type: UpdatedCountResponseDto })
  @Patch("read-all")
  markAllRead(@CurrentUser() user: AuthUser) {
    return this.notificationsService.markAllRead(user.id);
  }
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Mark one notification as read" })
  @ApiNoContentResponse({ description: "The notification was marked as read." })
  @Patch(":id/read")
  async markRead(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.notificationsService.markRead(user.id, id);
  }
}
