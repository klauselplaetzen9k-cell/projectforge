"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localStorageService = exports.LocalStorageService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const UPLOAD_DIR = path_1.default.join(process.cwd(), 'uploads');
// Ensure upload directory exists
if (!fs_1.default.existsSync(UPLOAD_DIR)) {
    fs_1.default.mkdirSync(UPLOAD_DIR, { recursive: true });
}
class LocalStorageService {
    uploadDir;
    constructor(customDir) {
        this.uploadDir = customDir || UPLOAD_DIR;
        if (!fs_1.default.existsSync(this.uploadDir)) {
            fs_1.default.mkdirSync(this.uploadDir, { recursive: true });
        }
    }
    /**
     * Generate a unique filename
     */
    generateFilename(originalName) {
        const ext = path_1.default.extname(originalName);
        const timestamp = Date.now();
        const random = crypto_1.default.randomBytes(8).toString('hex');
        return `${timestamp}-${random}${ext}`;
    }
    /**
     * Save a file from buffer
     */
    async saveFile(buffer, originalName, mimeType) {
        const filename = this.generateFilename(originalName);
        const filePath = path_1.default.join(this.uploadDir, filename);
        await fs_1.default.promises.writeFile(filePath, buffer);
        const stat = await fs_1.default.promises.stat(filePath);
        return {
            id: crypto_1.default.randomUUID(),
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
    async getFile(filename) {
        const filePath = path_1.default.join(this.uploadDir, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return null;
        }
        const buffer = await fs_1.default.promises.readFile(filePath);
        const ext = path_1.default.extname(filename).toLowerCase();
        const mimeTypes = {
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
    async deleteFile(filename) {
        const filePath = path_1.default.join(this.uploadDir, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return false;
        }
        await fs_1.default.promises.unlink(filePath);
        return true;
    }
    /**
     * Get all files in upload directory
     */
    async listFiles() {
        const files = await fs_1.default.promises.readdir(this.uploadDir);
        return files;
    }
    /**
     * Get file stats
     */
    async getFileStats(filename) {
        const filePath = path_1.default.join(this.uploadDir, filename);
        if (!fs_1.default.existsSync(filePath)) {
            return null;
        }
        const stat = await fs_1.default.promises.stat(filePath);
        return {
            size: stat.size,
            created: stat.birthtime,
            modified: stat.mtime,
        };
    }
}
exports.LocalStorageService = LocalStorageService;
exports.localStorageService = new LocalStorageService();
//# sourceMappingURL=storage.service.js.map