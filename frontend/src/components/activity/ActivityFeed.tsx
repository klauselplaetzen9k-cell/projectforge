// ============================================================================
// Activity Feed Component
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Activity {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  userId?: string;
  projectId?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  project?: {
    id: string;
    name: string;
  };
}

interface ActivityFeedProps {
  projectId?: string;
  limit?: number;
}

// ============================================================================
// Activity Feed Component
// ============================================================================

export default function ActivityFeed({ projectId, limit = 50 }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchActivities();
  }, [projectId]);

  const fetchActivities = async () => {
    try {
      // API endpoint for activities would need to be implemented
      // For now, we'll show a placeholder
      setActivities([]);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('PROJECT')) return '📁';
    if (action.includes('TASK')) return '📋';
    if (action.includes('MEMBER')) return '👥';
    if (action.includes('MILESTONE')) return '🎯';
    if (action.includes('COMMENT')) return '💬';
    return '📌';
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  const filteredActivities = activities.filter(a => {
    if (filter === 'all') return true;
    if (filter === 'tasks') return a.entityType === 'task';
    if (filter === 'projects') return a.entityType === 'project';
    if (filter === 'members') return a.action.includes('MEMBER');
    return true;
  });

  if (loading) {
    return <div className="loading">Loading activity...</div>;
  }

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h3>📋 Activity</h3>
        <div className="activity-filters">
          <button
            className={`filter-pill ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-pill ${filter === 'tasks' ? 'active' : ''}`}
            onClick={() => setFilter('tasks')}
          >
            Tasks
          </button>
          <button
            className={`filter-pill ${filter === 'projects' ? 'active' : ''}`}
            onClick={() => setFilter('projects')}
          >
            Projects
          </button>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="no-activity">
          <span className="no-activity-icon">📋</span>
          <p>No activity yet</p>
          <span className="no-activity-hint">Activity will appear here as you and your team work on projects.</span>
        </div>
      ) : (
        <div className="activity-list">
          {filteredActivities.map(activity => (
            <div key={activity.id} className="activity-item">
              <div className="activity-icon">
                {getActivityIcon(activity.action)}
              </div>
              <div className="activity-content">
                <div className="activity-header-row">
                  <span className="activity-user">
                    {activity.user ? 
                      `${activity.user.firstName} ${activity.user.lastName}` : 
                      'System'}
                  </span>
                  <span className="activity-time">{formatTime(activity.createdAt)}</span>
                </div>
                <p className="activity-message">
                  {formatAction(activity.action)}
                  {activity.metadata?.taskTitle && (
                    <span className="activity-entity"> "{activity.metadata.taskTitle}"</span>
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
