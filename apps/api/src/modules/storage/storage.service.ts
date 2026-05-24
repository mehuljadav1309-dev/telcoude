import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getUsage(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        storageUsed: true,
        storageLimit: true,
        isPremium: true,
      },
    });

    if (!user) {
      throw new Error('User not found');
    }

    const fileTypeStats = await this.prisma.file.groupBy({
      by: ['mimeType'],
      where: { userId, isDeleted: false, isTrashed: false },
      _count: { id: true },
      _sum: { size: true },
    });

    const totalFiles = await this.prisma.file.count({
      where: { userId, isDeleted: false, isTrashed: false },
    });

    const totalFolders = await this.prisma.folder.count({
      where: { userId, isTrashed: false },
    });

    const usagePercent = Number(user.storageUsed) / Number(user.storageLimit);

    return {
      used: Number(user.storageUsed),
      limit: Number(user.storageLimit),
      usagePercent: Math.round(usagePercent * 10000) / 100,
      remaining: Number(user.storageLimit) - Number(user.storageUsed),
      isPremium: user.isPremium,
      totalFiles,
      totalFolders,
      fileTypes: fileTypeStats.map((stat) => ({
        mimeType: stat.mimeType,
        count: stat._count.id,
        totalSize: Number(stat._sum.size || 0),
      })),
    };
  }

  async getUsageHistory(userId: string, days: number = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const records = await this.prisma.storageAnalytics.findMany({
      where: {
        userId,
        recordedAt: { gte: since },
      },
      orderBy: { recordedAt: 'asc' },
      select: {
        totalFiles: true,
        totalSize: true,
        recordedAt: true,
      },
    });

    return records;
  }

  async getDetailedAnalytics(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new Error('User not found');

    // File size distribution
    const sizeDistribution = await this.getSizeDistribution(userId);

    // Activity over time
    const recentActivity = await this.prisma.activityLog.count({
      where: {
        userId,
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      },
    });

    // Top file types
    const topTypes = await this.prisma.file.groupBy({
      by: ['mimeType'],
      where: { userId, isDeleted: false, isTrashed: false },
      _count: { id: true },
      _sum: { size: true },
      orderBy: { _sum: { size: 'desc' } },
      take: 10,
    });

    return {
      totalFiles: await this.prisma.file.count({
        where: { userId, isDeleted: false, isTrashed: false },
      }),
      totalFolders: await this.prisma.folder.count({
        where: { userId, isTrashed: false },
      }),
      trashedFiles: await this.prisma.file.count({
        where: { userId, isTrashed: true, isDeleted: false },
      }),
      starredFiles: await this.prisma.file.count({
        where: { userId, isStarred: true, isDeleted: false },
      }),
      recentActivity,
      sizeDistribution,
      topFileTypes: topTypes.map((t) => ({
        mimeType: t.mimeType,
        count: t._count.id,
        totalSize: Number(t._sum.size || 0),
      })),
      storageUsed: Number(user.storageUsed),
      storageLimit: Number(user.storageLimit),
    };
  }

  private async getSizeDistribution(userId: string) {
    const files = await this.prisma.file.findMany({
      where: { userId, isDeleted: false, isTrashed: false },
      select: { size: true },
    });

    return {
      tiny: files.filter((f) => Number(f.size) < 1024 * 10).length, // < 10KB
      small: files.filter((f) => Number(f.size) >= 1024 * 10 && Number(f.size) < 1024 * 1024).length, // 10KB - 1MB
      medium: files.filter((f) => Number(f.size) >= 1024 * 1024 && Number(f.size) < 100 * 1024 * 1024).length, // 1MB - 100MB
      large: files.filter((f) => Number(f.size) >= 100 * 1024 * 1024 && Number(f.size) < 1024 * 1024 * 1024).length, // 100MB - 1GB
      huge: files.filter((f) => Number(f.size) >= 1024 * 1024 * 1024).length, // > 1GB
    };
  }

  async getActivityLogs(
    userId: string,
    options: { page?: number; limit?: number; action?: string } = {},
  ) {
    const { page = 1, limit = 50, action } = options;

    const where: any = { userId };
    if (action) where.action = action;

    const [logs, total] = await Promise.all([
      this.prisma.activityLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          file: { select: { id: true, name: true, mimeType: true } },
        },
      }),
      this.prisma.activityLog.count({ where }),
    ]);

    return {
      data: logs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
