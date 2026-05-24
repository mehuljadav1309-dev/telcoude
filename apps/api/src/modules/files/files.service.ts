import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { TelegramService } from '../telegram/telegram.service';
import { QueueService } from '../queue/queue.service';
import { CryptoService } from '../auth/services/crypto.service';
import { CreateFileDto, UpdateFileDto, MoveFileDto, CopyFileDto } from './dto/files.dto';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly telegramService: TelegramService,
    private readonly queueService: QueueService,
    private readonly cryptoService: CryptoService,
  ) {}

  async create(
    userId: string,
    createFileDto: CreateFileDto,
    fileBuffer: Buffer,
    mimetype: string,
  ) {
    const { name, folderId, isEncrypted } = createFileDto;

    // Check for duplicates
    const existing = await this.prisma.file.findFirst({
      where: { userId, folderId: folderId || null, name, isDeleted: false },
    });

    if (existing) {
      throw new ConflictException('A file with this name already exists in this folder');
    }

    // Check storage limits
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const newSize = BigInt(fileBuffer.length);
    if (user.storageUsed + newSize > user.storageLimit) {
      throw new BadRequestException('Storage limit exceeded');
    }

    // Compute file hash
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // Check for deduplication
    const duplicateFile = await this.prisma.file.findFirst({
      where: { userId, hash: fileHash, isDeleted: false },
    });

    // Encrypt if requested
    let fileData = fileBuffer;
    let encryptionKey: string | undefined;
    let encryptionIv: string | undefined;

    if (isEncrypted) {
      encryptionKey = this.cryptoService.generateKey();
      encryptionIv = this.cryptoService.generateIv();
      const cipher = crypto.createCipheriv(
        'aes-256-cbc',
        Buffer.from(encryptionKey, 'hex'),
        Buffer.from(encryptionIv, 'hex'),
      );
      fileData = Buffer.concat([
        cipher.update(fileBuffer),
        cipher.final(),
      ]);
    }

    // Get Telegram session
    const telegramSession = await this.prisma.telegramSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (!telegramSession) {
      throw new BadRequestException('No active Telegram session');
    }

    const sessionString = this.cryptoService.decrypt(telegramSession.encryptedSession);

    // Upload to Telegram
    const uploadResult = await this.telegramService.uploadFile(
      sessionString,
      fileData,
      name,
      mimetype,
    );

    // Extract metadata
    const extension = path.extname(name).toLowerCase();
    const metadata: any = {
      originalSize: fileBuffer.length,
      compressedSize: fileData.length,
      isDuplicate: !!duplicateFile,
    };

    // Create file record
    const file = await this.prisma.file.create({
      data: {
        userId,
        folderId: folderId || null,
        name,
        originalName: name,
        mimeType: mimetype,
        extension,
        size: BigInt(fileData.length),
        hash: fileHash,
        hashAlgorithm: 'sha256',
        telegramMessageId: uploadResult.messageId,
        telegramChannelId: uploadResult.channelId,
        telegramFileReference: uploadResult.fileReference,
        isEncrypted: isEncrypted || false,
        encryptionKey,
        encryptionIv,
        metadata,
        ...(duplicateFile && { parentVersionId: duplicateFile.id }),
      },
    });

    // Update storage usage
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { increment: newSize } },
    });

    // Update folder file count
    if (folderId) {
      await this.prisma.folder.update({
        where: { id: folderId },
        data: {
          fileCount: { increment: 1 },
          totalSize: { increment: newSize },
        },
      });
    }

    // Queue thumbnail generation for images
    if (mimetype.startsWith('image/') || mimetype.startsWith('video/')) {
      await this.queueService.addJob('thumbnail', {
        fileId: file.id,
        userId,
        mimeType: mimetype,
      });
    }

    // Queue metadata extraction
    await this.queueService.addJob('metadata', {
      fileId: file.id,
      userId,
      mimeType: mimetype,
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId: file.id,
        action: 'UPLOAD',
        details: { fileName: name, size: fileBuffer.length, mimeType: mimetype },
      },
    });

    return file;
  }

  async findAll(
    userId: string,
    folderId?: string,
    options: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
      type?: string;
      starred?: boolean;
      trashed?: boolean;
    } = {},
  ) {
    const {
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      type,
      starred,
      trashed = false,
    } = options;

    const where: any = {
      userId,
      isDeleted: false,
      isTrashed: trashed,
      ...(folderId ? { folderId } : { folderId: null }),
      ...(starred !== undefined && { isStarred: starred }),
      ...(type && { mimeType: { startsWith: type } }),
    };

    const [files, total] = await Promise.all([
      this.prisma.file.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          thumbnail: {
            select: { id: true, width: true, height: true, mimeType: true },
          },
        },
      }),
      this.prisma.file.count({ where }),
    ]);

    return {
      data: files,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    };
  }

  async findOne(userId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId, isDeleted: false },
      include: {
        thumbnail: true,
        folder: { select: { id: true, name: true, path: true } },
      },
    });

    if (!file) throw new NotFoundException('File not found');
    return file;
  }

  async update(userId: string, fileId: string, updateFileDto: UpdateFileDto) {
    const file = await this.findOne(userId, fileId);

    const data: any = {};
    if (updateFileDto.name) {
      // Rename in Telegram
      if (file.telegramChannelId && file.telegramMessageId) {
        const telegramSession = await this.prisma.telegramSession.findFirst({
          where: { userId, isActive: true },
          orderBy: { lastUsedAt: 'desc' },
        });

        if (telegramSession) {
          const sessionString = this.cryptoService.decrypt(telegramSession.encryptedSession);
          await this.telegramService.renameMessage(
            sessionString,
            file.telegramChannelId,
            file.telegramMessageId,
            updateFileDto.name,
          );
        }
      }
      data.name = updateFileDto.name;
    }
    if (updateFileDto.isStarred !== undefined) data.isStarred = updateFileDto.isStarred;
    if (updateFileDto.description !== undefined) data.description = updateFileDto.description;
    if (updateFileDto.tags !== undefined) data.tags = updateFileDto.tags;

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data,
    });

    // Log activity
    if (updateFileDto.name) {
      await this.prisma.activityLog.create({
        data: {
          userId,
          fileId,
          action: 'RENAME',
          details: { oldName: file.name, newName: updateFileDto.name },
        },
      });
    }

    return updated;
  }

  async move(userId: string, fileId: string, moveFileDto: MoveFileDto) {
    const file = await this.findOne(userId, fileId);

    // Check for duplicate in target folder
    const existing = await this.prisma.file.findFirst({
      where: {
        userId,
        folderId: moveFileDto.folderId || null,
        name: file.name,
        isDeleted: false,
        id: { not: fileId },
      },
    });

    if (existing) {
      throw new ConflictException('A file with this name already exists in the target folder');
    }

    const oldFolderId = file.folderId;

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { folderId: moveFileDto.folderId || null },
    });

    // Update folder counts
    if (oldFolderId) {
      await this.prisma.folder.update({
        where: { id: oldFolderId },
        data: {
          fileCount: { decrement: 1 },
          totalSize: { decrement: file.size },
        },
      });
    }
    if (moveFileDto.folderId) {
      await this.prisma.folder.update({
        where: { id: moveFileDto.folderId },
        data: {
          fileCount: { increment: 1 },
          totalSize: { increment: file.size },
        },
      });
    }

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId,
        action: 'MOVE',
        details: { oldFolderId, newFolderId: moveFileDto.folderId },
      },
    });

    return updated;
  }

  async copy(userId: string, fileId: string, copyFileDto: CopyFileDto) {
    const file = await this.findOne(userId, fileId);

    // Check for duplicate name in target
    const existing = await this.prisma.file.findFirst({
      where: {
        userId,
        folderId: copyFileDto.folderId || null,
        name: file.name,
        isDeleted: false,
      },
    });

    const newName = existing
      ? `${path.parse(file.name).name} (copy)${file.extension}`
      : file.name;

    // Get Telegram session
    const telegramSession = await this.prisma.telegramSession.findFirst({
      where: { userId, isActive: true },
      orderBy: { lastUsedAt: 'desc' },
    });

    if (!telegramSession) {
      throw new BadRequestException('No active Telegram session');
    }

    const sessionString = this.cryptoService.decrypt(telegramSession.encryptedSession);

    // Download and re-upload
    const downloadResult = await this.telegramService.downloadFile(
      sessionString,
      file.telegramMessageId!,
      file.telegramChannelId!,
      file.telegramFileReference || '',
    );

    const uploadResult = await this.telegramService.uploadFile(
      sessionString,
      downloadResult.data,
      newName,
      file.mimeType,
    );

    const newFile = await this.prisma.file.create({
      data: {
        userId,
        folderId: copyFileDto.folderId || null,
        name: newName,
        originalName: file.originalName,
        mimeType: file.mimeType,
        extension: file.extension,
        size: file.size,
        hash: file.hash,
        hashAlgorithm: file.hashAlgorithm,
        telegramMessageId: uploadResult.messageId,
        telegramChannelId: uploadResult.channelId,
        telegramFileReference: uploadResult.fileReference,
        isStarred: false,
        parentVersionId: file.id,
        version: 1,
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId: newFile.id,
        action: 'COPY',
        details: { sourceFileId: fileId, sourceName: file.name },
      },
    });

    return newFile;
  }

  async softDelete(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: {
        isTrashed: true,
        trashedAt: new Date(),
      },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId,
        action: 'TRASH',
        details: { name: file.name },
      },
    });

    return updated;
  }

  async restore(userId: string, fileId: string) {
    const file = await this.prisma.file.findFirst({
      where: { id: fileId, userId, isTrashed: true },
    });

    if (!file) throw new NotFoundException('Trashed file not found');

    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { isTrashed: false, trashedAt: null },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId,
        action: 'RESTORE',
        details: { name: file.name },
      },
    });

    return updated;
  }

  async permanentDelete(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);

    // Delete from Telegram
    if (file.telegramChannelId && file.telegramMessageId) {
      const telegramSession = await this.prisma.telegramSession.findFirst({
        where: { userId, isActive: true },
        orderBy: { lastUsedAt: 'desc' },
      });

      if (telegramSession) {
        try {
          const sessionString = this.cryptoService.decrypt(telegramSession.encryptedSession);
          await this.telegramService.deleteMessage(
            sessionString,
            file.telegramChannelId,
            [file.telegramMessageId],
          );
        } catch (error: any) {
          this.logger.warn(`Failed to delete from Telegram: ${error.message}`);
        }
      }
    }

    // Delete from database
    await this.prisma.file.update({
      where: { id: fileId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        isTrashed: false,
        folderId: null,
      },
    });

    // Update storage
    await this.prisma.user.update({
      where: { id: userId },
      data: { storageUsed: { decrement: file.size } },
    });

    // Log activity
    await this.prisma.activityLog.create({
      data: {
        userId,
        fileId,
        action: 'DELETE',
        details: { name: file.name, size: Number(file.size) },
      },
    });

    return { message: 'File permanently deleted' };
  }

  async emptyTrash(userId: string) {
    const trashedFiles = await this.prisma.file.findMany({
      where: { userId, isTrashed: true, isDeleted: false },
    });

    for (const file of trashedFiles) {
      await this.permanentDelete(userId, file.id);
    }

    return { message: `Permanently deleted ${trashedFiles.length} files` };
  }

  async toggleStar(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);
    const updated = await this.prisma.file.update({
      where: { id: fileId },
      data: { isStarred: !file.isStarred },
    });
    return updated;
  }

  async getRecentFiles(userId: string, limit: number = 20) {
    return this.prisma.file.findMany({
      where: { userId, isDeleted: false, isTrashed: false },
      orderBy: { updatedAt: 'desc' },
      take: limit,
      include: {
        thumbnail: {
          select: { id: true, width: true, height: true },
        },
      },
    });
  }

  async getFileVersions(userId: string, fileId: string) {
    const file = await this.findOne(userId, fileId);
    const versions = await this.prisma.file.findMany({
      where: {
        userId,
        OR: [
          { parentVersionId: file.hash },
          { id: file.parentVersionId || undefined },
          { hash: file.hash },
        ],
        isDeleted: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    return versions;
  }

  async getStorageStats(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { storageUsed: true, storageLimit: true },
    });

    const fileTypeStats = await this.prisma.file.groupBy({
      by: ['mimeType'],
      where: { userId, isDeleted: false, isTrashed: false },
      _count: { id: true },
      _sum: { size: true },
    });

    const totalFiles = await this.prisma.file.count({
      where: { userId, isDeleted: false, isTrashed: false },
    });

    return {
      used: Number(user?.storageUsed || 0),
      limit: Number(user?.storageLimit || 0),
      usagePercent: Number((Number(user?.storageUsed || 0) / Number(user?.storageLimit || 1)) * 100).toFixed(2),
      totalFiles,
      fileTypes: fileTypeStats.map((stat) => ({
        mimeType: stat.mimeType,
        count: stat._count.id,
        totalSize: Number(stat._sum.size || 0),
      })),
    };
  }
}
