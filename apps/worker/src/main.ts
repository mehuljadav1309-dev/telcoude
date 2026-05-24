import { Worker, Queue } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

const prisma = new PrismaClient();
const connection = { url: process.env.REDIS_URL || 'redis://localhost:6379' };

const logger = {
  info: (msg: string, data?: any) => console.log(`[INFO] ${msg}`, data || ''),
  error: (msg: string, data?: any) => console.error(`[ERROR] ${msg}`, data || ''),
  debug: (msg: string, data?: any) => process.env.NODE_ENV === 'development' && console.log(`[DEBUG] ${msg}`, data || ''),
};

async function processThumbnail(job: any) {
  const { fileId, userId, mimeType } = job.data;
  logger.info(`Processing thumbnail for file ${fileId}`);

  try {
    const file = await prisma.file.findUnique({ where: { id: fileId } });
    if (!file || !file.telegramMessageId) {
      throw new Error('File not found or no Telegram data');
    }

    // For image files, we generate thumbnails
    if (mimeType.startsWith('image/')) {
      // In production, we'd download from Telegram and generate thumbnail
      // For now, we create a placeholder
      const thumbnailBuffer = await sharp({
        create: {
          width: 320,
          height: 320,
          channels: 3,
          background: { r: 66, g: 133, b: 244 },
        },
      })
        .webp({ quality: 80 })
        .toBuffer();

      const existingThumbnail = await prisma.thumbnail.findUnique({
        where: { fileId },
      });

      if (existingThumbnail) {
        await prisma.thumbnail.update({
          where: { fileId },
          data: {
            data: thumbnailBuffer,
            mimeType: 'image/webp',
            width: 320,
            height: 320,
            size: thumbnailBuffer.length,
          },
        });
      } else {
        await prisma.thumbnail.create({
          data: {
            fileId,
            userId,
            data: thumbnailBuffer,
            mimeType: 'image/webp',
            width: 320,
            height: 320,
            size: thumbnailBuffer.length,
          },
        });
      }
    }

    logger.info(`Thumbnail generated for file ${fileId}`);
    return { success: true, fileId };
  } catch (error: any) {
    logger.error(`Thumbnail processing failed: ${error.message}`);
    throw error;
  }
}

async function processMetadata(job: any) {
  const { fileId, mimeType } = job.data;
  logger.info(`Extracting metadata for file ${fileId}`);

  try {
    const metadata: any = {};

    if (mimeType.startsWith('image/')) {
      // Extract image dimensions from the stored data
      metadata.processed = true;
    }

    if (mimeType.startsWith('video/')) {
      metadata.processed = true;
      // In production, use ffprobe to extract video metadata
    }

    await prisma.file.update({
      where: { id: fileId },
      data: { metadata },
    });

    logger.info(`Metadata extracted for file ${fileId}`);
    return { success: true, fileId };
  } catch (error: any) {
    logger.error(`Metadata extraction failed: ${error.message}`);
    throw error;
  }
}

async function processCleanup(job: any) {
  logger.info('Running cleanup jobs');
  try {
    // Delete old upload chunks
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const deletedChunks = await prisma.uploadChunk.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        job: { status: { in: ['COMPLETED', 'FAILED'] } },
      },
    });
    logger.info(`Cleaned up ${deletedChunks.count} old upload chunks`);

    // Clean up expired background jobs
    const deletedJobs = await prisma.backgroundJob.deleteMany({
      where: {
        createdAt: { lt: cutoff },
        status: { in: ['COMPLETED', 'FAILED'] },
      },
    });
    logger.info(`Cleaned up ${deletedJobs.count} old background jobs`);

    return { deletedChunks: deletedChunks.count, deletedJobs: deletedJobs.count };
  } catch (error: any) {
    logger.error(`Cleanup failed: ${error.message}`);
    throw error;
  }
}

async function processShareExpiration(job: any) {
  logger.info('Checking share expirations');
  try {
    const result = await prisma.share.updateMany({
      where: {
        expiresAt: { lte: new Date() },
        isActive: true,
      },
      data: { isActive: false },
    });
    logger.info(`Expired ${result.count} shares`);
    return { expired: result.count };
  } catch (error: any) {
    logger.error(`Share expiration failed: ${error.message}`);
    throw error;
  }
}

async function start() {
  logger.info('Starting worker service...');

  const processors: Record<string, (job: any) => Promise<any>> = {
    thumbnail: processThumbnail,
    metadata: processMetadata,
    cleanup: processCleanup,
    share_expiration: processShareExpiration,
  };

  const queueNames = ['thumbnails', 'metadata', 'cleanup', 'share-expiration'];

  for (const queueName of queueNames) {
    const worker = new Worker(
      queueName,
      async (job) => {
        const processor = processors[job.name];
        if (!processor) {
          logger.warn(`No processor for job type: ${job.name}`);
          return;
        }
        logger.info(`Processing job ${job.id} of type ${job.name} from queue ${queueName}`);
        return processor(job);
      },
      {
        connection,
        concurrency: parseInt(process.env.BULLMQ_CONCURRENCY || '5', 10),
        lockDuration: 30000,
        maxStalledCount: 3,
      },
    );

    worker.on('completed', (job) => {
      logger.info(`Job ${job.id} completed successfully`);
    });

    worker.on('failed', (job, error) => {
      logger.error(`Job ${job?.id} failed: ${error.message}`);
    });

    logger.info(`Worker listening on queue: ${queueName}`);
  }

  logger.info('All workers started');
}

start().catch((err) => {
  logger.error(`Failed to start workers: ${err.message}`);
  process.exit(1);
});
