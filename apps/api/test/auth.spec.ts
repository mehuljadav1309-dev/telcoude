import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { AuthService } from '../src/modules/auth/auth.service';
import { CryptoService } from '../src/modules/auth/services/crypto.service';
import { PrismaService } from '../src/database/prisma.service';

describe('AuthService', () => {
  let service: AuthService;
  let cryptoService: CryptoService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot()],
      providers: [
        AuthService,
        CryptoService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
            },
            telegramSession: {
              findFirst: jest.fn(),
              create: jest.fn(),
            },
            jwtSession: {
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              updateMany: jest.fn(),
              findMany: jest.fn(),
            },
            activityLog: {
              create: jest.fn(),
            },
          },
        },
        {
          provide: 'JwtService',
          useValue: {
            sign: jest.fn(() => 'test-token'),
            verify: jest.fn(),
            decode: jest.fn(() => ({ exp: Date.now() / 1000 + 900 })),
          },
        },
        {
          provide: 'ConfigService',
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, any> = {
                'jwt.accessSecret': 'test-access-secret-minimum-32-chars',
                'jwt.refreshSecret': 'test-refresh-secret-minimum-32-chars',
                'jwt.accessExpiry': '15m',
                'jwt.refreshExpiry': '7d',
                'jwt.issuer': 'telegram-drive',
                ENCRYPTION_KEY: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
              };
              return config[key];
            }),
          },
        },
        {
          provide: 'TelegramService',
          useValue: {
            sendCode: jest.fn(),
            verifyCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    cryptoService = module.get<CryptoService>(CryptoService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('CryptoService', () => {
    it('should encrypt and decrypt data', () => {
      const originalText = 'test-telegram-session-data';
      const encrypted = cryptoService.encrypt(originalText);
      expect(encrypted).not.toEqual(originalText);
      expect(encrypted).toContain(':');

      const decrypted = cryptoService.decrypt(encrypted);
      expect(decrypted).toEqual(originalText);
    });

    it('should generate unique keys and IVs', () => {
      const key1 = cryptoService.generateKey();
      const key2 = cryptoService.generateKey();
      expect(key1).not.toEqual(key2);
      expect(key1.length).toBe(64);

      const iv1 = cryptoService.generateIv();
      const iv2 = cryptoService.generateIv();
      expect(iv1).not.toEqual(iv2);
    });

    it('should hash consistently', () => {
      const hash1 = cryptoService.hash('test-data');
      const hash2 = cryptoService.hash('test-data');
      const hash3 = cryptoService.hash('different-data');
      expect(hash1).toEqual(hash2);
      expect(hash1).not.toEqual(hash3);
    });
  });

  describe('sendCode', () => {
    it('should return phone code hash', async () => {
      // Mock the telegram service
      const telegramService = (service as any).telegramService;
      telegramService.sendCode.mockResolvedValue({
        phoneCodeHash: 'test-hash',
        phoneNumber: '+1234567890',
      });

      const result = await service.sendCode({ phoneNumber: '+1234567890' });
      expect(result).toHaveProperty('phoneCodeHash');
      expect(result.nextAction).toBe('verify_code');
    });
  });
});
