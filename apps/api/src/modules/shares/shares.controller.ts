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
import { SharesService } from './shares.service';
import { CreateShareDto, UpdateShareDto, AccessShareDto } from './dto/shares.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Shares')
@Controller('shares')
export class SharesController {
  constructor(private readonly sharesService: SharesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a share link' })
  async create(@CurrentUser() user: any, @Body() createShareDto: CreateShareDto) {
    return this.sharesService.create(user.id, createShareDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List user shares' })
  async findAll(@CurrentUser() user: any) {
    return this.sharesService.findAll(user.id);
  }

  @Get('access/:token')
  @ApiOperation({ summary: 'Access a shared file (public)' })
  async accessByToken(
    @Param('token') token: string,
    @Query('password') password?: string,
  ) {
    return this.sharesService.accessShare(token, password);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get share details' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sharesService.findOne(user.id, id);
  }

  @Get(':id/analytics')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get share analytics' })
  async getAnalytics(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sharesService.getShareAnalytics(user.id, id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update share settings' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() updateShareDto: UpdateShareDto,
  ) {
    return this.sharesService.update(user.id, id, updateShareDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete share link' })
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    return this.sharesService.remove(user.id, id);
  }
}
