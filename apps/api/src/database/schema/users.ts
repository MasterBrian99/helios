import { PlayingStyle } from 'src/modules/user/enums/playing-style';
import { CreatedAt, UpdatedAt } from './common/datetime';
import { Generated, Insertable, Selectable, Updateable } from 'kysely';
import { ExplanationLevel } from 'src/modules/user/enums/explanation-level';

export interface UserTable {
  id: Generated<string>;
  username: string;
  email: string;
  password: string;
  fullName: string;
  currentRating: number | null;
  playingStyle: PlayingStyle | null;
  yearsPlaying: number | null;
  emailVerified: boolean | null;
  isActive: boolean | null;
  preferredLanguage: string | null;
  timezone: string | null;
  explanationLevel: ExplanationLevel | null;
  profilePublic: boolean | null;
  showRatingPublicly: boolean | null;
  allowFriendRequests: boolean | null;
  createdAt: CreatedAt;
  updatedAt: UpdatedAt;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
}
export type User = Selectable<UserTable>;
export type UserCreate = Insertable<UserTable>;
export type UserUpdate = Updateable<UserTable>;
