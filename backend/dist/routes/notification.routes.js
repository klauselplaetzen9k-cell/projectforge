"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const client_1 = require("@prisma/client");
const auth_middleware_1 = require("../middleware/auth.middleware");
const mattermost_service_1 = require("../services/mattermost.service");
const router = (0, express_1.Router)();
const prisma = new client_1.PrismaClient();
// Get Mattermost settings for a project
router.get('/project/:projectId/settings', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: { where: { userId, role: { in: ['OWNER', 'MANAGER'] } } }
            }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const isManager = project.members.length > 0 || project.userId === userId;
        // Get existing notification settings
        const notificationSettings = await prisma.notificationSettings.findUnique({
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
    }
    catch (error) {
        console.error('Error fetching Mattermost settings:', error);
        res.status(500).json({ error: 'Failed to fetch settings' });
    }
});
// Update Mattermost settings for a project
router.put('/project/:projectId/settings', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const { webhookUrl, channel, username, enabled, events } = req.body;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: { where: { userId, role: { in: ['OWNER', 'MANAGER'] } } }
            }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const isManager = project.members.length > 0 || project.userId === userId;
        if (!isManager) {
            return res.status(403).json({ error: 'Only managers can update settings' });
        }
        // Validate webhook URL if provided
        if (webhookUrl && !webhookUrl.match(/^https?:\/\/[^\s]+$/)) {
            return res.status(400).json({ error: 'Invalid webhook URL' });
        }
        // Update or create settings
        const settings = await prisma.notificationSettings.upsert({
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
    }
    catch (error) {
        console.error('Error updating Mattermost settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});
// Test webhook connection
router.post('/project/:projectId/test', auth_middleware_1.authenticateToken, async (req, res) => {
    try {
        const { projectId } = req.params;
        const userId = req.user.id;
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: {
                members: { where: { userId, role: { in: ['OWNER', 'MANAGER'] } } }
            }
        });
        if (!project) {
            return res.status(404).json({ error: 'Project not found' });
        }
        const settings = await prisma.notificationSettings.findUnique({
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
    }
    catch (error) {
        console.error('Error testing webhook:', error);
        res.status(500).json({ error: 'Failed to test webhook' });
    }
});
exports.default = router;
//# sourceMappingURL=notification.routes.js.map