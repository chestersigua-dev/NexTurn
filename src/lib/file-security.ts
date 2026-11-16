import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export type AllowedMimeType = 'image/jpeg' | 'image/png' | 'image/webp';

export interface FileValidationResult {
  isValid: boolean;
  mimeType?: AllowedMimeType;
  extension?: string;
  error?: string;
}

export function validateImageMagicBytes(buffer: Buffer): FileValidationResult {
  if (buffer.length < 12) {
    return { isValid: false, error: 'File buffer too small to determine image header' };
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { isValid: false, error: 'File size exceeds maximum 5MB limit' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { isValid: true, mimeType: 'image/jpeg', extension: '.jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { isValid: true, mimeType: 'image/png', extension: '.png' };
  }

  // 3. WEBP: "RIFF" .... "WEBP"
  const riff = buffer.subarray(0, 4).toString('ascii');
  const webp = buffer.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { isValid: true, mimeType: 'image/webp', extension: '.webp' };
  }

  return { isValid: false, error: 'Invalid file format. Only JPEG, PNG, and WebP images are allowed.' };
}

export async function saveSecureUploadedImage(buffer: Buffer, category: string = 'general'): Promise<{ url: string; filename: string }> {
  const validation = validateImageMagicBytes(buffer);
  if (!validation.isValid || !validation.extension) {
    throw new Error(validation.error || 'Invalid file');
  }

  const uploadsDir = path.resolve(process.cwd(), 'public', 'uploads');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const uuid = crypto.randomUUID();
  const safeFilename = `${category}-${uuid}${validation.extension}`;
  const targetPath = path.resolve(uploadsDir, safeFilename);

  // Path traversal check
  if (!targetPath.startsWith(uploadsDir)) {
    throw new Error('Path traversal attempt detected');
  }

  await fs.promises.writeFile(targetPath, buffer);

  return {
    url: `/uploads/${safeFilename}`,
    filename: safeFilename,
  };
}
