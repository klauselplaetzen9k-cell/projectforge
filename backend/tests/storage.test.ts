// ============================================================================
// Storage Service Tests
// ============================================================================

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { LocalStorageService, UploadedFile } from '../src/services/storage.service';

describe('LocalStorageService', () => {
  const testDir = '/tmp/projectforge-test-uploads';
  let storageService: LocalStorageService;

  beforeEach(() => {
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    storageService = new LocalStorageService(testDir);
  });

  afterEach(() => {
    // Cleanup test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('saveFile', () => {
    it('should save a file and return file metadata', async () => {
      const buffer = Buffer.from('Hello, World!');
      const originalName = 'test.txt';
      const mimeType = 'text/plain';

      const result = await storageService.saveFile(buffer, originalName, mimeType);

      expect(result).toBeDefined();
      expect(result.originalName).toBe(originalName);
      expect(result.mimeType).toBe(mimeType);
      expect(result.size).toBe(buffer.length);
      expect(result.filename).toMatch(/^\d+-[a-f0-9]+\.txt$/);
      expect(fs.existsSync(result.path)).toBe(true);
    });

    it('should generate unique filenames for same file', async () => {
      const buffer = Buffer.from('Test content');
      
      const file1 = await storageService.saveFile(buffer, 'test.pdf', 'application/pdf');
      // Small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
      const file2 = await storageService.saveFile(buffer, 'test.pdf', 'application/pdf');

      expect(file1.filename).not.toBe(file2.filename);
    });
  });

  describe('getFile', () => {
    it('should retrieve a saved file', async () => {
      const content = 'File content for testing';
      const buffer = Buffer.from(content);
      
      const savedFile = await storageService.saveFile(buffer, 'test.txt', 'text/plain');
      const result = await storageService.getFile(savedFile.filename);

      expect(result).toBeDefined();
      expect(result?.mimeType).toBe('text/plain');
      expect(result?.buffer.toString()).toBe(content);
    });

    it('should return null for non-existent file', async () => {
      const result = await storageService.getFile('non-existent-file.txt');
      expect(result).toBeNull();
    });
  });

  describe('deleteFile', () => {
    it('should delete a file successfully', async () => {
      const buffer = Buffer.from('File to delete');
      const savedFile = await storageService.saveFile(buffer, 'delete-me.txt', 'text/plain');
      
      expect(fs.existsSync(savedFile.path)).toBe(true);
      
      const deleted = await storageService.deleteFile(savedFile.filename);
      expect(deleted).toBe(true);
      expect(fs.existsSync(savedFile.path)).toBe(false);
    });

    it('should return false when deleting non-existent file', async () => {
      const deleted = await storageService.deleteFile('non-existent.txt');
      expect(deleted).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list all files in upload directory', async () => {
      await storageService.saveFile(Buffer.from('file1'), 'file1.txt', 'text/plain');
      await storageService.saveFile(Buffer.from('file2'), 'file2.txt', 'text/plain');
      await storageService.saveFile(Buffer.from('file3'), 'file3.txt', 'text/plain');

      const files = await storageService.listFiles();
      
      expect(files.length).toBe(3);
      expect(files).toContain('file1.txt');
      expect(files).toContain('file2.txt');
      expect(files).toContain('file3.txt');
    });

    it('should return empty array for empty directory', async () => {
      // Create new empty storage service in fresh directory
      const emptyDir = '/tmp/projectforge-empty-test';
      fs.mkdirSync(emptyDir, { recursive: true });
      const emptyStorage = new LocalStorageService(emptyDir);
      
      const files = await emptyStorage.listFiles();
      expect(files).toEqual([]);
      
      // Cleanup
      fs.rmSync(emptyDir, { recursive: true });
    });
  });

  describe('getFileStats', () => {
    it('should return file statistics', async () => {
      const content = 'Statistics test content';
      const buffer = Buffer.from(content);
      const savedFile = await storageService.saveFile(buffer, 'stats-test.txt', 'text/plain');

      const stats = await storageService.getFileStats(savedFile.filename);

      expect(stats).toBeDefined();
      expect(stats?.size).toBe(buffer.length);
      expect(stats?.created).toBeInstanceOf(Date);
      expect(stats?.modified).toBeInstanceOf(Date);
    });

    it('should return null for non-existent file', async () => {
      const stats = await storageService.getFileStats('ghost-file.txt');
      expect(stats).toBeNull();
    });
  });
});

describe('File Type Detection', () => {
  const testDir = '/tmp/projectforge-type-test';
  let storageService: LocalStorageService;

  beforeEach(() => {
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    storageService = new LocalStorageService(testDir);
  });

  afterEach(() => {
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  const mimeTypeTests = [
    { ext: '.png', expected: 'image/png' },
    { ext: '.jpg', expected: 'image/jpeg' },
    { ext: '.pdf', expected: 'application/pdf' },
    { ext: '.docx', expected: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
    { ext: '.zip', expected: 'application/zip' },
    { ext: '.json', expected: 'application/json' },
    { ext: '.unknown', expected: 'application/octet-stream' },
  ];

  mimeTypeTests.forEach(({ ext, expected }) => {
    it(`should detect ${ext} as ${expected}`, async () => {
      const buffer = Buffer.from('test');
      const result = await storageService.saveFile(buffer, `test${ext}`, 'application/octet-stream');
      const file = await storageService.getFile(result.filename);
      
      expect(file?.mimeType).toBe(expected);
    });
  });
});
