import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { FoldersService } from './folders.service';
import { CreateFolderDto, UpdateFolderDto, MoveFolderDto } from './dto/folders.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Folders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('folders')
export class FoldersController {
  constructor(private readonly foldersService: FoldersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a folder' })
  async create(@CurrentUser() user: any, @Body() createFolderDto: CreateFolderDto) {
    return this.foldersService.create(user.id, createFolderDto);
  }

  @Get()
  @ApiOperation({ summary: 'List folders' })
  async findAll(
    @CurrentUser() user: any,
    @Query('parentId') parentId?: string,
  ) {
    return this.foldersService.findAll(user.id, parentId);
  }

  @Get('tree')
  @ApiOperation({ summary: 'Get folder tree' })
  async getTree(@CurrentUser() user: any) {
    return this.foldersService.buildFolderTree(user.id);
  }

  @Get('breadcrumb')
  @ApiOperation({ summary: 'Get breadcrumb trail' })
  async getBreadcrumb(
    @CurrentUser() user: any,
    @Query('folderId') folderId?: string,
  ) {
    return this.foldersService.getBreadcrumb(user.id, folderId);
  }

  @Get('contents')
  @ApiOperation({ summary: 'Get folder contents (folders + files)' })
  async getContents(
    @CurrentUser() user: any,
    @Query('folderId') folderId?: string,
  ) {
    return this.foldersService.getFolderContents(user.id, folderId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get folder details' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.foldersService.findOne(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update folder' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
  ) {
    return this.foldersService.update(user.id, id, updateFolderDto);
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Move folder' })
  async move(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() moveFolderDto: MoveFolderDto,
  ) {
    return this.foldersService.move(user.id, id, moveFolderDto);
  }

  @Post(':id/star')
  @ApiOperation({ summary: 'Toggle folder star' })
  async toggleStar(@CurrentUser() user: any, @Param('id') id: string) {
    return this.foldersService.toggleStar(user.id, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Move folder to trash' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.foldersService.softDelete(user.id, id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restore folder from trash' })
  async restore(@CurrentUser() user: any, @Param('id') id: string) {
    return this.foldersService.restore(user.id, id);
  }

  @Delete(':id/permanent')
  @ApiOperation({ summary: 'Permanently delete folder' })
  async permanentDelete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.foldersService.permanentDelete(user.id, id);
  }
}
