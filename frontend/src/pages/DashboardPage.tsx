// ============================================================================
// Dashboard Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { http } from '../services/api';
import ActivityFeed from '../components/activity/ActivityFeed';

// ============================================================================
// Types
// ============================================================================

interface MyTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate?: string;
  project: {
    id: string;
    name: string;
    key: string;
  };
}

interface ProjectSummary {
  id: string;
  name: string;
  key: string;
  color: string;
  taskCount: number;
  completedCount: number;
}

interface DashboardStats {
  myTasks: number;
  overdueTasks: number;
  myProjects: number;
  notifications: number;
}

// ============================================================================
// Dashboard Page Component
// ============================================================================

export default function DashboardPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [projectsState, setProjectsState] = useState<ProjectSummary[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    myTasks: 0,
    overdueTasks: 0,
    myProjects: 0,
    notifications: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch my tasks
      const { tasks: myTasks } = await http.get('/tasks/my');
      setTasks(myTasks.slice(0, 5)); // Show only 5 tasks

      // Calculate stats
      const now = new Date();
      const overdue = myTasks.filter((t: MyTask) => 
        t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE'
      );

      setStats({
        myTasks: myTasks.length,
        overdueTasks: overdue.length,
        myProjects: 0, // Would need API endpoint
        notifications: 0, // Would need API endpoint
      });
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      default: return 'priority-low';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DONE': return 'status-done';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'IN_REVIEW': return 'status-review';
      default: return 'status-todo';
    }
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div className="dashboard-page">
      {/* Welcome Section */}
      <div className="welcome-section">
        <div className="welcome-content">
          <h1>Welcome back, {user?.firstName}! 👋</h1>
          <p>Here's what's happening with your projects today.</p>
        </div>
        <Link to="/projects" className="primary-button">
          View All Projects
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <span className="stat-value">{stats.myTasks}</span>
            <span className="stat-label">My Tasks</span>
          </div>
        </div>
        <div className="stat-card warning">
          <div className="stat-icon">⚠️</div>
          <div className="stat-content">
            <span className="stat-value">{stats.overdueTasks}</span>
            <span className="stat-label">Overdue</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📁</div>
          <div className="stat-content">
            <span className="stat-value">{stats.myProjects || '-'}</span>
            <span className="stat-label">Projects</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">🔔</div>
          <div className="stat-content">
            <span className="stat-value">{stats.notifications || '-'}</span>
            <span className="stat-label">Notifications</span>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="dashboard-grid">
        {/* My Tasks Section */}
        <div className="dashboard-section tasks-section">
          <div className="section-header">
            <h2>📋 My Tasks</h2>
            <Link to="/tasks" className="view-all-link">View All</Link>
          </div>
          
          {tasks.length === 0 ? (
            <div className="empty-section">
              <p>No tasks assigned to you</p>
              <Link to="/projects" className="secondary-button">
                Browse Projects
              </Link>
            </div>
          ) : (
            <div className="task-list">
              {tasks.map(task => (
                <div key={task.id} className="task-item">
                  <div className="task-info">
                    <span className={`task-priority ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <span className="task-title">{task.title}</span>
                  </div>
                  <div className="task-meta">
                    <Link 
                      to={`/projects/${task.project.id}`} 
                      className="task-project"
                    >
                      {task.project.key}
                    </Link>
                    <span className={`task-status ${getStatusBadge(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                    {task.dueDate && (
                      <span className="task-due-date">
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed Section */}
        <div className="dashboard-section activity-section">
          <ActivityFeed limit={20} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h2>⚡ Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/projects" className="action-card">
            <span className="action-icon">📁</span>
            <span className="action-label">Browse Projects</span>
          </Link>
          <Link to="/teams" className="action-card">
            <span className="action-icon">👥</span>
            <span className="action-label">Manage Teams</span>
          </Link>
          <Link to="/settings" className="action-card">
            <span className="action-icon">⚙️</span>
            <span className="action-label">Account Settings</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
