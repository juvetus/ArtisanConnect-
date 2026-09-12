import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';

export type StoredUpload = {
  url: string;
  publicId?: string;
  resourceType?: string;
  format?: string;
};

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly enabled: boolean;
  private readonly missingConfig: string[];

  constructor(private readonly config: ConfigService) {
    const cloudName = this.config.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.config.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.config.get<string>('CLOUDINARY_API_SECRET');
    this.missingConfig = [
      !cloudName ? 'CLOUDINARY_CLOUD_NAME' : null,
      !apiKey ? 'CLOUDINARY_API_KEY' : null,
      !apiSecret ? 'CLOUDINARY_API_SECRET' : null,
    ].filter((key): key is string => key !== null);
    this.enabled = this.missingConfig.length === 0;

    if (this.enabled) {
      cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    } else {
      this.logger.warn(`Cloudinary non configure. Variables manquantes: ${this.missingConfig.join(', ')}`);
    }
  }

  isEnabled() {
    return this.enabled;
  }

  missingConfiguration() {
    return [...this.missingConfig];
  }

  async uploadBuffer(
    buffer: Buffer,
    folder: string,
    resourceType: 'image' | 'raw' | 'auto' = 'auto',
    deliveryType: 'upload' | 'authenticated' = 'upload',
  ): Promise<StoredUpload> {
    if (!this.enabled) {
      throw new Error('Cloudinary est requis pour cet upload en production.');
    }

    const result = await new Promise<UploadApiResponse>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder, resource_type: resourceType, type: deliveryType, overwrite: false },
        (error, response) => {
          if (error || !response) {
            reject(error ?? new Error('Cloudinary n’a pas retourné de réponse.'));
            return;
          }
          resolve(response);
        },
      );
      stream.end(buffer);
    });

    return { url: result.secure_url, publicId: result.public_id, resourceType: result.resource_type, format: result.format };
  }

  signedPrivateUrl(publicId: string, resourceType = 'raw', format?: string, expiresInSeconds = 900) {
    if (!this.enabled) {
      throw new Error('Cloudinary est requis pour générer une URL KYC signée.');
    }
    return cloudinary.utils.private_download_url(publicId, format ?? 'bin', {
      resource_type: resourceType,
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
      attachment: false,
    });
  }
}
