import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { StandardResponse } from 'src/common/dto/standard-response.dto';
import { Public, Auth } from 'src/common/decorators';
import { UserDto } from '../user/dto/user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post()
  async create(
    @Body() createAuthDto: CreateAuthDto,
  ): Promise<StandardResponse> {
    return await this.authService.create(createAuthDto);
  }

  @Public()
  @Post('login')
  async login(
    @Body() loginAuthDto: LoginAuthDto,
  ): Promise<StandardResponse<{ accessToken: string; expiresIn: number }>> {
    return await this.authService.login(loginAuthDto);
  }

  @Get('me')
  async me(@Auth('sub') userId: string): Promise<StandardResponse<UserDto>> {
    return await this.authService.me(userId);
  }
}
