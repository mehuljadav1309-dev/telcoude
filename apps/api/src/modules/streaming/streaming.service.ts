import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  StreamableFile,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { CryptoService } from '../auth/services/crypto.service';
import { Response } from 'express';
import * as crypto from 'crypto';

@Injectable()
export class StreamingService {
  private readonly logger = new Logger(StreamingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly cryptoService: CryptoService,
  ) {}

  async streamFile(
    userId: string,
    fileId: string,
    res: Response,
    range?: string,
  ) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId, isDeleted: false },
    });

    if (!file) throw new NotFoundException('File not found');

    const telegramSession = await this.prisma.telegramSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (!telegramSession) {
      throw new BadRequestException('No active Telegram session');
    }

    const sessionString = this.cryptoService.decrypt(telegramSession.encryptedSession);
    const fileSize = Number(file.size);

    // Parse range header
    let start = 0;
    let end = fileSize - 1;
    let contentLength = fileSize;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      start = parseInt(parts[0], 10);
      end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize) {
        res.status(416).set({
          'Content-Range': `bytes */${fileSize}`,
        });
        return;
      }

      contentLength = end - start + 1;
    }

    try {
      const downloadResult = await this.telegramService.downloadFile(
        sessionString,
        file.telegramMessageId!,
        file.telegramChannelId!,
        file.telegramFileReference || '',
        { start, end },
      );

      // Handle decryption if needed
      let data = downloadResult.data;
      if (file.isEncrypted && file.encryptionKey && file.encryptionIv) {
        const decipher = crypto.createDecipheriv(
          'aes-256-cbc',
          Buffer.from(file.encryptionKey, 'hex'),
          Buffer.from(file.encryptionIv, 'hex'),
        );
        data = Buffer.concat([decipher.update(data), decipher.final()]);
      }

      const headers: any = {
        'Content-Type': file.mimeType,
        'Content-Length': contentLength,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Content-Disposition': `inline; filename="${file.name}"`,
      };

      if (range) {
        headers['Content-Range'] = `bytes ${start}-${end}/${fileSize}`;
        res.status(206);
      }

      res.set(headers);

      // Stream the data
      if (range) {
        res.send(data.slice(0, contentLength));
      } else {
        res.send(data);
      }

      // Log activity
      await this.prisma.activityLog.create({
        data: {
          userId,
          fileId,
          action: 'STREAM',
          details: { range: range || 'full', bytesTransferred: contentLength },
        },
      });
    } catch (error: any) {
      this.logger.error(`Stream error: ${error.message}`);
      throw new BadRequestException('Failed to stream file');
    }
  }

  async streamSharedFile(
    token: string,
    fileId: string,
    res: Response,
    range?: string,
  ) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!share || !share.isActive) {
      throw new NotFoundException('Share not found');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new BadRequestException('Share has expired');
    }

    return this.streamFile(share.userId, fileId, res, range);
  }

  async getStreamInfo(userId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId, isDeleted: false },
    });

    if (!file) throw new NotFoundException('File not found');

    return {
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: Number(file.size),
      supportsRange: true,
      isVideo: file.mimeType.startsWith('video/'),
      isAudio: file.mimeType.startsWith('audio/'),
      isImage: file.mimeType.startsWith('image/'),
      duration: file.duration,
      width: file.width,
      height: file.height,
    };
  }
}
