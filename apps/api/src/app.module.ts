import { Module } from '@nestjs/common';
import { KyselyModule } from 'nestjs-kysely';
import { CamelCasePlugin, PostgresDialect } from 'kysely';
import { Pool } from 'pg';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { validate } from './config/env';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { GamesModule } from './modules/games/games.module';
import { StorageModule } from './storage/storage.module';
import { PgBossModule } from '@wavezync/nestjs-pgboss';
import { ChessEnginesModule } from './chess-engines';
import { AnalysisModule } from './modules/games/analysis/analysis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validate }),
    KyselyModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: new PostgresDialect({
          pool: new Pool({
            connectionString: configService.get<string>('DATABASE_URL'),
          }),
        }),
        plugins: [new CamelCasePlugin()],
      }),
    }),
    PgBossModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connectionString: configService.get<string>('DATABASE_URL'),
      }),
    }),
    AuthModule,
    UserModule,
    GamesModule,
    StorageModule,
    ChessEnginesModule,
    AnalysisModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
