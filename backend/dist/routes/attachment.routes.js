"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const storage_service_1 = require("../services/storage.service");
const router = (0, express_1.Router)();
// Get all attachments for a task
router.get('/task/:taskId', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { taskId } = req.params;
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: taskId },
        include: {
            project: {
                include: { members: { where: { userId: req.user.userId } } }
            }
        }
    });
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    const attachments = await prisma_1.prisma.attachment.findMany({
        where: { taskId },
        orderBy: { createdAt: 'desc' }
    });
    res.json(attachments);
}));
// Upload a new attachment
router.post('/upload', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const userId = req.user.userId;
    const { taskId } = req.body;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const task = await prisma_1.prisma.task.findUnique({
        where: { id: taskId }
    });
    if (!task) {
        return res.status(404).json({ error: 'Task not found' });
    }
    // Save file to local storage
    const fileRecord = await storage_service_1.localStorageService.saveFile(req.file.buffer, req.file.originalname, req.file.mimetype);
    // Create attachment record in database
    const attachment = await prisma_1.prisma.attachment.create({
        data: {
            taskId,
            name: fileRecord.originalName,
            url: fileRecord.path,
            mimeType: fileRecord.mimeType,
            size: fileRecord.size,
        }
    });
    res.status(201).json(attachment);
}));
// Download an attachment
router.get('/download/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const attachment = await prisma_1.prisma.attachment.findUnique({
        where: { id },
    });
    if (!attachment) {
        return res.status(404).json({ error: 'File not found' });
    }
    const file = await storage_service_1.localStorageService.getFile(attachment.url);
    if (!file) {
        return res.status(404).json({ error: 'File not found on disk' });
    }
    res.setHeader('Content-Type', attachment.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
    res.send(file.buffer);
}));
// Delete an attachment
router.delete('/:id', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userId;
    const attachment = await prisma_1.prisma.attachment.findUnique({
        where: { id },
    });
    if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' });
    }
    // Only owner can delete
    if (attachment.taskId) {
        const task = await prisma_1.prisma.task.findUnique({
            where: { id: attachment.taskId },
        });
        if (task && task.creatorId !== userId) {
            return res.status(403).json({ error: 'Access denied' });
        }
    }
    // Delete file from storage
    await storage_service_1.localStorageService.deleteFile(attachment.url);
    // Delete record from database
    await prisma_1.prisma.attachment.delete({ where: { id } });
    res.json({ message: 'Attachment deleted successfully' });
}));
exports.default = router;
//# sourceMappingURL=attachment.routes.js.map