import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRepository } from './user.repository';
import { UserModel } from './models/user.model';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(private readonly userRepository: UserRepository) {}

  async create(createUserDto: CreateUserDto) {
    try {
      await this.userRepository.createUser(createUserDto);
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException('Failed to create user');
    }
  }

  findAll() {
    return `This action returns all user`;
  }

  findOne(id: number) {
    return `This action returns a #${id} user`;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  update(id: number, _updateUserDto: UpdateUserDto) {
    return `This action updates a #${id} user`;
  }

  remove(id: number) {
    return `This action removes a #${id} user`;
  }

  async findByEmailOrUsername(email: string, username: string) {
    try {
      const user = await this.userRepository.findByEmailOrUsername(
        email,
        username,
      );
      return user ? user : null;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async findById(id: string): Promise<UserModel | null> {
    try {
      const user = await this.userRepository.findById(id);
      return user ?? null;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }

  async findByEmail(email: string): Promise<UserModel | null> {
    try {
      const user = await this.userRepository.findByEmail(email);
      return user ?? null;
    } catch (error) {
      this.logger.error(error);
      throw new InternalServerErrorException();
    }
  }
}
