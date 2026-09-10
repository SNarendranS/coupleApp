import { Request, Response, NextFunction } from 'express';
import { storageService } from '../services/storage.service';
import { Media } from '../models/Media';

// Validate file signature (magic bytes) to ensure file content matches image type
function isValidImageSignature(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 4) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return true;
  }

  // GIF: 47 49 46 38 ('GIF8')
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return true;
  }

  // WebP: RIFF .... WEBP
  if (
    buffer.length >= 12 &&
    buffer.toString('ascii', 0, 4) === 'RIFF' &&
    buffer.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return true;
  }

  return false;
}

export class UploadController {
  static async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({
          success: false,
          error: { code: 'FILE_REQUIRED', message: 'Please select an image to upload' },
        });
        return;
      }

      // 1. Magic bytes validation
      if (!isValidImageSignature(file.buffer)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_SIGNATURE',
            message: 'File content does not match a valid image format (JPEG, PNG, WebP, GIF)',
          },
        });
        return;
      }

      // 2. Validate category
      const category = (req.body.category || 'memory') as 'couple_avatar' | 'event' | 'memory';
      if (!['couple_avatar', 'event', 'memory'].includes(category)) {
        res.status(400).json({
          success: false,
          error: { code: 'INVALID_CATEGORY', message: 'Category must be couple_avatar, event, or memory' },
        });
        return;
      }

      // 3. Upload through Storage Service
      const storedImage = await storageService.uploadImage(
        file.buffer,
        file.originalname,
        file.mimetype,
        { category }
      );

      // 4. Save Media record
      const media = await Media.create({
        coupleId: req.coupleId!,
        uploadedBy: req.userId!,
        category,
        provider: storedImage.provider,
        publicId: storedImage.publicId,
        url: storedImage.url,
        thumbnailUrl: storedImage.thumbnailUrl || storedImage.url,
        mimeType: storedImage.mimeType,
        bytes: storedImage.bytes,
        width: storedImage.width,
        height: storedImage.height,
      });

      res.status(201).json({
        success: true,
        data: media,
      });
    } catch (error: any) {
      next(error);
    }
  }

  static async deleteImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;

      const media = await Media.findById(id);
      if (!media) {
        res.status(404).json({
          success: false,
          error: { code: 'MEDIA_NOT_FOUND', message: 'Image record not found' },
        });
        return;
      }

      if (media.coupleId.toString() !== req.coupleId?.toString()) {
        res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'You are not authorized to delete this image' },
        });
        return;
      }

      // Delete from storage provider
      await storageService.deleteImage(media.publicId);
      await Media.findByIdAndDelete(id);

      res.status(200).json({
        success: true,
        data: { message: 'Image deleted successfully' },
      });
    } catch (error: any) {
      next(error);
    }
  }
}
