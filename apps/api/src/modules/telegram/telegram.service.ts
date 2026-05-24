import {
  Injectable,
  Logger,
  OnModuleDestroy,
  Inject,
  Optional,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClient } from 'gramjs';
import { StringSession } from 'gramjs/sessions';
import { Api } from 'gramjs';
import { NewMessage } from 'gramjs/events';

export interface AuthResult {
  telegramId: bigint;
  phoneNumber: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  session: string;
}

export interface SendCodeResult {
  phoneCodeHash: string;
  phoneNumber: string;
}

export interface VerifyCodeParams {
  phoneNumber: string;
  code: string;
  phoneCodeHash: string;
  password?: string;
}

export interface UploadResult {
  messageId: number;
  channelId: bigint;
  fileReference: string;
}

export interface DownloadResult {
  data: Buffer;
  mimeType: string;
  name: string;
  size: number;
}

@Injectable()
export class TelegramService implements OnModuleDestroy {
  private readonly logger = new Logger(TelegramService.name);
  private clientMap: Map<string, TelegramClient> = new Map();
  private sessionMap: Map<string, string> = new Map();

  constructor(private configService: ConfigService) {}

  async createClient(sessionString?: string): Promise<TelegramClient> {
    const apiId = this.configService.get<number>('telegram.apiId');
    const apiHash = this.configService.get<string>('telegram.apiHash');

    if (!apiId || !apiHash) {
      throw new Error('Telegram API ID and Hash must be configured');
    }

    const stringSession = sessionString
      ? new StringSession(sessionString)
      : new StringSession('');

    const client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
      useWSS: true,
      baseHash: 3173778406,
      deviceModel: 'Telegram Drive Server',
      systemVersion: 'Linux 6.0',
      appVersion: '1.0.0',
      langCode: 'en',
      systemLangCode: 'en-US',
    });

    return client;
  }

  async sendCode(phoneNumber: string): Promise<SendCodeResult> {
    const client = await this.createClient();
    const sessionId = `session_${Date.now()}`;
    this.clientMap.set(sessionId, client);

    try {
      await client.connect();
      const result = await client.sendCode(
        { apiId: this.configService.get<number>('telegram.apiId')! },
        phoneNumber,
      );

      this.sessionMap.set(sessionId, client.session.save() as string);

      return {
        phoneCodeHash: result.phoneCodeHash,
        phoneNumber,
      };
    } catch (error: any) {
      this.logger.error(`Send code error: ${error.message}`);
      this.clientMap.delete(sessionId);
      client.destroy();
      throw error;
    }
  }

  async verifyCode(params: VerifyCodeParams): Promise<AuthResult> {
    const client = await this.createClient();

    try {
      await client.connect();
      await client.invoke(
        new Api.auth.SignIn({
          phoneNumber: params.phoneNumber,
          phoneCodeHash: params.phoneCodeHash,
          phoneCode: params.code,
        }),
      );
    } catch (error: any) {
      // Handle 2FA
      if (
        error.errorMessage === 'SESSION_PASSWORD_NEEDED' ||
        error.message?.includes('SESSION_PASSWORD_NEEDED')
      ) {
        if (!params.password) {
          throw new Error('2FA password required');
        }
        try {
          await client.invoke(
            new Api.account.CheckPassword({
              password: await client.generateCheckPassword(
                await client.invoke(new Api.account.GetPassword()),
                params.password,
              ),
            }),
          );
        } catch (passwordError: any) {
          this.logger.error(`2FA error: ${passwordError.message}`);
          throw new Error('PASSWORD_HASH_INVALID');
        }
      } else {
        this.logger.error(`Verify code error: ${error.message}`);
        throw error;
      }
    }

    const me = await client.getMe() as Api.User;
    const sessionString = client.session.save() as string;

    const result: AuthResult = {
      telegramId: BigInt(me.id.toString()),
      phoneNumber: me.phone || params.phoneNumber,
      firstName: me.firstName,
      lastName: me.lastName,
      username: me.username,
      session: sessionString,
    };

    client.destroy();
    return result;
  }

  async uploadFile(
    sessionString: string,
    fileBuffer: Buffer,
    fileName: string,
    mimeType: string,
    channelId?: bigint,
  ): Promise<UploadResult> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      // Get or create channel
      let targetChannel: Api.Channel;

      if (channelId) {
        const channelResult = await client.invoke(
          new Api.channels.GetChannels({
            id: [new Api.InputChannel({ channelId, accessHash: 0n })],
          }),
        );
        targetChannel = channelResult.chats[0] as Api.Channel;
      } else {
        // Create a private channel for storage
        const result = await client.invoke(
          new Api.channels.CreateChannel({
            title: `Drive Storage ${Date.now()}`,
            about: 'Private storage channel for Telegram Drive',
            megagroup: false,
            forImport: false,
          }),
        );
        targetChannel = result.chats[0] as Api.Channel;
        this.logger.log(`Created storage channel: ${targetChannel.id}`);
      }

      // Upload file
      const file = await client.uploadFile({
        file: new Api.InputFileBig(
          fileBuffer,
          fileName,
          fileBuffer.length,
        ),
        workers: 3,
        onProgress: (progress: number) => {
          this.logger.debug(`Upload progress: ${Math.round(progress * 100)}%`);
        },
      });

      // Send file as document to channel
      const sentMessage = await client.invoke(
        new Api.messages.SendMedia({
          peer: targetChannel.id,
          media: new Api.InputMediaUploadedDocument({
            file: file,
            mimeType,
            attributes: [
              new Api.DocumentAttributeFilename({ fileName }),
              new Api.DocumentAttributeImageSize({
                w: 0,
                h: 0,
              }),
            ],
            forceFile: true,
          }),
          message: fileName,
          randomId: BigInt(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)),
        }),
      );

      const message = sentMessage.updates[0] as Api.UpdateNewMessage;
      const msg = message.message as Api.Message;

      return {
        messageId: msg.id,
        channelId: BigInt(targetChannel.id.toString()),
        fileReference: msg.media instanceof Api.MessageMediaDocument
          ? Buffer.from((msg.media.document as Api.Document).fileReference).toString('base64')
          : '',
      };
    } catch (error: any) {
      this.logger.error(`Upload error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  async downloadFile(
    sessionString: string,
    messageId: number,
    channelId: bigint,
    fileReference: string,
    range?: { start: number; end: number },
  ): Promise<DownloadResult> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      // Get the message with the file
      const messages = await client.invoke(
        new Api.messages.GetMessages({
          peer: new Api.InputPeerChannel({
            channelId,
            accessHash: 0n,
          }),
          id: [new Api.InputMessageID({ id: messageId })],
        }),
      );

      const message = (messages as Api.messages.ChannelMessages).messages[0] as Api.Message;

      if (!message || !message.media) {
        throw new Error('File not found');
      }

      const document = (message.media as Api.MessageMediaDocument).document as Api.Document;

      // Download with optional range
      const buffer = await client.downloadMedia(message.media, {
        ...(range && {
          start: range.start,
          end: range.end,
        }),
        progressCallback: (progress: number) => {
          this.logger.debug(`Download progress: ${Math.round(progress * 100)}%`);
        },
      });

      const fileNameAttr = document.attributes.find(
        (attr) => attr instanceof Api.DocumentAttributeFilename,
      ) as Api.DocumentAttributeFilename;

      return {
        data: buffer as Buffer,
        mimeType: document.mimeType,
        name: fileNameAttr?.fileName || 'file',
        size: Number(document.size),
      };
    } catch (error: any) {
      this.logger.error(`Download error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  async deleteMessage(
    sessionString: string,
    channelId: bigint,
    messageIds: number[],
  ): Promise<boolean> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      await client.invoke(
        new Api.messages.DeleteMessages({
          peer: new Api.InputPeerChannel({
            channelId,
            accessHash: 0n,
          }),
          id: messageIds,
        }),
      );
      return true;
    } catch (error: any) {
      this.logger.error(`Delete error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  async renameMessage(
    sessionString: string,
    channelId: bigint,
    messageId: number,
    newName: string,
  ): Promise<boolean> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      await client.invoke(
        new Api.messages.EditMessage({
          peer: new Api.InputPeerChannel({
            channelId,
            accessHash: 0n,
          }),
          id: messageId,
          message: newName,
        }),
      );
      return true;
    } catch (error: any) {
      this.logger.error(`Rename error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  async getStorageChannel(
    sessionString: string,
  ): Promise<{ channelId: bigint; accessHash: bigint }> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      const dialogs = await client.getDialogs({
        limit: 200,
      });

      for (const dialog of dialogs) {
        if (dialog.isChannel && dialog.title?.startsWith('Drive Storage')) {
          return {
            channelId: BigInt(dialog.id.toString()),
            accessHash: BigInt((dialog.entity as Api.Channel).accessHash?.toString() || '0'),
          };
        }
      }

      // Create new storage channel
      const result = await client.invoke(
        new Api.channels.CreateChannel({
          title: `Drive Storage ${Date.now()}`,
          about: 'Private storage channel for Telegram Drive',
          megagroup: false,
          forImport: false,
        }),
      );

      const channel = result.chats[0] as Api.Channel;
      return {
        channelId: BigInt(channel.id.toString()),
        accessHash: BigInt(channel.accessHash?.toString() || '0'),
      };
    } catch (error: any) {
      this.logger.error(`Get storage channel error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  async getMessages(
    sessionString: string,
    channelId: bigint,
    limit: number = 50,
    offsetId?: number,
  ): Promise<Api.Message[]> {
    const client = await this.createClient(sessionString);
    await client.connect();

    try {
      const result = await client.invoke(
        new Api.messages.GetHistory({
          peer: new Api.InputPeerChannel({
            channelId,
            accessHash: 0n,
          }),
          limit,
          offsetId,
          addOffset: 0,
        }),
      );

      return (result as Api.messages.ChannelMessages).messages as Api.Message[];
    } catch (error: any) {
      this.logger.error(`Get messages error: ${error.message}`);
      throw error;
    } finally {
      client.destroy();
    }
  }

  onModuleDestroy() {
    for (const [id, client] of this.clientMap) {
      client.destroy();
      this.logger.log(`Destroyed client: ${id}`);
    }
  }
}
