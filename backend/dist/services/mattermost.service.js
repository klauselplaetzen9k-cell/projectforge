"use strict";
// ============================================================================
// Mattermost Integration Service
// ============================================================================
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.mattermostService = exports.MattermostService = void 0;
const axios_1 = __importDefault(require("axios"));
class MattermostService {
    webhookUrl;
    defaultChannel;
    username;
    iconUrl;
    enabled = false;
    constructor(webhookUrl, config) {
        this.webhookUrl = webhookUrl || '';
        this.defaultChannel = config?.channel;
        this.username = config?.username || 'ProjectForge';
        this.iconUrl = config?.iconUrl;
        this.enabled = !!webhookUrl;
    }
    /**
     * Update configuration
     */
    updateConfig(config) {
        if (config.webhookUrl) {
            this.webhookUrl = config.webhookUrl;
            this.enabled = true;
        }
        if (config.channel)
            this.defaultChannel = config.channel;
        if (config.username)
            this.username = config.username;
        if (config.iconUrl)
            this.iconUrl = config.iconUrl;
    }
    /**
     * Check if Mattermost integration is enabled
     */
    isEnabled() {
        return this.enabled && !!this.webhookUrl;
    }
    /**
     * Send a message to Mattermost
     */
    async sendMessage(payload) {
        if (!this.isEnabled()) {
            console.log('[Mattermost] Integration disabled, skipping notification');
            return false;
        }
        try {
            const enrichedPayload = {
                username: this.username,
                icon_url: this.iconUrl,
                ...payload,
                channel: payload.channel || this.defaultChannel,
            };
            await axios_1.default.post(this.webhookUrl, enrichedPayload, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 10000,
            });
            console.log('[Mattermost] Notification sent successfully');
            return true;
        }
        catch (error) {
            console.error('[Mattermost] Failed to send notification:', error);
            return false;
        }
    }
    /**
     * Send task assigned notification
     */
    async notifyTaskAssigned(data) {
        const payload = {
            text: `📋 **New task assigned to ${data.assigneeName}**`,
            attachments: [
                {
                    color: '#6366f1',
                    title: data.taskTitle,
                    title_link: data.url,
                    text: `Project: *${data.projectName}*`,
                    fields: [
                        { short: true, title: 'Assignee', value: data.assigneeName },
                        { short: true, title: 'Assigned by', value: data.assignerName },
                        { short: true, title: 'Task ID', value: data.taskId },
                    ],
                    footer: 'ProjectForge',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send task completed notification
     */
    async notifyTaskCompleted(data) {
        const payload = {
            text: `✅ **Task completed by ${data.completedBy}**`,
            attachments: [
                {
                    color: '#22c55e',
                    title: data.taskTitle,
                    title_link: data.url,
                    fields: [
                        { short: true, title: 'Completed by', value: data.completedBy },
                        { short: true, title: 'Project', value: data.projectName },
                        { short: true, title: 'Task ID', value: data.taskId },
                    ],
                    footer: 'ProjectForge',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send task due soon notification
     */
    async notifyTaskDueSoon(data) {
        const payload = {
            text: `⏰ **Task due soon - ${data.assigneeName}**`,
            attachments: [
                {
                    color: '#f59e0b',
                    title: data.taskTitle,
                    title_link: data.url,
                    fields: [
                        { short: true, title: 'Assignee', value: data.assigneeName },
                        { short: true, title: 'Due Date', value: data.dueDate },
                        { short: true, title: 'Project', value: data.projectName },
                    ],
                    footer: 'ProjectForge - Due Soon Reminder',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send new comment notification
     */
    async notifyNewComment(data) {
        const preview = data.commentPreview.length > 200
            ? data.commentPreview.substring(0, 200) + '...'
            : data.commentPreview;
        const payload = {
            text: `💬 **New comment by ${data.commenterName}**`,
            attachments: [
                {
                    color: '#3b82f6',
                    title: data.taskTitle,
                    title_link: data.url,
                    text: `>${preview}\n\n**Project:** ${data.projectName}`,
                    fields: [
                        { short: true, title: 'Task ID', value: data.taskId },
                    ],
                    footer: 'ProjectForge',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send milestone reached notification
     */
    async notifyMilestoneReached(data) {
        const payload = {
            text: `🎉 **Milestone reached: ${data.milestoneName}**`,
            attachments: [
                {
                    color: '#a855f7',
                    title: data.milestoneName,
                    title_link: data.url,
                    fields: [
                        { short: true, title: 'Project', value: data.projectName },
                        { short: true, title: 'Completed by', value: data.completedBy },
                    ],
                    footer: 'ProjectForge - Milestone',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send project update notification
     */
    async notifyProjectUpdate(data) {
        const payload = {
            text: `📁 **Project update by ${data.updatedBy}**`,
            attachments: [
                {
                    color: '#64748b',
                    title: data.projectName,
                    title_link: data.url,
                    text: data.description,
                    fields: [
                        { short: true, title: 'Update type', value: data.updateType },
                        { short: true, title: 'Updated by', value: data.updatedBy },
                    ],
                    footer: 'ProjectForge',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
    /**
     * Send new member joined notification
     */
    async notifyMemberJoined(data) {
        const payload = {
            text: `👋 **${data.memberName} joined ${data.projectName}**`,
            attachments: [
                {
                    color: '#22c55e',
                    fields: [
                        { short: true, title: 'Member', value: data.memberName },
                        { short: true, title: 'Role', value: data.role },
                        { short: true, title: 'Invited by', value: data.invitedBy },
                        { short: true, title: 'Project', value: data.projectName },
                    ],
                    footer: 'ProjectForge',
                    timestamp: new Date().toISOString(),
                },
            ],
        };
        return this.sendMessage(payload);
    }
}
exports.MattermostService = MattermostService;
exports.mattermostService = new MattermostService();
//# sourceMappingURL=mattermost.service.js.map