import { TelegramClient } from 'gramjs';
import { StringSession } from 'gramjs/sessions';

export interface TelegramClientConfig {
  apiId: number;
  apiHash: string;
  sessionString?: string;
}

export class TelegramClientFactory {
  private static instances: Map<string, TelegramClient> = new Map();

  static create(config: TelegramClientConfig): TelegramClient {
    const key = config.apiId.toString();

    if (this.instances.has(key) && this.instances.get(key)!.connected) {
      return this.instances.get(key)!;
    }

    const stringSession = config.sessionString
      ? new StringSession(config.sessionString)
      : new StringSession('');

    const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
      connectionRetries: 5,
      useWSS: true,
      deviceModel: 'Telegram Drive',
      systemVersion: '1.0.0',
      appVersion: '1.0.0',
      langCode: 'en',
    });

    this.instances.set(key, client);
    return client;
  }

  static destroy(apiId: number): void {
    const key = apiId.toString();
    const client = this.instances.get(key);
    if (client) {
      client.destroy();
      this.instances.delete(key);
    }
  }

  static destroyAll(): void {
    for (const [key, client] of this.instances) {
      client.destroy();
      this.instances.delete(key);
    }
  }
}
