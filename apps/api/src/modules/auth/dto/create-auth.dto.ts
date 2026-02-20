import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateAuthDto {
  @IsEmail()
  email: string;
  @IsString()
  fullName: string;
  @IsString()
  @MinLength(6)
  password: string;
  @IsString()
  @MinLength(3)
  username: string;
}
