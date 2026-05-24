import { IsString, IsOptional, IsNumberString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SendCodeDto {
  @ApiProperty({ example: '+1234567890', description: 'Phone number in international format' })
  @IsString()
  phoneNumber: string;
}

export class VerifyCodeDto {
  @ApiProperty({ example: '+1234567890' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ example: '12345' })
  @IsString()
  @MinLength(3)
  @MaxLength(6)
  code: string;

  @ApiProperty({ example: 'abc123def456' })
  @IsString()
  phoneCodeHash: string;

  @ApiPropertyOptional({ example: 'mypassword' })
  @IsOptional()
  @IsString()
  password?: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}

export class LogoutDto {
  @ApiProperty()
  @IsString()
  sessionId: string;
}

export class LoginResponseDto {
  @ApiProperty()
  accessToken: string;

  @ApiProperty()
  refreshToken: string;

  @ApiProperty()
  expiresIn: number;

  @ApiProperty()
  tokenType: string;

  @ApiProperty()
  user: {
    id: string;
    telegramId: string;
    firstName?: string;
    lastName?: string;
    username?: string;
    storageUsed: string;
    storageLimit: string;
  };
}
