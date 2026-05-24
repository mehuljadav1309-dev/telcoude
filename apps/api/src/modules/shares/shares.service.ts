import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CryptoService } from '../auth/services/crypto.service';
import { CreateShareDto, UpdateShareDto } from './dto/shares.dto';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SharesService {
  private readonly logger = new Logger(SharesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(userId: string, createShareDto: CreateShareDto) {
    const { fileId, folderId, permission, password, maxDownloads, expiresInDays } = createShareDto;

    if (!fileId && !folderId) {
      throw new BadRequestException('Must specify a file or folder to share');
    }

    // Verify ownership
    if (fileId) {
      const file = await this.prisma.file.findFirst({
        where: { id: fileId, userId, isDeleted: false },
      });
      if (!file) throw new NotFoundException('File not found');
    }
    if (folderId) {
      const folder = await this.prisma.folder.findFirst({
        where: { id: folderId, userId, isTrashed: false },
      });
      if (!folder) throw new NotFoundException('Folder not found');
    }

    let hashedPassword: string | undefined;
    if (password) {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const share = await this.prisma.share.create({
      data: {
        userId,
        fileId: fileId || null,
        folderId: folderId || null,
        token: uuidv4().replace(/-/g, '').substring(0, 16),
        permission: permission || 'VIEW',
        password: hashedPassword,
        maxDownloads: maxDownloads || null,
        expiresAt: expiresInDays
          ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
          : null,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'CREATE_SHARE',
        details: { shareId: share.id, fileId, folderId, permission },
      },
    });

    return share;
  }

  async findByToken(token: string, inputPassword?: string) {
    const share = await this.prisma.share.findUnique({
      where: { token },
      include: {
        file: {
          select: {
            id: true,
            name: true,
            mimeType: true,
            size: true,
            extension: true,
            thumbnail: { select: { id: true, width: true, height: true } },
          },
        },
        folder: {
          select: {
            id: true,
            name: true,
            path: true,
            _count: { select: { children: true, files: true } },
          },
        },
        user: {
          select: { firstName: true, lastName: true, username: true },
        },
      },
    });

    if (!share || !share.isActive) {
      throw new NotFoundException('Share not found');
    }

    if (share.expiresAt && share.expiresAt < new Date()) {
      throw new BadRequestException('Share link has expired');
    }

    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      throw new BadRequestException('Share link has reached maximum downloads');
    }

    // Verify password
    if (share.password) {
      if (!inputPassword) {
        return { requiresPassword: true, shareId: share.id };
      }
      const isValid = await bcrypt.compare(inputPassword, share.password);
      if (!isValid) {
        throw new BadRequestException('Invalid password');
      }
    }

    return share;
  }

  async accessShare(token: string, password?: string) {
    const share = await this.findByToken(token, password);

    if ((share as any).requiresPassword) {
      return share;
    }

    // Increment download count
    await this.prisma.share.update({
      where: { token },
      data: { downloadCount: { increment: 1 } },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId: share.userId,
        fileId: share.fileId || undefined,
        action: 'SHARE_ACCESS',
        details: { shareToken: token, permission: share.permission },
      },
    });

    return share;
  }

  async findAll(userId: string) {
    return this.prisma.share.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        file: {
          select: { id: true, name: true, mimeType: true, extension: true },
        },
        folder: {
          select: { id: true, name: true, path: true },
        },
      },
    });
  }

  async findOne(userId: string, shareId: string) {
    const share = await this.prisma.share.findFirst({
      where: { id: shareId, userId },
      include: {
        file: {
          select: { id: true, name: true, mimeType: true, size: true },
        },
      },
    });

    if (!share) throw new NotFoundException('Share not found');
    return share;
  }

  async update(userId: string, shareId: string, updateShareDto: UpdateShareDto) {
    const share = await this.findOne(userId, shareId);

    const data: any = {};
    if (updateShareDto.permission) data.permission = updateShareDto.permission;
    if (updateShareDto.maxDownloads !== undefined) data.maxDownloads = updateShareDto.maxDownloads;
    if (updateShareDto.expiresInDays !== undefined) {
      data.expiresAt = new Date(Date.now() + updateShareDto.expiresInDays * 24 * 60 * 60 * 1000);
    }
    if (updateShareDto.isActive !== undefined) data.isActive = updateShareDto.isActive;
    if (updateShareDto.password !== undefined) {
      data.password = updateShareDto.password
        ? await bcrypt.hash(updateShareDto.password, 10)
        : null;
    }

    return this.prisma.share.update({
      where: { id: shareId },
      data,
    });
  }

  async remove(userId: string, shareId: string) {
    const share = await this.findOne(userId, shareId);
    await this.prisma.share.delete({ where: { id: shareId } });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        action: 'DELETE_SHARE',
        details: { shareId },
      },
    });

    return { message: 'Share link deleted' };
  }

  async getShareAnalytics(userId: string, shareId: string) {
    const share = await this.findOne(userId, shareId);

    return {
      id: share.id,
      token: share.token,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      createdAt: share.createdAt,
      expiresAt: share.expiresAt,
      isActive: share.isActive,
      accessCount: share.downloadCount,
    };
  }

  async cleanupExpiredShares() {
    const result = await this.prisma.share.updateMany({
      where: {
        expiresAt: { lte: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });

    this.logger.log(`Cleaned up ${result.count} expired shares`);
    return result;
  }
}
