import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { localStorageService } from '../services/storage.service';

const router = Router();

// Get all attachments for a task
router.get('/task/:taskId', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { taskId } = req.params;

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: {
      project: {
        include: { members: { where: { userId: req.user!.userId } } }
      }
    }
  });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  const attachments = await prisma.attachment.findMany({
    where: { taskId },
    orderBy: { createdAt: 'desc' }
  });

  res.json(attachments);
}));

// Upload a new attachment
router.post('/upload', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const { taskId } = req.body;

  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId }
  });

  if (!task) {
    return res.status(404).json({ error: 'Task not found' });
  }

  // Save file to local storage
  const fileRecord = await localStorageService.saveFile(
    req.file.buffer,
    req.file.originalname,
    req.file.mimetype
  );

  // Create attachment record in database
  const attachment = await prisma.attachment.create({
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
router.get('/download/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });

  if (!attachment) {
    return res.status(404).json({ error: 'File not found' });
  }

  const file = await localStorageService.getFile(attachment.url);

  if (!file) {
    return res.status(404).json({ error: 'File not found on disk' });
  }

  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${attachment.name}"`);
  res.send(file.buffer);
}));

// Delete an attachment
router.delete('/:id', authenticate, asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  const attachment = await prisma.attachment.findUnique({
    where: { id },
  });

  if (!attachment) {
    return res.status(404).json({ error: 'Attachment not found' });
  }

  // Only owner can delete
  if (attachment.taskId) {
    const task = await prisma.task.findUnique({
      where: { id: attachment.taskId },
    });
    if (task && task.creatorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
  }

  // Delete file from storage
  await localStorageService.deleteFile(attachment.url);

  // Delete record from database
  await prisma.attachment.delete({ where: { id } });

  res.json({ message: 'Attachment deleted successfully' });
}));

export default router;
