// ============================================================================
// Mattermost Integration Service
// ============================================================================

import axios from 'axios';

export interface MattermostWebhookPayload {
  channel?: string;
  username?: string;
  icon_url?: string;
  text: string;
  attachments?: MattermostAttachment[];
  props?: Record<string, string>;
}

export interface MattermostAttachment {
  fallback?: string;
  color?: string;
  title?: string;
  title_link?: string;
  text?: string;
  fields?: MattermostField[];
  footer?: string;
  footer_icon?: string;
  timestamp?: string;
}

export interface MattermostField {
  short?: boolean;
  title: string;
  value: string;
}

export interface NotificationConfig {
  enabled: boolean;
  webhookUrl: string;
  channel?: string;
  username?: string;
  iconUrl?: string;
  events: {
    taskAssigned: boolean;
    taskCompleted: boolean;
    taskDueSoon: boolean;
    taskComment: boolean;
    milestoneReached: boolean;
    projectUpdated: boolean;
    memberJoined: boolean;
  };
}

export class MattermostService {
  private webhookUrl: string;
  private defaultChannel?: string;
  private username?: string;
  private iconUrl?: string;
  private enabled: boolean = false;

  constructor(webhookUrl?: string, config?: Partial<NotificationConfig>) {
    this.webhookUrl = webhookUrl || '';
    this.defaultChannel = config?.channel;
    this.username = config?.username || 'ProjectForge';
    this.iconUrl = config?.iconUrl;
    this.enabled = !!webhookUrl;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<NotificationConfig>): void {
    if (config.webhookUrl) {
      this.webhookUrl = config.webhookUrl;
      this.enabled = true;
    }
    if (config.channel) this.defaultChannel = config.channel;
    if (config.username) this.username = config.username;
    if (config.iconUrl) this.iconUrl = config.iconUrl;
  }

  /**
   * Check if Mattermost integration is enabled
   */
  isEnabled(): boolean {
    return this.enabled && !!this.webhookUrl;
  }

  /**
   * Send a message to Mattermost
   */
  async sendMessage(payload: MattermostWebhookPayload): Promise<boolean> {
    if (!this.isEnabled()) {
      console.log('[Mattermost] Integration disabled, skipping notification');
      return false;
    }

    try {
      const enrichedPayload: MattermostWebhookPayload = {
        username: this.username,
        icon_url: this.iconUrl,
        ...payload,
        channel: payload.channel || this.defaultChannel,
      };

      await axios.post(this.webhookUrl, enrichedPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 10000,
      });

      console.log('[Mattermost] Notification sent successfully');
      return true;
    } catch (error) {
      console.error('[Mattermost] Failed to send notification:', error);
      return false;
    }
  }

  /**
   * Send task assigned notification
   */
  async notifyTaskAssigned(data: {
    taskTitle: string;
    taskId: string;
    assigneeName: string;
    assignerName: string;
    projectName: string;
    url?: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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
  async notifyTaskCompleted(data: {
    taskTitle: string;
    taskId: string;
    completedBy: string;
    projectName: string;
    url?: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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
  async notifyTaskDueSoon(data: {
    taskTitle: string;
    taskId: string;
    assigneeName: string;
    dueDate: string;
    projectName: string;
    url?: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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
  async notifyNewComment(data: {
    taskTitle: string;
    taskId: string;
    commenterName: string;
    commentPreview: string;
    projectName: string;
    url?: string;
  }): Promise<boolean> {
    const preview = data.commentPreview.length > 200 
      ? data.commentPreview.substring(0, 200) + '...' 
      : data.commentPreview;

    const payload: MattermostWebhookPayload = {
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
  async notifyMilestoneReached(data: {
    milestoneName: string;
    projectName: string;
    completedBy: string;
    url?: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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
  async notifyProjectUpdate(data: {
    projectName: string;
    updateType: string;
    updatedBy: string;
    description: string;
    url?: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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
  async notifyMemberJoined(data: {
    projectName: string;
    memberName: string;
    role: string;
    invitedBy: string;
  }): Promise<boolean> {
    const payload: MattermostWebhookPayload = {
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

export const mattermostService = new MattermostService();
