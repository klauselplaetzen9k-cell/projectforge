-- ============================================================================
-- Migration: add_notification_settings
-- Description: Add Mattermost notification settings per project
-- ============================================================================

-- Create notification settings table
CREATE TABLE IF NOT EXISTS "NotificationSettings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "mattermostWebhookUrl" TEXT NOT NULL DEFAULT '',
    "mattermostChannel" TEXT NOT NULL DEFAULT '',
    "mattermostUsername" TEXT NOT NULL DEFAULT 'ProjectForge',
    "mattermostEnabled" BOOLEAN NOT NULL DEFAULT false,
    "taskAssigned" BOOLEAN NOT NULL DEFAULT true,
    "taskCompleted" BOOLEAN NOT NULL DEFAULT true,
    "taskDueSoon" BOOLEAN NOT NULL DEFAULT true,
    "taskComment" BOOLEAN NOT NULL DEFAULT true,
    "milestoneReached" BOOLEAN NOT NULL DEFAULT true,
    "projectUpdated" BOOLEAN NOT NULL DEFAULT false,
    "memberJoined" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationSettings_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint on projectId
CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSettings_projectId_key" ON "NotificationSettings"("projectId");

-- Add foreign key
ALTER TABLE "NotificationSettings" 
ADD CONSTRAINT "NotificationSettings_projectId_fkey" 
FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS "NotificationSettings_projectId_idx" ON "NotificationSettings"("projectId");
