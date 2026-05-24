import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Queue as BullQueue, Worker, QueueEvents, Job } from 'bullmq';
import { PrismaService } from '../../database/prisma.service';

interface JobPayload {
  type: 'thumbnail' | 'metadata' | 'video_processing' | 'cleanup' | 'share_expiration' | 'virus_scan';
  data: Record<string, any>;
}

@Injectable()
export class QueueService implements OnModuleDestroy {
  private readonly logger = new Logger(QueueService.name);
  private queues: Map<string, BullQueue> = new Map();
  private workers: Worker[] = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.initializeQueues();
  }

  private initializeQueues() {
    const connection = { url: this.configService.get<string>('REDIS_URL', 'redis://localhost:6379') };
    const defaultOptions = {
      connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 50,
      },
    };

    // Define queues
    const queueNames = [
      'uploads',
      'thumbnails',
      'metadata',
      'video-processing',
      'cleanup',
      'share-expiration',
      'virus-scan',
    ];

    for (const name of queueNames) {
      const queue = new BullQueue(name, defaultOptions);
      this.queues.set(name, queue);
    }

    this.logger.log('Initialized all queues');
  }

  async addJob(
    type: string,
    data: Record<string, any>,
    options?: { priority?: number; delay?: number },
  ) {
    const queueMap: Record<string, string> = {
      thumbnail: 'thumbnails',
      metadata: 'metadata',
      video_processing: 'video-processing',
      cleanup: 'cleanup',
      share_expiration: 'share-expiration',
      virus_scan: 'virus-scan',
      upload: 'uploads',
    };

    const queueName = queueMap[type];
    if (!queueName) {
      this.logger.warn(`Unknown job type: ${type}`);
      return;
    }

    const queue = this.queues.get(queueName);
    if (!queue) {
      this.logger.error(`Queue not found: ${queueName}`);
      return;
    }

    const job = await queue.add(type, data, {
      priority: options?.priority || 0,
      delay: options?.delay || 0,
      jobId: `${type}-${data.fileId || data.id || Date.now()}`,
    });

    this.logger.log(`Added job ${job.id} to queue ${queueName}`);
    return job;
  }

  async getJobStatus(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const job = await queue.getJob(jobId);
    if (!job) return null;

    return {
      id: job.id,
      name: job.name,
      data: job.data,
      progress: job.progress,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      failedReason: job.failedReason,
      finishedOn: job.finishedOn,
      processedOn: job.processedOn,
      status: await job.getState(),
    };
  }

  async getQueueMetrics(queueName: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return null;

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return { waiting, active, completed, failed, delayed };
  }

  async removeJob(queueName: string, jobId: string) {
    const queue = this.queues.get(queueName);
    if (!queue) return;

    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async handleCleanupJobs() {
    this.logger.log('Running scheduled cleanup jobs');
    await this.addJob('cleanup', { type: 'cleanup_expired' });
    await this.addJob('share_expiration', { type: 'expire_shares' });

    // Clean up old upload chunks
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    await this.prisma.uploadChunk.deleteMany({
      where: {
        createdAt: { lt: twentyFourHoursAgo },
        job: { status: { in: ['COMPLETED', 'FAILED'] } },
      },
    });
  }

  @Cron(CronExpression.EVERY_30_MINUTES)
  async handleShareExpiration() {
    await this.prisma.share.updateMany({
      where: {
        expiresAt: { lte: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleStorageAnalytics() {
    const users = await this.prisma.user.findMany({
      select: { id: true, storageUsed: true, storageLimit: true },
    });

    for (const user of users) {
      const fileStats = await this.prisma.file.groupBy({
        by: ['mimeType'],
        where: { userId: user.id, isDeleted: false },
        _count: { id: true },
        _sum: { size: true },
      });

      const totalFiles = fileStats.reduce((acc, s) => acc + s._count.id, 0);
      const totalFolders = await this.prisma.folder.count({
        where: { userId: user.id, isTrashed: false },
      });

      await this.prisma.storageAnalytics.create({
        data: {
          userId: user.id,
          totalFiles,
          totalFolders,
          totalSize: user.storageUsed,
          fileTypeDistribution: fileStats,
        },
      });
    }
  }

  onModuleDestroy() {
    for (const [name, queue] of this.queues) {
      queue.close();
    }
    for (const worker of this.workers) {
      worker.close();
    }
  }
}
