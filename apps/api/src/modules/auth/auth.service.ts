import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CryptoService } from './services/crypto.service';
import { SendCodeDto, VerifyCodeDto, LoginResponseDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly telegramService: TelegramService,
    private readonly cryptoService: CryptoService,
  ) {}

  async sendCode(sendCodeDto: SendCodeDto, deviceInfo?: string, ipAddress?: string) {
    const { phoneNumber } = sendCodeDto;
    this.logger.log(`Sending code to ${phoneNumber}`);

    try {
      const result = await this.telegramService.sendCode(phoneNumber);

      return {
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber: result.phoneNumber,
        nextAction: 'verify_code',
        message: 'Verification code sent to your Telegram account',
      };
    } catch (error: any) {
      this.logger.error(`Failed to send code: ${error.message}`);
      if (error.message?.includes('FLOOD_WAIT')) {
        const waitTime = error.message.match(/\d+/)?.[0] || 'unknown';
        throw new UnauthorizedException(
          `Too many requests. Please wait ${waitTime} seconds before trying again.`,
        );
      }
      throw new UnauthorizedException('Failed to send verification code. Please try again.');
    }
  }

  async verifyCode(verifyCodeDto: VerifyCodeDto, deviceInfo?: string, ipAddress?: string) {
    const { phoneNumber, code, phoneCodeHash, password } = verifyCodeDto;

    this.logger.log(`Verifying code for ${phoneNumber}`);

    try {
      const authResult = await this.telegramService.verifyCode({
        phoneNumber,
        code,
        phoneCodeHash,
        password,
      });

      // Find or create user
      let user = await this.prisma.user.findUnique({
        where: { telegramId: authResult.telegramId },
      });

      if (!user) {
        user = await this.prisma.user.create({
          data: {
            telegramId: authResult.telegramId,
            phoneNumber: authResult.phoneNumber,
            firstName: authResult.firstName || '',
            lastName: authResult.lastName || '',
            username: authResult.username || '',
          },
        });
        this.logger.log(`Created new user: ${user.id}`);
      } else {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            firstName: authResult.firstName || user.firstName,
            lastName: authResult.lastName || user.lastName,
            username: authResult.username || user.username,
            lastLoginAt: new Date(),
          },
        });
        this.logger.log(`Updated existing user: ${user.id}`);
      }

      // Encrypt and store Telegram session
      const sessionId = uuidv4();
      const encryptedSession = this.cryptoService.encrypt(
        JSON.stringify(authResult.session),
      );

      await this.prisma.telegramSession.create({
        data: {
          userId: user.id,
          sessionId,
          encryptedSession,
          deviceInfo: deviceInfo || null,
          ipAddress: ipAddress || null,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.telegramId.toString(), sessionId);

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId: user.id,
          action: 'LOGIN',
          details: { method: 'telegram', deviceInfo },
          ipAddress,
        },
      });

      return {
        user: this.sanitizeUser(user),
        ...tokens,
      };
    } catch (error: any) {
      this.logger.error(`Verification failed: ${error.message}`);
      if (error.message?.includes('PASSWORD_HASH_INVALID')) {
        throw new UnauthorizedException('Invalid 2FA password');
      }
      if (error.message?.includes('CODE_INVALID')) {
        throw new UnauthorizedException('Invalid verification code');
      }
      if (error.message?.includes('PHONE_NUMBER_INVALID')) {
        throw new UnauthorizedException('Invalid phone number');
      }
      throw new UnauthorizedException('Verification failed. Please try again.');
    }
  }

  async refreshTokens(refreshToken: string, deviceInfo?: string, ipAddress?: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const session = await this.prisma.jwtSession.findUnique({
        where: { refreshToken },
        include: { user: true },
      });

      if (!session || !session.isActive) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      if (session.expiresAt < new Date()) {
        await this.prisma.jwtSession.delete({ where: { id: session.id } });
        throw new UnauthorizedException('Refresh token expired');
      }

      // Revoke old token
      await this.prisma.jwtSession.update({
        where: { id: session.id },
        data: { isActive: false },
      });

      // Generate new tokens
      const tokens = await this.generateTokens(
        session.userId,
        session.user.telegramId.toString(),
        session.id,
      );

      return tokens;
    } catch (error: any) {
      if (error instanceof UnauthorizedException) throw error;
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async logout(userId: string, sessionId: string) {
    await this.prisma.jwtSession.updateMany({
      where: { userId, id: sessionId },
      data: { isActive: false },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOGOUT',
        details: { sessionId },
      },
    });

    return { message: 'Logged out successfully' };
  }

  async logoutAll(userId: string) {
    await this.prisma.jwtSession.updateMany({
      where: { userId, isActive: true },
      data: { isActive: false },
    });

    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'LOGOUT_ALL',
        details: {},
      },
    });

    return { message: 'Logged out from all sessions' };
  }

  async getSessions(userId: string) {
    return this.prisma.jwtSession.findMany({
      where: { userId, isActive: true },
      select: {
        id: true,
        deviceInfo: true,
        ipAddress: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(userId: string, sessionId: string) {
    const session = await this.prisma.jwtSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    await this.prisma.jwtSession.update({
      where: { id: sessionId },
      data: { isActive: false },
    });

    return { message: 'Session revoked' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        telegramId: true,
        phoneNumber: true,
        firstName: true,
        lastName: true,
        username: true,
        avatarUrl: true,
        email: true,
        isPremium: true,
        storageUsed: true,
        storageLimit: true,
        createdAt: true,
      },
    });

    return user;
  }

  private async generateTokens(
    userId: string,
    telegramId: string,
    sessionId: string,
  ) {
    const accessToken = this.jwtService.sign(
      { sub: userId, telegramId, sessionId },
      {
        secret: this.configService.get<string>('jwt.accessSecret'),
        expiresIn: this.configService.get<string>('jwt.accessExpiry'),
        issuer: this.configService.get<string>('jwt.issuer'),
      },
    );

    const refreshTokenValue = uuidv4();
    const refreshTokenExpiry = this.configService.get<string>('jwt.refreshExpiry', '7d');
    const expiryMs = this.parseDuration(refreshTokenExpiry);

    // Store refresh token
    await this.prisma.jwtSession.create({
      data: {
        userId,
        refreshToken: refreshTokenValue,
        expiresAt: new Date(Date.now() + expiryMs),
      },
    });

    const decoded = this.jwtService.decode(accessToken) as any;

    return {
      accessToken,
      refreshToken: refreshTokenValue,
      expiresIn: decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 900,
      tokenType: 'Bearer',
    };
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
    const value = parseInt(match[1], 10);
    const unit = match[2];
    switch (unit) {
      case 's': return value * 1000;
      case 'm': return value * 60 * 1000;
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      default: return 7 * 24 * 60 * 60 * 1000;
    }
  }

  private sanitizeUser(user: any) {
    const { password, ...safeUser } = user;
    return safeUser;
  }
}
