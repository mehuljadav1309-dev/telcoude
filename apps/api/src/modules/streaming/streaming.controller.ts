import {
  Controller,
  Get,
  Head,
  Param,
  Query,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { StreamingService } from './streaming.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Response, Request } from 'express';

@ApiTags('Streaming')
@Controller('stream')
export class StreamingController {
  constructor(private readonly streamingService: StreamingService) {}

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Stream a file with range support' })
  async stream(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.streamingService.streamFile(
      user.id,
      id,
      res,
      req.headers['range'],
    );
  }

  @Head(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get file stream info' })
  async streamInfo(
    @CurrentUser() user: any,
    @Param('id') id: string,
  ) {
    return this.streamingService.getStreamInfo(user.id, id);
  }

  @Get('shared/:token/:fileId')
  @ApiOperation({ summary: 'Stream a shared file (public)' })
  async streamShared(
    @Param('token') token: string,
    @Param('fileId') fileId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    return this.streamingService.streamSharedFile(
      token,
      fileId,
      res,
      req.headers['range'],
    );
  }
}
