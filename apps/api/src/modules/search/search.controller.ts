import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Search')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Search files and folders' })
  async search(
    @CurrentUser() user: any,
    @Query('q') query: string,
    @Query('type') type?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.searchService.search(user.id, query, {
      type,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }

  @Get('global')
  @ApiOperation({ summary: 'Quick global search' })
  async globalSearch(
    @CurrentUser() user: any,
    @Query('q') query: string,
  ) {
    return this.searchService.globalSearch(user.id, query);
  }

  @Get('folders')
  @ApiOperation({ summary: 'Search folders' })
  async searchFolders(
    @CurrentUser() user: any,
    @Query('q') query: string,
  ) {
    return this.searchService.searchFolders(user.id, query);
  }
}
