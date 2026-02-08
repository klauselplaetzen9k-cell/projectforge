"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const storage_service_1 = require("../services/storage.service");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get all attachments for a task
router.get('/task/:taskId', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            include: {
                project: {
                    include: { members: { where: { userId } } }
                }
            }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Check access
        const isMember = task.project.members.length > 0;
        const isOwner = task.createdById === userId;
        if (!isMember && !isOwner && task.project.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const attachments = await prisma.attachment.findMany({
            where: { taskId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(attachments);
    }
    catch (error) {
        console.error('Error fetching attachments:', error);
        res.status(500).json({ error: 'Failed to fetch attachments' });
    }
});
// Upload a new attachment
router.post('/upload', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const userId = req.user.id;
        const { taskId } = req.body;
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        const uploadedFile = req.files.file;
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        // Save file to local storage
        const fileRecord = await storage_service_1.localStorageService.saveFile(uploadedFile.data, uploadedFile.name, uploadedFile.mimetype);
        // Create attachment record in database
        const attachment = await prisma.attachment.create({
            data: {
                taskId,
                userId,
                filename: fileRecord.filename,
                originalName: fileRecord.originalName,
                mimeType: fileRecord.mimeType,
                size: fileRecord.size,
                path: fileRecord.path
            }
        });
        // Create activity log
        await prisma.activityLog.create({
            data: {
                userId,
                projectId: task.projectId,
                workPackageId: task.workPackageId || undefined,
                taskId,
                action: 'ATTACHMENT_ADDED',
                details: { filename: fileRecord.originalName }
            }
        });
        res.status(201).json(attachment);
    }
    catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
});
// Download an attachment
router.get('/download/:filename', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { filename } = req.params;
        const userId = req.user.id;
        const attachment = await prisma.attachment.findFirst({
            where: { filename },
            include: { task: { include: { project: { include: { members: true } } } } }
        });
        if (!attachment) {
            return res.status(404).json({ error: 'File not found' });
        }
        // Check access
        const isMember = attachment.task.project.members.some((m) => m.userId === userId);
        const isOwner = attachment.userId === userId;
        const isTaskCreator = attachment.task.createdById === userId;
        if (!isMember && !isOwner && !isTaskCreator && attachment.task.project.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        const file = await storage_service_1.localStorageService.getFile(filename);
        if (!file) {
            return res.status(404).json({ error: 'File not found on disk' });
        }
        res.setHeader('Content-Type', file.mimeType);
        res.setHeader('Content-Disposition', `attachment; filename="${attachment.originalName}"`);
        res.send(file.buffer);
    }
    catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
});
// Delete an attachment
router.delete('/:id', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const attachment = await prisma.attachment.findUnique({
            where: { id },
            include: { task: true }
        });
        if (!attachment) {
            return res.status(404).json({ error: 'Attachment not found' });
        }
        // Only owner or project admin can delete
        if (attachment.userId !== userId && attachment.task.project.userId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
        // Delete file from storage
        await storage_service_1.localStorageService.deleteFile(attachment.filename);
        // Delete record from database
        await prisma.attachment.delete({ where: { id } });
        // Create activity log
        await prisma.activityLog.create({
            data: {
                userId,
                projectId: attachment.task.projectId,
                workPackageId: attachment.task.workPackageId || undefined,
                taskId: attachment.taskId,
                action: 'ATTACHMENT_DELETED',
                details: { filename: attachment.originalName }
            }
        });
        res.json({ message: 'Attachment deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting attachment:', error);
        res.status(500).json({ error: 'Failed to delete attachment' });
    }
});
exports.default = router;
//# sourceMappingURL=attachment.routes.js.map