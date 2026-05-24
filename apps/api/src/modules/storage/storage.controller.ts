import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StorageService } from './storage.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Storage')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('storage')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get current storage usage' })
  async getUsage(@CurrentUser() user: any) {
    return this.storageService.getUsage(user.id);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get detailed storage analytics' })
  async getAnalytics(@CurrentUser() user: any) {
    return this.storageService.getDetailedAnalytics(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Get storage usage history' })
  async getHistory(
    @CurrentUser() user: any,
    @Query('days') days?: number,
  ) {
    return this.storageService.getUsageHistory(user.id, days || 30);
  }

  @Get('activity')
  @ApiOperation({ summary: 'Get activity logs' })
  async getActivity(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('action') action?: string,
  ) {
    return this.storageService.getActivityLogs(user.id, { page, limit, action });
  }
}
