// ============================================================================
// Task Detail Modal
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';
import TaskComments from './TaskComments';
import TaskDependencies from './TaskDependencies';

// ============================================================================
// Types
// ============================================================================

interface TaskDetail {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
  };
  workPackage?: { id: string; name: string };
  milestone?: { id: string; name: string; dueDate: string };
  dueDate?: string;
  estimatedHours?: number;
  loggedHours: number;
  comments: any[];
  attachments: any[];
  dependencies: any[];
  dependents: any[];
}

interface TaskDetailModalProps {
  taskId: string;
  onClose: () => void;
  onUpdate?: () => void;
}

// ============================================================================
// Task Detail Modal Component
// ============================================================================

export default function TaskDetailModal({ taskId, onClose, onUpdate }: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'details' | 'comments' | 'attachments' | 'dependencies'>('details');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    fetchTask();
  }, [taskId]);

  const fetchTask = async () => {
    try {
      const { task: data } = await http.get(`/tasks/${taskId}`);
      setTask(data);
    } catch (error) {
      console.error('Failed to fetch task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await http.put(`/tasks/${taskId}`, { status: newStatus });
      fetchTask();
      onUpdate?.();
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'status-done';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'IN_REVIEW': return 'status-review';
      case 'CANCELLED': return 'status-cancelled';
      default: return 'status-todo';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  if (loading) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal task-detail-modal loading" onClick={(e) => e.stopPropagation()}>
          <div className="loading">Loading task...</div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal task-detail-modal" onClick={(e) => e.stopPropagation()}>
          <div className="error">Task not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal task-detail-modal large" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="task-detail-header">
          <div className="task-detail-title">
            <span className={`task-status-badge ${getStatusColor(task.status)}`}>
              {task.status.replace('_', ' ')}
            </span>
            <h2>{task.title}</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        {/* Tabs */}
        <div className="task-detail-tabs">
          <button 
            className={`tab ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Details
          </button>
          <button 
            className={`tab ${activeTab === 'comments' ? 'active' : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            Comments ({task.comments?.length || 0})
          </button>
          <button 
            className={`tab ${activeTab === 'attachments' ? 'active' : ''}`}
            onClick={() => setActiveTab('attachments')}
          >
            Files ({task.attachments?.length || 0})
          </button>
          <button 
            className={`tab ${activeTab === 'dependencies' ? 'active' : ''}`}
            onClick={() => setActiveTab('dependencies')}
          >
            Dependencies
          </button>
        </div>

        {/* Content */}
        <div className="task-detail-content">
          {activeTab === 'details' && (
            <div className="details-tab">
              <div className="detail-section">
                <h4>Description</h4>
                <p className="description">
                  {task.description || 'No description provided.'}
                </p>
              </div>

              <div className="detail-grid">
                <div className="detail-item">
                  <label>Assignee</label>
                  <div className="assignee-info">
                    {task.assignee ? (
                      <>
                        <div className="assignee-avatar">
                          {task.assignee.avatarUrl ? (
                            <img src={task.assignee.avatarUrl} alt={task.assignee.firstName} />
                          ) : (
                            <span>{task.assignee.firstName[0]}{task.assignee.lastName[0]}</span>
                          )}
                        </div>
                        <span>{task.assignee.firstName} {task.assignee.lastName}</span>
                      </>
                    ) : (
                      <span className="unassigned">Unassigned</span>
                    )}
                  </div>
                </div>

                <div className="detail-item">
                  <label>Priority</label>
                  <span className="priority">{getPriorityIcon(task.priority)} {task.priority}</span>
                </div>

                <div className="detail-item">
                  <label>Due Date</label>
                  <span>{task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'Not set'}</span>
                </div>

                <div className="detail-item">
                  <label>Work Package</label>
                  <span>{task.workPackage?.name || 'None'}</span>
                </div>

                <div className="detail-item">
                  <label>Milestone</label>
                  <span>{task.milestone?.name || 'None'}</span>
                </div>

                <div className="detail-item">
                  <label>Time Logged</label>
                  <span>{task.loggedHours}h / {task.estimatedHours || '?'}h</span>
                </div>
              </div>

              <div className="detail-section">
                <label>Change Status</label>
                <div className="status-buttons">
                  {['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map(status => (
                    <button
                      key={status}
                      className={`status-button ${task.status === status ? 'active' : ''} ${getStatusColor(status)}`}
                      onClick={() => handleStatusChange(status)}
                    >
                      {status.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'comments' && (
            <TaskComments taskId={taskId} />
          )}

          {activeTab === 'attachments' && (
            <div className="attachments-tab">
              <div className="attachments-header">
                <h3>📎 Attachments</h3>
                <button className="upload-button">+ Upload File</button>
              </div>
              {task.attachments?.length === 0 ? (
                <div className="no-attachments">
                  <p>No files attached yet.</p>
                </div>
              ) : (
                <ul className="attachments-list">
                  {task.attachments.map((file: any) => (
                    <li key={file.id} className="attachment-item">
                      <span className="attachment-icon">📄</span>
                      <span className="attachment-name">{file.name}</span>
                      <span className="attachment-size">
                        {Math.round(file.size / 1024)}KB
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {activeTab === 'dependencies' && (
            <TaskDependencies taskId={taskId} onClose={() => {}} />
          )}
        </div>
      </div>
    </div>
  );
}
