import { User } from 'src/database/schema/users';
import { ExplanationLevel } from '../enums/explanation-level';
import { PlayingStyle } from '../enums/playing-style';
import { UserDto } from '../dto/user.dto';

export class UserModel implements User {
  id: string;
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
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: string | null;
  lastActiveAt: string | null;
  deletedAt: string | null;
  constructor(user: User) {
    this.id = user.id;
    this.username = user.username;
    this.email = user.email;
    this.fullName = user.fullName;
    this.currentRating = user.currentRating;
    this.playingStyle = user.playingStyle;
    this.yearsPlaying = user.yearsPlaying;
    this.emailVerified = user.emailVerified;
    this.isActive = user.isActive;
    this.preferredLanguage = user.preferredLanguage;
    this.timezone = user.timezone;
    this.explanationLevel = user.explanationLevel;
    this.profilePublic = user.profilePublic;
    this.showRatingPublicly = user.showRatingPublicly;
    this.allowFriendRequests = user.allowFriendRequests;
    this.createdAt = user.createdAt;
    this.updatedAt = user.updatedAt;
    this.lastLoginAt = user.lastLoginAt;
    this.lastActiveAt = user.lastActiveAt;
    this.deletedAt = user.deletedAt;
    this.password = user.password;
  }

  toDto(): UserDto {
    return {
      id: this.id,
      username: this.username,
      email: this.email,
      fullName: this.fullName,
      currentRating: this.currentRating,
      playingStyle: this.playingStyle,
      yearsPlaying: this.yearsPlaying,
      emailVerified: this.emailVerified,
      isActive: this.isActive,
      preferredLanguage: this.preferredLanguage,
      timezone: this.timezone,
      explanationLevel: this.explanationLevel,
      profilePublic: this.profilePublic,
      showRatingPublicly: this.showRatingPublicly,
      allowFriendRequests: this.allowFriendRequests,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      lastActiveAt: this.lastActiveAt,
      deletedAt: this.deletedAt,
    };
  }
}
