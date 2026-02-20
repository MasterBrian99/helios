import { Injectable, Logger } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
  sub: string;
  email: string;
  username: string;
}

export interface TokenResponse {
  accessToken: string;
  expiresIn: number;
}

@Injectable()
export class JwtService {
  private readonly logger = new Logger(JwtService.name);

  constructor(
    private readonly jwtService: NestJwtService,
    private readonly configService: ConfigService,
  ) {}

  async generateToken(payload: JwtPayload): Promise<TokenResponse> {
    const expiresIn = this.configService.getOrThrow<number>(
      'JWT_EXPIRATION_TIME',
    );
    const accessToken = await this.jwtService.signAsync(payload);
    return {
      accessToken,
      expiresIn,
    };
  }

  async verifyToken(token: string): Promise<JwtPayload> {
    return this.jwtService.verifyAsync<JwtPayload>(token);
  }
}
