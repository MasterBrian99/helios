import { ExplanationLevel } from '../enums/explanation-level';
import { PlayingStyle } from '../enums/playing-style';

export class UserDto {
  id: string;
  username: string;
  email: string;
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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  deletedAt: Date;
}
