// ============================================================================
// Task Kanban Board Component
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigneeId?: string;
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
  workPackage?: { id: string; name: string };
  dueDate?: string;
  _count: { comments: number };
}

interface TaskBoardProps {
  projectId: string;
  onTaskClick?: (task: Task) => void;
}

// ============================================================================
// Task Board Component
// ============================================================================

export default function TaskBoard({ projectId, onTaskClick }: TaskBoardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>('TODO');

  const columns = [
    { id: 'TODO', title: 'To Do', color: '#64748b' },
    { id: 'IN_PROGRESS', title: 'In Progress', color: '#3b82f6' },
    { id: 'IN_REVIEW', title: 'In Review', color: '#f59e0b' },
    { id: 'DONE', title: 'Done', color: '#22c55e' },
  ];

  useEffect(() => {
    fetchTasks();
  }, [projectId]);

  const fetchTasks = async () => {
    try {
      const { tasks: data } = await http.get(`/tasks/project/${projectId}`);
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTasksByStatus = (status: string) => {
    return tasks.filter(task => task.status === status);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return '🔴';
      case 'HIGH': return '🟠';
      case 'MEDIUM': return '🟡';
      case 'LOW': return '🟢';
      default: return '⚪';
    }
  };

  const handleDragStart = (e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('taskId', task.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('taskId');
    
    try {
      await http.put(`/tasks/${taskId}`, { status: newStatus });
      fetchTasks();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  if (loading) {
    return <div className="loading">Loading tasks...</div>;
  }

  return (
    <div className="task-board">
      <div className="board-header">
        <h2>Task Board</h2>
        <button className="primary-button" onClick={() => { setSelectedStatus('TODO'); setShowCreateModal(true); }}>
          + Add Task
        </button>
      </div>

      <div className="board-columns">
        {columns.map(column => (
          <div
            key={column.id}
            className="board-column"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, column.id)}
          >
            <div className="column-header" style={{ borderTopColor: column.color }}>
              <h3>{column.title}</h3>
              <span className="column-count">{getTasksByStatus(column.id).length}</span>
            </div>

            <div className="column-tasks">
              {getTasksByStatus(column.id).map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onClick={() => onTaskClick && onTaskClick(task)}
                />
              ))}

              {getTasksByStatus(column.id).length === 0 && (
                <div className="empty-column">
                  <p>No tasks</p>
                </div>
              )}
            </div>

            <button 
              className="add-task-button"
              onClick={() => { setSelectedStatus(column.id); setShowCreateModal(true); }}
            >
              + Add Task
            </button>
          </div>
        ))}
      </div>

      {showCreateModal && (
        <TaskModal
          projectId={projectId}
          defaultStatus={selectedStatus}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Task Card Component
// ============================================================================

interface TaskCardProps {
  task: Task;
  onDragStart: (e: React.DragEvent) => void;
  onClick?: () => void;
}

function TaskCard({ task, onDragStart, onClick }: TaskCardProps) {
  return (
    <div
      className="task-card"
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
    >
      <div className="task-card-header">
        <span className="task-priority">{getPriorityColor(task.priority)}</span>
        {task.workPackage && (
          <span className="task-work-package">{task.workPackage.name}</span>
        )}
      </div>
      
      <h4 className="task-title">{task.title}</h4>
      
      {task.description && (
        <p className="task-description">
          {task.description.length > 80 
            ? task.description.substring(0, 80) + '...' 
            : task.description}
        </p>
      )}
      
      <div className="task-card-footer">
        {task.assignee ? (
          <div className="task-assignee">
            {task.assignee.avatarUrl ? (
              <img src={task.assignee.avatarUrl} alt={task.assignee.firstName} />
            ) : (
              <span className="assignee-avatar">
                {task.assignee.firstName[0]}{task.assignee.lastName[0]}
              </span>
            )}
          </div>
        ) : (
          <span className="unassigned">Unassigned</span>
        )}
        
        {task.dueDate && (
          <span className="task-due-date">
            {new Date(task.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
          </span>
        )}
        
        {task._count.comments > 0 && (
          <span className="task-comments">
            💬 {task._count.comments}
          </span>
        )}
      </div>
    </div>
  );
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'URGENT': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

// ============================================================================
// Task Modal Component
// ============================================================================

interface TaskModalProps {
  projectId: string;
  defaultStatus?: string;
  defaultWorkPackageId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function TaskModal({ projectId, defaultStatus, defaultWorkPackageId, onClose, onSuccess }: TaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: defaultStatus || 'TODO',
    assigneeId: '',
    dueDate: '',
    estimatedHours: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await http.post('/tasks', {
        ...formData,
        projectId,
        workPackageId: defaultWorkPackageId || undefined,
        assigneeId: formData.assigneeId || undefined,
        estimatedHours: formData.estimatedHours ? parseFloat(formData.estimatedHours) : undefined,
        dueDate: formData.dueDate || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Task</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="title">Title *</label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter task title"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this task..."
                rows={3}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="priority">Priority</label>
                <select
                  id="priority"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="status">Status</label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="IN_REVIEW">In Review</option>
                  <option value="DONE">Done</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="assigneeId">Assignee</label>
              <input
                type="text"
                id="assigneeId"
                value={formData.assigneeId}
                onChange={(e) => setFormData({ ...formData, assigneeId: e.target.value })}
                placeholder="Enter user ID or leave empty"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="estimatedHours">Estimated Hours</label>
                <input
                  type="number"
                  id="estimatedHours"
                  value={formData.estimatedHours}
                  onChange={(e) => setFormData({ ...formData, estimatedHours: e.target.value })}
                  placeholder="0"
                  min="0"
                  step="0.5"
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
