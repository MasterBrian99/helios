import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageService } from './interfaces/storage.service.interface';

@Injectable()
export class S3StorageService implements StorageService {
  private readonly logger = new Logger(S3StorageService.name);
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('S3_REGION') || 'us-east-1';
    const credentials = {
      accessKeyId: this.configService.get<string>('AWS_ACCESS_KEY_ID') || '',
      secretAccessKey:
        this.configService.get<string>('AWS_SECRET_ACCESS_KEY') || '',
    };
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    this.s3 = new S3Client({
      region,
      credentials,
      ...(endpoint ? { endpoint } : {}),
    });
    const bucket = this.configService.get<string>('S3_BUCKET');
    if (!bucket) {
      throw new Error(
        'S3_BUCKET environment variable is required for S3 storage',
      );
    }
    this.bucket = bucket;
  }

  async upload(buffer: Buffer, key: string): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
    });
    try {
      await this.s3.send(command);
      // Construct a public URL assuming the bucket is public or using default endpoint format
      const endpoint =
        this.configService.get<string>('S3_ENDPOINT') ||
        `https://${this.bucket}.s3.amazonaws.com`;
      return `${endpoint}/${key}`;
    } catch (err) {
      this.logger.error(`S3 upload failed: ${(err as Error).message}`);
      throw err;
    }
  }

  async getSignedUrl(key: string): Promise<string> {
    // Generate a signed URL for downloading the object.
    // We will use the @aws-sdk/s3-request-presigner package.

    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const expiresIn =
      this.configService.get<number>('S3_SIGNED_URL_EXPIRES') || 3600; // seconds
    try {
      const signedUrl = await getSignedUrl(this.s3, command, { expiresIn });
      return signedUrl;
    } catch (err) {
      this.logger.error(
        `Failed to generate signed URL: ${(err as Error).message}`,
      );
      throw err;
    }
  }
}
