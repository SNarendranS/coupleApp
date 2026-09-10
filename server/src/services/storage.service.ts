import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { v2 as cloudinary } from 'cloudinary';
import { env } from '../config/env';

export interface StoredImage {
  provider: 'cloudinary' | 'local';
  publicId: string;
  url: string;
  thumbnailUrl?: string;
  bytes: number;
  mimeType: string;
  width?: number;
  height?: number;
}

export interface ImageUploadOptions {
  category?: 'couple_avatar' | 'event' | 'memory';
  folder?: string;
}

export interface IStorageProvider {
  uploadImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    options?: ImageUploadOptions
  ): Promise<StoredImage>;

  deleteImage(publicId: string): Promise<void>;
}

// -------------------------------------------------------------
// CLOUDINARY STORAGE PROVIDER (Production Persistent Storage)
// -------------------------------------------------------------
export class CloudinaryStorageProvider implements IStorageProvider {
  constructor() {
    cloudinary.config({
      cloud_name: env.CLOUDINARY_CLOUD_NAME,
      api_key: env.CLOUDINARY_API_KEY,
      api_secret: env.CLOUDINARY_API_SECRET,
      secure: true,
    });
  }

  async uploadImage(
    buffer: Buffer,
    _originalName: string,
    mimeType: string,
    options?: ImageUploadOptions
  ): Promise<StoredImage> {
    const folder = options?.folder || `couple_app/${options?.category || 'general'}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          fetch_format: 'auto',
          quality: 'auto',
        },
        (error, result) => {
          if (error || !result) {
            return reject(new Error(error?.message || 'Cloudinary upload failed'));
          }

          // Build optimized delivery URL and a responsive thumbnail URL
          const publicId = result.public_id;
          const url = result.secure_url;
          const thumbnailUrl = cloudinary.url(publicId, {
            transformation: [
              { width: 400, crop: 'limit' },
              { quality: 'auto', fetch_format: 'auto' },
            ],
            secure: true,
          });

          resolve({
            provider: 'cloudinary',
            publicId,
            url,
            thumbnailUrl,
            bytes: result.bytes,
            mimeType: `${result.resource_type}/${result.format}`,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err: any) {
      console.warn(`[CloudinaryStorageProvider] Failed to delete image ${publicId}:`, err.message);
    }
  }
}

// -------------------------------------------------------------
// LOCAL STORAGE PROVIDER (Development & Testing Fallback)
// -------------------------------------------------------------
export class LocalStorageProvider implements IStorageProvider {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.resolve(__dirname, '../../uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async uploadImage(
    buffer: Buffer,
    originalName: string,
    mimeType: string,
    _options?: ImageUploadOptions
  ): Promise<StoredImage> {
    const ext = path.extname(originalName) || (mimeType.includes('png') ? '.png' : '.jpg');
    const publicId = `${uuidv4()}${ext}`;
    const filePath = path.join(this.uploadsDir, publicId);

    await fs.promises.writeFile(filePath, buffer);

    const relativeUrl = `/uploads/${publicId}`;

    return {
      provider: 'local',
      publicId,
      url: relativeUrl,
      thumbnailUrl: relativeUrl,
      bytes: buffer.length,
      mimeType,
    };
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      const filePath = path.join(this.uploadsDir, publicId);
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (err: any) {
      console.warn(`[LocalStorageProvider] Failed to delete local image ${publicId}:`, err.message);
    }
  }
}

// -------------------------------------------------------------
// STORAGE FACTORY & SERVICE SINGLETON
// -------------------------------------------------------------
class StorageServiceFactory {
  private static instance: IStorageProvider;

  static getInstance(): IStorageProvider {
    if (!this.instance) {
      const isCloudinaryConfigured = Boolean(
        env.CLOUDINARY_CLOUD_NAME &&
        env.CLOUDINARY_API_KEY &&
        env.CLOUDINARY_API_SECRET
      );

      if (isCloudinaryConfigured) {
        this.instance = new CloudinaryStorageProvider();
        console.log('☁️ StorageService initialized with Cloudinary persistent provider');
      } else if (env.NODE_ENV === 'production') {
        // Enforce configuration safety in production
        throw new Error(
          'Missing Cloudinary credentials in production. Configure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your environment.'
        );
      } else {
        this.instance = new LocalStorageProvider();
        console.log('📁 StorageService initialized with LocalStorageProvider (Development fallback)');
      }
    }
    return this.instance;
  }
}

export const storageService = StorageServiceFactory.getInstance();
