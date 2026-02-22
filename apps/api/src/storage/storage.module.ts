import { Module, Provider, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

const storageProvider: Provider = {
  provide: 'StorageService',
  useFactory: (configService: ConfigService) => {
    const provider = configService.get<string>('STORAGE_PROVIDER') || 'local';
    if (provider === 's3') {
      const bucket = configService.get<string>('S3_BUCKET');
      if (!bucket) {
        // If bucket not configured, fall back to local storage and warn.
        const logger = new Logger('StorageModule');
        logger.warn('S3_BUCKET not set – using local storage as fallback');
        return new LocalStorageService(configService);
      }
      return new S3StorageService(configService);
    }
    return new LocalStorageService(configService);
  },
  inject: [ConfigService],
};

@Module({
  providers: [storageProvider, LocalStorageService, S3StorageService],
  exports: ['StorageService'],
})
export class StorageModule {}
