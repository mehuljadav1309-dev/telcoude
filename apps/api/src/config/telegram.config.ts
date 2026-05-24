import { registerAs } from '@nestjs/config';

export default registerAs('telegram', () => ({
  apiId: parseInt(process.env.TELEGRAM_API_ID || '0', 10),
  apiHash: process.env.TELEGRAM_API_HASH || '',
  sessionDir: process.env.TELEGRAM_SESSION_DIR || './data/sessions',
  maxFileSize: parseInt(process.env.TELEGRAM_MAX_FILE_SIZE || '2097152000', 10),
}));
