import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  MaxFileSizeValidator,
  ParseFilePipe,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { FilesService } from './files.service';
import { CreateFileDto, UpdateFileDto, MoveFileDto, CopyFileDto } from './dto/files.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Files')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload a file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async upload(
    @CurrentUser() user: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2097152000 }),
        ],
      }),
    ) file: Express.Multer.File,
    @Body() createFileDto: CreateFileDto,
  ) {
    return this.filesService.create(
      user.id,
      { ...createFileDto, name: createFileDto.name || file.originalname },
      file.buffer,
      file.mimetype,
    );
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 20))
  async uploadMultiple(
    @CurrentUser() user: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: any,
  ) {
    const results = [];
    for (const file of files) {
      const result = await this.filesService.create(
        user.id,
        { name: body.name || file.originalname, folderId: body.folderId },
        file.buffer,
        file.mimetype,
      );
      results.push(result);
    }
    return results;
  }

  @Get()
  @ApiOperation({ summary: 'List files' })
  async findAll(
    @CurrentUser() user: any,
    @Query('folderId') folderId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('type') type?: string,
    @Query('starred') starred?: string,
    @Query('trashed') trashed?: string,
  ) {
    return this.filesService.findAll(user.id, folderId, {
      page,
      limit,
      sortBy,
      sortOrder,
      type,
      starred: starred === 'true' ? true : undefined,
      trashed: trashed === 'true' ? true : false,
    });
  }

  @Get('recent')
  @ApiOperation({ summary: 'Get recent files' })
  async getRecent(
    @CurrentUser() user: any,
    @Query('limit') limit?: number,
  ) {
    return this.filesService.getRecentFiles(user.id, limit || 20);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get storage statistics' })
  async getStats(@CurrentUser() user: any) {
    return this.filesService.getStorageStats(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get file details' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.findOne(user.id, id);
  }

  @Get(':id/versions')
  @ApiOperation({ summary: 'Get file versions' })
  async getVersions(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.getFileVersions(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update file (rename, star, etc.)' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateFileDto: UpdateFileDto,
  ) {
    return this.filesService.update(user.id, id, updateFileDto);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move file to folder' })
  async move(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() moveFileDto: MoveFileDto,
  ) {
    return this.filesService.move(user.id, id, moveFileDto);
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Copy file' })
  async copy(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() copyFileDto: CopyFileDto,
  ) {
    return this.filesService.copy(user.id, id, copyFileDto);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Toggle file star' })
  async toggleStar(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.toggleStar(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Move file to trash' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.softDelete(user.id, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore file from trash' })
  async restore(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.restore(user.id, id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete file' })
  async permanentDelete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.filesService.permanentDelete(user.id, id);
  }

  @Delete('trash/empty')
  @ApiOperation({ summary: 'Empty trash' })
  async emptyTrash(@CurrentUser() user: any) {
    return this.filesService.emptyTrash(user.id);
  }
}
