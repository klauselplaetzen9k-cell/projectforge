import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export interface UploadedFile {
  id: string;
  originalName: string;
  filename: string;
  mimeType: string;
  size: number;
  path: string;
  uploadedAt: Date;
}

export class LocalStorageService {
  private uploadDir: string;

  constructor(customDir?: string) {
    this.uploadDir = customDir || UPLOAD_DIR;
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  /**
   * Generate a unique filename
   */
  private generateFilename(originalName: string): string {
    const ext = path.extname(originalName);
    const timestamp = Date.now();
    const random = crypto.randomBytes(8).toString('hex');
    return `${timestamp}-${random}${ext}`;
  }

  /**
   * Save a file from buffer
   */
  async saveFile(
    buffer: Buffer,
    originalName: string,
    mimeType: string
  ): Promise<UploadedFile> {
    const filename = this.generateFilename(originalName);
    const filePath = path.join(this.uploadDir, filename);

    await fs.promises.writeFile(filePath, buffer);

    const stat = await fs.promises.stat(filePath);

    return {
      id: crypto.randomUUID(),
      originalName,
      filename,
      mimeType,
      size: stat.size,
      path: filePath,
      uploadedAt: new Date(),
    };
  }

  /**
   * Get file by ID
   */
  async getFile(filename: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const filePath = path.join(this.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const buffer = await fs.promises.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    
    const mimeTypes: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.txt': 'text/plain',
      '.csv': 'text/csv',
      '.zip': 'application/zip',
      '.json': 'application/json',
    };

    return {
      buffer,
      mimeType: mimeTypes[ext] || 'application/octet-stream',
    };
  }

  /**
   * Delete file by filename
   */
  async deleteFile(filename: string): Promise<boolean> {
    const filePath = path.join(this.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return false;
    }

    await fs.promises.unlink(filePath);
    return true;
  }

  /**
   * Get all files in upload directory
   */
  async listFiles(): Promise<string[]> {
    const files = await fs.promises.readdir(this.uploadDir);
    return files;
  }

  /**
   * Get file stats
   */
  async getFileStats(filename: string): Promise<{ size: number; created: Date; modified: Date } | null> {
    const filePath = path.join(this.uploadDir, filename);
    
    if (!fs.existsSync(filePath)) {
      return null;
    }

    const stat = await fs.promises.stat(filePath);
    return {
      size: stat.size,
      created: stat.birthtime,
      modified: stat.mtime,
    };
  }
}

export const localStorageService = new LocalStorageService();
