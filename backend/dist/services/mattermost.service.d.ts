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
export declare class MattermostService {
    private webhookUrl;
    private defaultChannel?;
    private username?;
    private iconUrl?;
    private enabled;
    constructor(webhookUrl?: string, config?: Partial<NotificationConfig>);
    /**
     * Update configuration
     */
    updateConfig(config: Partial<NotificationConfig>): void;
    /**
     * Check if Mattermost integration is enabled
     */
    isEnabled(): boolean;
    /**
     * Send a message to Mattermost
     */
    sendMessage(payload: MattermostWebhookPayload): Promise<boolean>;
    /**
     * Send task assigned notification
     */
    notifyTaskAssigned(data: {
        taskTitle: string;
        taskId: string;
        assigneeName: string;
        assignerName: string;
        projectName: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send task completed notification
     */
    notifyTaskCompleted(data: {
        taskTitle: string;
        taskId: string;
        completedBy: string;
        projectName: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send task due soon notification
     */
    notifyTaskDueSoon(data: {
        taskTitle: string;
        taskId: string;
        assigneeName: string;
        dueDate: string;
        projectName: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send new comment notification
     */
    notifyNewComment(data: {
        taskTitle: string;
        taskId: string;
        commenterName: string;
        commentPreview: string;
        projectName: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send milestone reached notification
     */
    notifyMilestoneReached(data: {
        milestoneName: string;
        projectName: string;
        completedBy: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send project update notification
     */
    notifyProjectUpdate(data: {
        projectName: string;
        updateType: string;
        updatedBy: string;
        description: string;
        url?: string;
    }): Promise<boolean>;
    /**
     * Send new member joined notification
     */
    notifyMemberJoined(data: {
        projectName: string;
        memberName: string;
        role: string;
        invitedBy: string;
    }): Promise<boolean>;
}
export declare const mattermostService: MattermostService;
//# sourceMappingURL=mattermost.service.d.ts.map