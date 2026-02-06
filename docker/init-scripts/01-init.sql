-- ProjectForge Database Initialization
-- This script runs automatically when PostgreSQL container is first created

-- Create custom types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('ADMIN', 'MANAGER', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE team_member_role AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_status AS ENUM ('ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE project_member_role AS ENUM ('OWNER', 'MANAGER', 'MEMBER', 'VIEWER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE work_package_status AS ENUM ('TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE task_status AS ENUM ('TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE', 'CANCELLED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE priority AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE activity_type AS ENUM (
        'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_DELETED',
        'TASK_CREATED', 'TASK_UPDATED', 'TASK_ASSIGNED', 'TASK_COMPLETED', 'TASK_COMMENTED',
        'MEMBER_ADDED', 'MEMBER_REMOVED', 'MILESTONE_COMPLETED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE timeline_event_type AS ENUM ('MILESTONE', 'DEADLINE', 'REVIEW', 'MEETING', 'RELEASE', 'CUSTOM');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Grant access to public schema
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
