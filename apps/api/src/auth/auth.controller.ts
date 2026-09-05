import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthService, AuthTokens } from './auth.service';
import { AuthUser } from './auth-user.interface';
import { CurrentUser } from './current-user.decorator';
import { LoginDto } from './dto/login.dto';
import { LogoutDto } from './dto/logout.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('register') register(@Body() dto: RegisterDto): Promise<AuthTokens> { return this.authService.register(dto); }
  @Post('login') login(@Body() dto: LoginDto): Promise<AuthTokens> { return this.authService.login(dto); }
  @Post('refresh') refresh(@Body() dto: RefreshTokenDto): Promise<AuthTokens> { return this.authService.refresh(dto.refreshToken); }
  @UseGuards(JwtAuthGuard) @Post('logout') async logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto): Promise<void> { await this.authService.logout(user.id, dto.refreshToken); }
  @UseGuards(JwtAuthGuard) @Get('me') me(@CurrentUser() user: AuthUser) { return this.authService.getCurrentUser(user.id); }
}
