import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SendCodeDto, VerifyCodeDto, RefreshTokenDto, LogoutDto, TelegramWebAppDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('send-code')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Send Telegram verification code' })
  @ApiBody({ type: SendCodeDto })
  async sendCode(
    @Body() sendCodeDto: SendCodeDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.sendCode(sendCodeDto, userAgent, ipAddress);
  }

  @Post('verify-code')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Verify Telegram code and login' })
  @ApiBody({ type: VerifyCodeDto })
  async verifyCode(
    @Body() verifyCodeDto: VerifyCodeDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.verifyCode(verifyCodeDto, userAgent, ipAddress);
  }

  @Post('telegram-webapp')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login via Telegram WebApp' })
  @ApiBody({ type: TelegramWebAppDto })
  async loginWebApp(
    @Body() dto: TelegramWebAppDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.loginWithWebApp(dto.initData, userAgent, ipAddress);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiBody({ type: RefreshTokenDto })
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Headers('user-agent') userAgent: string,
    @Ip() ipAddress: string,
  ) {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken, userAgent, ipAddress);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout current session' })
  async logout(
    @CurrentUser() user: any,
    @Body() logoutDto: LogoutDto,
  ) {
    return this.authService.logout(user.id, logoutDto.sessionId);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout all sessions' })
  async logoutAll(@CurrentUser() user: any) {
    return this.authService.logoutAll(user.id);
  }

  @Get('sessions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get active sessions' })
  async getSessions(@CurrentUser() user: any) {
    return this.authService.getSessions(user.id);
  }

  @Post('sessions/:id/revoke')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke a session' })
  async revokeSession(@CurrentUser() user: any, @Req() req: any) {
    return this.authService.revokeSession(user.id, req.params.id);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user profile' })
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }
}
