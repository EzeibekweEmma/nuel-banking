import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { AuthenticatedApi } from "../documentation/authenticated-api.decorator";
import {
  ActiveSessionResponseDto,
  AuthTokensResponseDto,
  DevelopmentLinkResponseDto,
  MessageResponseDto,
  UserResponseDto,
} from "../documentation/dto/auth-response.dto";
import { RateLimit } from "../rate-limit/rate-limit.decorator";
import { AuthService, AuthTokens, SessionContext } from "./auth.service";
import { AuthUser } from "./auth-user.interface";
import { CurrentUser } from "./current-user.decorator";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { VerifyEmailDto } from "./dto/verify-email.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { JwtAuthGuard } from "./jwt-auth.guard";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @RateLimit({
    bucket: "auth-register",
    limit: 3,
    windowMs: 60 * 60 * 1000,
    identity: "ip",
  })
  @ApiOperation({ summary: "Register a customer account" })
  @ApiCreatedResponse({ type: AuthTokensResponseDto })
  @Post("register")
  register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<AuthTokens> {
    return this.authService.register(dto, this.sessionContext(request));
  }
  @RateLimit({
    bucket: "auth-login",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    identity: "ip",
  })
  @ApiOperation({ summary: "Sign in and create an active session" })
  @ApiCreatedResponse({ type: AuthTokensResponseDto })
  @Post("login")
  login(@Body() dto: LoginDto, @Req() request: Request): Promise<AuthTokens> {
    return this.authService.login(dto, this.sessionContext(request));
  }
  @RateLimit({
    bucket: "auth-forgot-password",
    limit: 3,
    windowMs: 60 * 60 * 1000,
    identity: "ip",
  })
  @ApiOperation({
    summary: "Request a password-reset email",
    description:
      "Always returns a neutral response so registered email addresses cannot be discovered.",
  })
  @ApiCreatedResponse({ type: DevelopmentLinkResponseDto })
  @Post("forgot-password")
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.requestPasswordReset(dto.email);
  }
  @RateLimit({
    bucket: "auth-reset-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    identity: "ip",
  })
  @ApiOperation({ summary: "Reset a password using an emailed token" })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @Post("reset-password")
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password);
  }
  @ApiOperation({ summary: "Verify a customer email address" })
  @ApiCreatedResponse({ type: MessageResponseDto })
  @Post("verify-email")
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto.token);
  }
  @RateLimit({
    bucket: "auth-email-verification-resend",
    limit: 5,
    windowMs: 60 * 60 * 1000,
    identity: "user",
  })
  @AuthenticatedApi()
  @ApiOperation({ summary: "Send another email-verification link" })
  @ApiCreatedResponse({ type: DevelopmentLinkResponseDto })
  @UseGuards(JwtAuthGuard)
  @Post("resend-email-verification")
  resendEmailVerification(@CurrentUser() user: AuthUser) {
    return this.authService.resendEmailVerification(user.id);
  }
  @ApiOperation({ summary: "Rotate a refresh token and issue new tokens" })
  @ApiCreatedResponse({ type: AuthTokensResponseDto })
  @Post("refresh")
  refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<AuthTokens> {
    return this.authService.refresh(
      dto.refreshToken,
      this.sessionContext(request),
    );
  }
  @AuthenticatedApi()
  @ApiOperation({ summary: "Sign out the supplied refresh-token session" })
  @ApiNoContentResponse({ description: "The session was revoked." })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post("logout")
  async logout(
    @CurrentUser() user: AuthUser,
    @Body() dto: LogoutDto,
  ): Promise<void> {
    await this.authService.logout(user.id, dto.refreshToken);
  }
  @AuthenticatedApi()
  @ApiOperation({ summary: "Get the signed-in customer" })
  @ApiOkResponse({ type: UserResponseDto })
  @UseGuards(JwtAuthGuard)
  @Get("me")
  me(@CurrentUser() user: AuthUser) {
    return this.authService.getCurrentUser(user.id);
  }

  @RateLimit({
    bucket: "auth-change-password",
    limit: 5,
    windowMs: 15 * 60 * 1000,
    identity: "user",
  })
  @AuthenticatedApi()
  @ApiOperation({
    summary: "Change the signed-in customer's password",
    description: "A successful change revokes every active session.",
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @UseGuards(JwtAuthGuard)
  @Patch("change-password")
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      user.id,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @AuthenticatedApi()
  @ApiOperation({ summary: "List active sessions" })
  @ApiOkResponse({ type: [ActiveSessionResponseDto] })
  @UseGuards(JwtAuthGuard)
  @Get("sessions")
  sessions(@CurrentUser() user: AuthUser) {
    return this.authService.listSessions(user.id);
  }

  @AuthenticatedApi()
  @ApiOperation({ summary: "Revoke an active session" })
  @ApiNoContentResponse({ description: "The session was revoked." })
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete("sessions/:id")
  async revokeSession(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ): Promise<void> {
    await this.authService.revokeSession(user.id, id);
  }

  private sessionContext(request: Request): SessionContext {
    const userAgent = request.get("user-agent")?.trim().slice(0, 255);
    const ipAddress = request.ip?.slice(0, 64);
    return {
      userAgent: userAgent || undefined,
      ipAddress: ipAddress || undefined,
    };
  }
}
