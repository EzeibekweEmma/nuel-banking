import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";

export function AuthenticatedApi(): ClassDecorator & MethodDecorator {
  return applyDecorators(
    ApiBearerAuth("access-token"),
    ApiUnauthorizedResponse({
      description: "The access token is missing, invalid, expired, or revoked.",
    }),
  );
}
