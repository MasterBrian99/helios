import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { StorageService } from './interfaces/storage.service.interface';

@Injectable()
export class LocalStorageService implements StorageService {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly basePath: string;

  constructor(private readonly configService: ConfigService) {
    const storagePath =
      this.configService.get<string>('STORAGE_LOCAL_PATH') || 'uploads';
    this.basePath = path.resolve(storagePath);
    // Ensure the directory exists
    fs.mkdir(this.basePath, { recursive: true }).catch((err) => {
      this.logger.error(
        `Failed to create storage directory ${this.basePath}: ${err as string}`,
      );
    });
  }

  async upload(buffer: Buffer, key: string): Promise<string> {
    const filePath = path.join(this.basePath, key);
    // Ensure directory for nested keys exists
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, buffer);
    // Return a relative path or file URL (could be served statically)
    const relative = path.relative(process.cwd(), filePath);
    return `file://${relative}`;
  }

  async getSignedUrl(key: string): Promise<string> {
    // For local storage, return a file URL to the stored file.
    const filePath = path.join(this.basePath, key);
    try {
      await fs.access(filePath);
    } catch (err) {
      this.logger.error(
        `File not found for key ${key}: ${(err as Error).message}`,
      );
      throw err;
    }
    const absolute = path.resolve(filePath);
    return `file://${absolute}`;
  }
}
