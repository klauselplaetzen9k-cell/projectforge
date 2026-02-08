-- ============================================================================
-- Initial Schema Migration
-- ============================================================================

-- Create enum types first
DO $$ BEGIN
    CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ProjectMemberRole" AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TaskStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "ActivityType" AS ENUM (
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
        'TASK_CREATED', 'TASK_UPDATED', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_COMMENTED',
        'MEMBER_ADDED', 'MEMBER_REMOVED', 'MILESTONE_COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TimelineEventType" AS ENUM ('MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

-- User sessions
CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "accessToken" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_token_key" ON "UserSession"("token");
CREATE INDEX IF NOT EXISTS "UserSession_userId_idx" ON "UserSession"("userId");

-- Teams
CREATE TABLE IF NOT EXISTS "Team" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Team_slug_key" ON "Team"("slug");

-- Team members
CREATE TABLE IF NOT EXISTS "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");
CREATE INDEX IF NOT EXISTS "TeamMember_userId_idx" ON "TeamMember"("userId");

-- Projects
CREATE TABLE IF NOT EXISTS "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "color" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Project_teamId_slug_key" ON "Project"("teamId", "slug");
CREATE INDEX IF NOT EXISTS "Project_teamId_idx" ON "Project"("teamId");
CREATE INDEX IF NOT EXISTS "Project_slug_idx" ON "Project"("slug");

-- Project members
CREATE TABLE IF NOT EXISTS "ProjectMember" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ProjectMember_projectId_userId_key" ON "ProjectMember"("projectId", "userId");
CREATE INDEX IF NOT EXISTS "ProjectMember_projectId_idx" ON "ProjectMember"("projectId");
CREATE INDEX IF NOT EXISTS "ProjectMember_userId_idx" ON "ProjectMember"("userId");

-- Work packages
CREATE TABLE IF NOT EXISTS "WorkPackage" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkPackage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkPackage_projectId_idx" ON "WorkPackage"("projectId");
CREATE INDEX IF NOT EXISTS "WorkPackage_parentId_idx" ON "WorkPackage"("parentId");

-- Milestones
CREATE TABLE IF NOT EXISTS "Milestone" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Milestone_projectId_idx" ON "Milestone"("projectId");

-- Tasks
CREATE TABLE IF NOT EXISTS "Task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "projectId" TEXT NOT NULL,
    "workPackageId" TEXT,
    "milestoneId" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'TODO',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assigneeId" TEXT,
    "creatorId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "estimatedHours" FLOAT,
    "loggedHours" FLOAT NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Task_projectId_idx" ON "Task"("projectId");
CREATE INDEX IF NOT EXISTS "Task_workPackageId_idx" ON "Task"("workPackageId");
CREATE INDEX IF NOT EXISTS "Task_milestoneId_idx" ON "Task"("milestoneId");
CREATE INDEX IF NOT EXISTS "Task_assigneeId_idx" ON "Task"("assigneeId");

-- Task dependencies
CREATE TABLE IF NOT EXISTS "TaskDependency" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "dependsOnTaskId" TEXT NOT NULL,
    CONSTRAINT "TaskDependency_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TaskDependency_taskId_dependsOnTaskId_key" ON "TaskDependency"("taskId", "dependsOnTaskId");
CREATE INDEX IF NOT EXISTS "TaskDependency_taskId_idx" ON "TaskDependency"("taskId");
CREATE INDEX IF NOT EXISTS "TaskDependency_dependsOnTaskId_idx" ON "TaskDependency"("dependsOnTaskId");

-- Comments
CREATE TABLE IF NOT EXISTS "Comment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Comment_taskId_idx" ON "Comment"("taskId");
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");

-- Attachments
CREATE TABLE IF NOT EXISTS "Attachment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "taskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Attachment_taskId_idx" ON "Attachment"("taskId");

-- Activity
CREATE TABLE IF NOT EXISTS "Activity" (
    "id" TEXT NOT NULL,
    "action" "ActivityType" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "userId" TEXT,
    "projectId" TEXT,
    "taskId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Activity_entityType_entityId_idx" ON "Activity"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "Activity_userId_idx" ON "Activity"("userId");
CREATE INDEX IF NOT EXISTS "Activity_projectId_idx" ON "Activity"("projectId");
CREATE INDEX IF NOT EXISTS "Activity_createdAt_idx" ON "Activity"("createdAt");

-- Notifications
CREATE TABLE IF NOT EXISTS "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "link" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Notification_userId_idx" ON "Notification"("userId");
CREATE INDEX IF NOT EXISTS "Notification_isRead_idx" ON "Notification"("isRead");
CREATE INDEX IF NOT EXISTS "Notification_createdAt_idx" ON "Notification"("createdAt");

-- Notification settings
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

CREATE UNIQUE INDEX IF NOT EXISTS "NotificationSettings_projectId_key" ON "NotificationSettings"("projectId");
CREATE INDEX IF NOT EXISTS "NotificationSettings_projectId_idx" ON "NotificationSettings"("projectId");

-- Timelines
CREATE TABLE IF NOT EXISTS "Timeline" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Timeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Timeline_projectId_idx" ON "Timeline"("projectId");

-- Timeline events
CREATE TABLE IF NOT EXISTS "TimelineEvent" (
    "id" TEXT NOT NULL,
    "timelineId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "eventType" "TimelineEventType" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TimelineEvent_timelineId_idx" ON "TimelineEvent"("timelineId");
CREATE INDEX IF NOT EXISTS "TimelineEvent_startDate_idx" ON "TimelineEvent"("startDate");

-- Add foreign key constraints
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Team" ADD CONSTRAINT "Team_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectMember" ADD CONSTRAINT "ProjectMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkPackage" ADD CONSTRAINT "WorkPackage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_workPackageId_fkey" FOREIGN KEY ("workPackageId") REFERENCES "WorkPackage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Task" ADD CONSTRAINT "Task_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskDependency" ADD CONSTRAINT "TaskDependency_dependsOnTaskId_fkey" FOREIGN KEY ("dependsOnTaskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" ADD CONSTRAINT "Comment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Activity" ADD CONSTRAINT "Activity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationSettings" ADD CONSTRAINT "NotificationSettings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Timeline" ADD CONSTRAINT "Timeline_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_timelineId_fkey" FOREIGN KEY ("timelineId") REFERENCES "Timeline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
