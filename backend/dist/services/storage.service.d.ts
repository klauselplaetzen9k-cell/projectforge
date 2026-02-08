export interface UploadedFile {
    id: string;
    originalName: string;
    filename: string;
    mimeType: string;
    size: number;
    path: string;
    uploadedAt: Date;
}
export declare class LocalStorageService {
    private uploadDir;
    constructor(customDir?: string);
    /**
     * Generate a unique filename
     */
    private generateFilename;
    /**
     * Save a file from buffer
     */
    saveFile(buffer: Buffer, originalName: string, mimeType: string): Promise<UploadedFile>;
    /**
     * Get file by ID
     */
    getFile(filename: string): Promise<{
        buffer: Buffer;
        mimeType: string;
    } | null>;
    /**
     * Delete file by filename
     */
    deleteFile(filename: string): Promise<boolean>;
    /**
     * Get all files in upload directory
     */
    listFiles(): Promise<string[]>;
    /**
     * Get file stats
     */
    getFileStats(filename: string): Promise<{
        size: number;
        created: Date;
        modified: Date;
    } | null>;
}
export declare const localStorageService: LocalStorageService;
//# sourceMappingURL=storage.service.d.ts.map