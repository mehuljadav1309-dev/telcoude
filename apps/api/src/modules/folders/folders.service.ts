import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateFolderDto, UpdateFolderDto, MoveFolderDto } from './dto/folders.dto';

@Injectable()
export class FoldersService {
  private readonly logger = new Logger(FoldersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, createFolderDto: CreateFolderDto) {
    const { name, parentId } = createFolderDto;

    // Check for duplicate
    const existing = await this.prisma.folder.findFirst({
      where: { userId, parentId: parentId || null, name },
    });

    if (existing) {
      throw new ConflictException('A folder with this name already exists');
    }

    // Build path
    let path = `/${name}`;
    if (parentId) {
      const parent = await this.prisma.folder.findUnique({ where: { id: parentId } });
      if (!parent) throw new NotFoundException('Parent folder not found');
      path = `${parent.path}${path}`;
    }

    const folder = await this.prisma.folder.create({
      data: { userId, parentId: parentId || null, name, path },
    });

    return this.buildFolderTree(userId, parentId || null);
  }

  async findAll(userId: string, parentId?: string) {
    const folders = await this.prisma.folder.findMany({
      where: { userId, parentId: parentId || null, isTrashed: false },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { children: true, files: true } },
      },
    });

    return folders;
  }

  async findOne(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: false },
      include: {
        _count: { select: { children: true, files: true } },
        parent: { select: { id: true, name: true, path: true } },
      },
    });

    if (!folder) throw new NotFoundException('Folder not found');
    return folder;
  }

  async update(userId: string, folderId: string, updateFolderDto: UpdateFolderDto) {
    const folder = await this.findOne(userId, folderId);

    const data: any = {};
    if (updateFolderDto.name) {
      data.name = updateFolderDto.name;
      // Update path for all children
      const oldPath = folder.path;
      const newPath = folder.path.replace(/\/[^/]*$/, `/${updateFolderDto.name}`);
      data.path = newPath;

      // Update children paths
      await this.updateChildPaths(userId, folderId, oldPath, newPath);
    }
    if (updateFolderDto.icon !== undefined) data.icon = updateFolderDto.icon;
    if (updateFolderDto.color !== undefined) data.color = updateFolderDto.color;
    if (updateFolderDto.isStarred !== undefined) data.isStarred = updateFolderDto.isStarred;

    return this.prisma.folder.update({
      where: { id: folderId },
      data,
    });
  }

  private async updateChildPaths(
    userId: string,
    folderId: string,
    oldPath: string,
    newPath: string,
  ) {
    const children = await this.prisma.folder.findMany({
      where: { userId, parentId: folderId },
    });

    for (const child of children) {
      const childNewPath = child.path.replace(oldPath, newPath);
      await this.prisma.folder.update({
        where: { id: child.id },
        data: { path: childNewPath },
      });
      await this.updateChildPaths(userId, child.id, oldPath, newPath);
    }
  }

  async move(userId: string, folderId: string, moveFolderDto: MoveFolderDto) {
    const folder = await this.findOne(userId, folderId);
    const targetFolderId = moveFolderDto.parentId;

    // Prevent circular reference
    if (targetFolderId) {
      let current = targetFolderId;
      while (current) {
        if (current === folderId) {
          throw new ConflictException('Cannot move folder into itself or its children');
        }
        const parent = await this.prisma.folder.findUnique({
          where: { id: current },
          select: { parentId: true },
        });
        current = parent?.parentId || '';
      }
    }

    // Build new path
    let newPath = `/${folder.name}`;
    if (targetFolderId) {
      const target = await this.prisma.folder.findUnique({ where: { id: targetFolderId } });
      if (!target) throw new NotFoundException('Target folder not found');
      newPath = `${target.path}${newPath}`;
    }

    const oldPath = folder.path;
    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: {
        parentId: targetFolderId || null,
        path: newPath,
      },
    });

    // Update children paths
    await this.updateChildPaths(userId, folderId, oldPath, newPath);

    return updated;
  }

  async softDelete(userId: string, folderId: string) {
    const folder = await this.findOne(userId, folderId);

    // Recursively trash all children
    await this.trashChildren(userId, folderId);

    const updated = await this.prisma.folder.update({
      where: { id: folderId },
      data: { isTrashed: true, trashedAt: new Date() },
    });

    return updated;
  }

  private async trashChildren(userId: string, folderId: string) {
    const children = await this.prisma.folder.findMany({
      where: { userId, parentId: folderId },
    });

    for (const child of children) {
      await this.prisma.folder.update({
        where: { id: child.id },
        data: { isTrashed: true, trashedAt: new Date() },
      });
      await this.trashChildren(userId, child.id);
    }

    // Also trash files in this folder
    await this.prisma.file.updateMany({
      where: { userId, folderId },
      data: { isTrashed: true, trashedAt: new Date() },
    });
  }

  async restore(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId, isTrashed: true },
    });
    if (!folder) throw new NotFoundException('Trashed folder not found');

    await this.restoreChildren(userId, folderId);

    return this.prisma.folder.update({
      where: { id: folderId },
      data: { isTrashed: false, trashedAt: null },
    });
  }

  private async restoreChildren(userId: string, folderId: string) {
    const children = await this.prisma.folder.findMany({
      where: { userId, parentId: folderId },
    });

    for (const child of children) {
      await this.prisma.folder.update({
        where: { id: child.id },
        data: { isTrashed: false, trashedAt: null },
      });
      await this.restoreChildren(userId, child.id);
    }

    await this.prisma.file.updateMany({
      where: { userId, folderId },
      data: { isTrashed: false, trashedAt: null },
    });
  }

  async permanentDelete(userId: string, folderId: string) {
    const folder = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
    });
    if (!folder) throw new NotFoundException('Folder not found');

    // Recursively delete children
    await this.permanentDeleteChildren(userId, folderId);

    // Delete files in this folder
    await this.prisma.file.updateMany({
      where: { userId, folderId },
      data: { isDeleted: true, deletedAt: new Date(), folderId: null },
    });

    await this.prisma.folder.delete({ where: { id: folderId } });

    return { message: 'Folder permanently deleted' };
  }

  private async permanentDeleteChildren(userId: string, folderId: string) {
    const children = await this.prisma.folder.findMany({
      where: { userId, parentId: folderId },
    });

    for (const child of children) {
      await this.permanentDeleteChildren(userId, child.id);
      await this.prisma.file.updateMany({
        where: { userId, folderId: child.id },
        data: { isDeleted: true, deletedAt: new Date(), folderId: null },
      });
      await this.prisma.folder.delete({ where: { id: child.id } });
    }
  }

  async buildFolderTree(userId: string, parentId: string | null = null): Promise<any> {
    const folders = await this.prisma.folder.findMany({
      where: { userId, isTrashed: false },
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { children: true, files: true } },
      },
    });

    const buildTree = (parentId: string | null): any[] => {
      return folders
        .filter((f) => f.parentId === parentId)
        .map((f) => ({
          ...f,
          children: buildTree(f.id),
        }));
    };

    return buildTree(parentId);
  }

  async getBreadcrumb(userId: string, folderId?: string) {
    const breadcrumbs: any[] = [];

    if (!folderId) {
      return [{ id: null, name: 'My Drive', path: '/' }];
    }

    let current = await this.prisma.folder.findFirst({
      where: { id: folderId, userId },
    });

    while (current) {
      breadcrumbs.unshift({
        id: current.id,
        name: current.name,
        path: current.path,
      });
      current = current.parentId
        ? await this.prisma.folder.findUnique({ where: { id: current.parentId } })
        : null;
    }

    breadcrumbs.unshift({ id: null, name: 'My Drive', path: '/' });
    return breadcrumbs;
  }

  async getFolderContents(userId: string, folderId?: string) {
    const [folders, files] = await Promise.all([
      this.prisma.folder.findMany({
        where: { userId, parentId: folderId || null, isTrashed: false },
        orderBy: { name: 'asc' },
        include: {
          _count: { select: { children: true, files: true } },
        },
      }),
      this.prisma.file.findMany({
        where: { userId, folderId: folderId || null, isDeleted: false, isTrashed: false },
        orderBy: { createdAt: 'desc' },
        include: {
          thumbnail: {
            select: { id: true, width: true, height: true, mimeType: true },
          },
        },
      }),
    ]);

    return { folders, files };
  }

  async toggleStar(userId: string, folderId: string) {
    const folder = await this.findOne(userId, folderId);
    return this.prisma.folder.update({
      where: { id: folderId },
      data: { isStarred: !folder.isStarred },
    });
  }
}
