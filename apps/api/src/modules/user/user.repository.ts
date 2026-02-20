import { Injectable } from '@nestjs/common';
import { Kysely } from 'kysely';
import { InjectKysely } from 'nestjs-kysely';
import { getUUID } from 'src/utils/uuid-gen';
import { UserModel } from './models/user.model';
import { DB } from 'src/database/schema/db';
import { UserCreate } from 'src/database/schema/users';
import { withTimestamps } from 'src/database/utils/datetime';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserRepository {
  constructor(@InjectKysely() private readonly kdb: Kysely<DB>) {}

  async findByEmailOrUsername(email: string, username: string) {
    const user = await this.kdb
      .selectFrom('users')
      .selectAll()
      .where((eb) =>
        eb.or([eb('email', '=', email), eb('username', '=', username)]),
      )
      .executeTakeFirst();
    return user ? new UserModel(user) : null;
  }

  async findById(id: string): Promise<UserModel | null> {
    const result = await this.kdb
      .selectFrom('users')
      .selectAll()
      .where('id', '=', id)
      .executeTakeFirst();
    return result ? new UserModel(result) : null;
  }

  async createUser(user: CreateUserDto) {
    const newUser: UserCreate = withTimestamps({
      id: getUUID(),
      ...user,
    });
    const result = await this.kdb
      .insertInto('users')
      .values(newUser)
      .executeTakeFirst();
    return result;
  }

  async findByEmail(email: string) {
    const result = await this.kdb
      .selectFrom('users')
      .selectAll()
      .where('email', '=', email)
      .executeTakeFirst();
    return result ? new UserModel(result) : null;
  }
}
