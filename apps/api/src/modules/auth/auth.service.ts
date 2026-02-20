import {
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateAuthDto } from './dto/create-auth.dto';
import { LoginAuthDto } from './dto/login-auth.dto';
import { UserService } from '../user/user.service';
import { PasswordService } from './password.service';
import { JwtService } from './jwt/jwt.service';
import { StandardResponse } from 'src/common/dto/standard-response.dto';
import { InvalidLoginOrPasswordException } from 'src/common/exceptions/invalid-login-or-password.exception';
import { UserDto } from '../user/dto/user.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly userService: UserService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
  ) {}

  async create(createAuthDto: CreateAuthDto): Promise<StandardResponse> {
    try {
      const existingUser = await this.userService.findByEmailOrUsername(
        createAuthDto.email,
        createAuthDto.username,
      );
      if (existingUser) {
        throw new ConflictException('User already exists');
      }
      const hashedPassword = await this.passwordService.hashPassword(
        createAuthDto.password,
      );
      await this.userService.create({
        email: createAuthDto.email,
        fullName: createAuthDto.fullName,
        username: createAuthDto.username,
        password: hashedPassword,
      });
      return new StandardResponse(
        HttpStatus.CREATED,
        'User created successfully',
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async login(
    loginAuthDto: LoginAuthDto,
  ): Promise<StandardResponse<{ accessToken: string; expiresIn: number }>> {
    try {
      const user = await this.userService.findByEmail(loginAuthDto.email);

      if (!user) {
        throw new InvalidLoginOrPasswordException();
      }

      const isPasswordValid = await this.passwordService.validatePassword(
        loginAuthDto.password,
        user.password,
      );

      if (!isPasswordValid) {
        throw new InvalidLoginOrPasswordException();
      }

      const token = await this.jwtService.generateToken({
        sub: user.id,
        email: user.email,
        username: user.username,
      });

      return new StandardResponse(HttpStatus.OK, 'Login successful', token);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async me(userId: string): Promise<StandardResponse<UserDto>> {
    try {
      const user = await this.userService.findById(userId);
      if (!user) {
        throw new HttpException('User not found', HttpStatus.NOT_FOUND);
      }
      return new StandardResponse(
        HttpStatus.OK,
        'User retrieved successfully',
        user.toDto(),
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }
}
