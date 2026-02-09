"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../lib/prisma");
const auth_middleware_1 = require("../middleware/auth.middleware");
const error_middleware_1 = require("../middleware/error.middleware");
const mattermost_service_1 = require("../services/mattermost.service");
const router = (0, express_1.Router)();
// Get Mattermost settings for a project
router.get('/project/:projectId/settings', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            members: { where: { userId, role: { in: ['OWNER', 'MANAGER'] } } }
        }
    });
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }
    const isManager = project.members.length > 0;
    // Get existing notification settings
    const notificationSettings = await prisma_1.prisma.notificationSettings.findUnique({
        where: { projectId }
    });
    res.json({
        webhookUrl: isManager ? notificationSettings?.mattermostWebhookUrl || '' : '',
        channel: notificationSettings?.mattermostChannel || '',
        username: notificationSettings?.mattermostUsername || 'ProjectForge',
        enabled: notificationSettings?.mattermostEnabled || false,
        events: {
            taskAssigned: notificationSettings?.taskAssigned ?? true,
            taskCompleted: notificationSettings?.taskCompleted ?? true,
            taskDueSoon: notificationSettings?.taskDueSoon ?? true,
            taskComment: notificationSettings?.taskComment ?? true,
            milestoneReached: notificationSettings?.milestoneReached ?? true,
            projectUpdated: notificationSettings?.projectUpdated ?? false,
            memberJoined: notificationSettings?.memberJoined ?? true,
        },
        isManager
    });
}));
// Update Mattermost settings for a project
router.put('/project/:projectId/settings', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const userId = req.user.userId;
    const { webhookUrl, channel, username, enabled, events } = req.body;
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
        include: {
            members: { where: { userId, role: { in: ['OWNER', 'MANAGER'] } } }
        }
    });
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }
    const isManager = project.members.length > 0;
    if (!isManager) {
        return res.status(403).json({ error: 'Only managers can update settings' });
    }
    // Validate webhook URL if provided
    if (webhookUrl && !webhookUrl.match(/^https?:\/\/[^\s]+$/)) {
        return res.status(400).json({ error: 'Invalid webhook URL' });
    }
    // Update or create settings
    await prisma_1.prisma.notificationSettings.upsert({
        where: { projectId },
        create: {
            projectId,
            mattermostWebhookUrl: webhookUrl || '',
            mattermostChannel: channel || '',
            mattermostUsername: username || 'ProjectForge',
            mattermostEnabled: enabled ?? false,
            taskAssigned: events?.taskAssigned ?? true,
            taskCompleted: events?.taskCompleted ?? true,
            taskDueSoon: events?.taskDueSoon ?? true,
            taskComment: events?.taskComment ?? true,
            milestoneReached: events?.milestoneReached ?? true,
            projectUpdated: events?.projectUpdated ?? false,
            memberJoined: events?.memberJoined ?? true,
        },
        update: {
            mattermostWebhookUrl: webhookUrl ?? '',
            mattermostChannel: channel ?? '',
            mattermostUsername: username ?? 'ProjectForge',
            mattermostEnabled: enabled ?? false,
            taskAssigned: events?.taskAssigned,
            taskCompleted: events?.taskCompleted,
            taskDueSoon: events?.taskDueSoon,
            taskComment: events?.taskComment,
            milestoneReached: events?.milestoneReached,
            projectUpdated: events?.projectUpdated,
            memberJoined: events?.memberJoined,
        }
    });
    // Update service configuration
    mattermost_service_1.mattermostService.updateConfig({
        webhookUrl,
        channel,
        username,
        enabled
    });
    // Test the webhook if enabled
    if (enabled && webhookUrl) {
        const testResult = await mattermost_service_1.mattermostService.sendMessage({
            text: '✅ **ProjectForge notifications connected successfully!**\n\nYou will receive notifications for this project in this channel.',
            channel: channel
        });
        if (!testResult) {
            return res.status(400).json({
                error: 'Settings saved but webhook test failed. Please check your webhook URL.'
            });
        }
    }
    res.json({ message: 'Settings updated successfully' });
}));
// Test webhook connection
router.post('/project/:projectId/test', auth_middleware_1.authenticate, (0, error_middleware_1.asyncHandler)(async (req, res) => {
    const { projectId } = req.params;
    const project = await prisma_1.prisma.project.findUnique({
        where: { id: projectId },
    });
    if (!project) {
        return res.status(404).json({ error: 'Project not found' });
    }
    const settings = await prisma_1.prisma.notificationSettings.findUnique({
        where: { projectId }
    });
    if (!settings?.mattermostEnabled || !settings.mattermostWebhookUrl) {
        return res.status(400).json({ error: 'Mattermost integration not enabled' });
    }
    const result = await mattermost_service_1.mattermostService.sendMessage({
        text: '🧪 **Test notification from ProjectForge**\n\nIf you see this message, your Mattermost integration is working correctly!'
    });
    if (result) {
        res.json({ message: 'Test notification sent successfully' });
    }
    else {
        res.status(400).json({ error: 'Failed to send test notification' });
    }
}));
exports.default = router;
//# sourceMappingURL=notification.routes.js.map