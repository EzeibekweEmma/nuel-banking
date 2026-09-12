import { Body, Controller, Patch, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthUser } from "../auth/auth-user.interface";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import { ProfileResponseDto } from "../documentation/dto/api-response.dto";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { UsersService } from "./users.service";

@ApiTags("Customers")
@AuthenticatedApi()
@UseGuards(JwtAuthGuard)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Patch("me")
  @ApiOperation({ summary: "Update the signed-in customer's profile" })
  @ApiOkResponse({ type: ProfileResponseDto })
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }
}
