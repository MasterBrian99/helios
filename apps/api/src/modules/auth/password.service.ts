import { Injectable } from '@nestjs/common';
import { hash, compare, genSalt } from 'bcrypt';
@Injectable()
export class PasswordService {
  async validatePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    return compare(password, hashedPassword);
  }

  async hashPassword(password: string): Promise<string> {
    const salt = await genSalt();
    return hash(password, salt);
  }
}
