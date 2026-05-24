import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private readonly prisma: PrismaService) {}

  async search(
    userId: string,
    query: string,
    options: {
      type?: string;
      dateFrom?: Date;
      dateTo?: Date;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    } = {},
  ) {
    const {
      type,
      dateFrom,
      dateTo,
      page = 1,
      limit = 50,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = options;

    const where: any = {
      userId,
      isDeleted: false,
      isTrashed: false,
      OR: [
        { name: { contains: query, mode: 'insensitive' } },
        { originalName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { tags: { has: query.toLowerCase() } },
        { mimeType: { contains: query, mode: 'insensitive' } },
      ],
    };

    if (type) {
      where.mimeType = { startsWith: type };
    }
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

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
          folder: {
            select: { id: true, name: true, path: true },
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
        query,
      },
    };
  }

  async searchFolders(userId: string, query: string) {
    return this.prisma.folder.findMany({
      where: {
        userId,
        isTrashed: false,
        name: { contains: query, mode: 'insensitive' },
      },
      orderBy: { name: 'asc' },
      take: 20,
    });
  }

  async globalSearch(
    userId: string,
    query: string,
    limit: number = 10,
  ) {
    const [files, folders] = await Promise.all([
      this.prisma.file.findMany({
        where: {
          userId,
          isDeleted: false,
          isTrashed: false,
          name: { contains: query, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        include: {
          thumbnail: {
            select: { id: true, width: true, height: true },
          },
          folder: {
            select: { id: true, name: true },
          },
        },
      }),
      this.prisma.folder.findMany({
        where: {
          userId,
          isTrashed: false,
          name: { contains: query, mode: 'insensitive' },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
    ]);

    return { files, folders };
  }
}
