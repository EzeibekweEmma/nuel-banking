import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './roles.guard';

@Module({ imports: [PassportModule, JwtModule.register({})], controllers: [AuthController], providers: [AuthService, JwtStrategy, RolesGuard], exports: [AuthService] })
export class AuthModule {}
