// ============================================================================
// Work Package List Component
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Helper Functions (defined outside component for use by child components)
// ============================================================================

function getStatusColor(status: string): string {
  switch (status) {
    case 'TODO': return 'status-todo';
    case 'IN_PROGRESS': return 'status-in-progress';
    case 'REVIEW': return 'status-review';
    case 'DONE': return 'status-done';
    case 'ARCHIVED': return 'status-archived';
    default: return '';
  }
}

function getPriorityIcon(priority: string): string {
  switch (priority) {
    case 'URGENT': return '🔴';
    case 'HIGH': return '🟠';
    case 'MEDIUM': return '🟡';
    case 'LOW': return '🟢';
    default: return '⚪';
  }
}

// ============================================================================
// Types
// ============================================================================

interface WorkPackage {
  id: string;
  name: string;
  description?: string;
  status: string;
  priority: string;
  sortOrder: number;
  projectId: string;
  startDate?: string;
  dueDate?: string;
  parent?: { id: string; name: string };
  _count: { tasks: number; children: number };
  tasks: { status: string }[];
  progress: number;
}

interface WorkPackageListProps {
  projectId: string;
  onSelect?: (wp: WorkPackage) => void;
}

// ============================================================================
// Work Package List Component
// ============================================================================

export default function WorkPackageList({ projectId, onSelect }: WorkPackageListProps) {
  const [workPackages, setWorkPackages] = useState<WorkPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWP, setSelectedWP] = useState<WorkPackage | null>(null);
  const [detailWP, setDetailWP] = useState<WorkPackage | null>(null);
  const [filter, setFilter] = useState<string>('');

  useEffect(() => {
    fetchWorkPackages();
  }, [projectId]);

  const fetchWorkPackages = async () => {
    try {
      const { workPackages: data } = await http.get(`/work-packages/project/${projectId}`);
      setWorkPackages(data);
    } catch (error) {
      console.error('Failed to fetch work packages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectWP = (wp: WorkPackage) => {
    onSelect?.(wp);
    setDetailWP(wp);
    setShowDetailModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'status-todo';
      case 'IN_PROGRESS': return 'status-in-progress';
      case 'REVIEW': return 'status-review';
      case 'DONE': return 'status-done';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
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

  const filteredPackages = workPackages.filter(wp =>
    wp.name.toLowerCase().includes(filter.toLowerCase())
  );

  if (loading) {
    return <div className="loading">Loading work packages...</div>;
  }

  return (
    <div className="work-package-list">
      <div className="wp-list-header">
        <input
          type="text"
          placeholder="Search work packages..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="wp-search"
        />
        <button className="primary-button" onClick={() => setShowCreateModal(true)}>
          + Work Package
        </button>
      </div>

      {filteredPackages.length === 0 ? (
        <div className="empty-wp-state">
          <p>No work packages found</p>
          <button className="secondary-button" onClick={() => setShowCreateModal(true)}>
            Create First Work Package
          </button>
        </div>
      ) : (
        <div className="wp-tree">
          {filteredPackages.map(wp => (
            <WorkPackageItem
              key={wp.id}
              workPackage={wp}
              onSelect={handleSelectWP}
              onUpdate={fetchWorkPackages}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <WorkPackageModal
          projectId={projectId}
          workPackage={detailWP || undefined}
          parentId={selectedWP?.id}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedWP(null);
            setDetailWP(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedWP(null);
            setDetailWP(null);
            fetchWorkPackages();
          }}
        />
      )}

      {showDetailModal && detailWP && (
        <WorkPackageDetailModal
          workPackage={detailWP}
          onClose={() => {
            setShowDetailModal(false);
            setDetailWP(null);
          }}
          onEdit={(wp) => {
            setShowDetailModal(false);
            setSelectedWP(wp);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Work Package Item Component
// ============================================================================

interface WorkPackageItemProps {
  workPackage: WorkPackage;
  onSelect?: (wp: WorkPackage) => void;
  onUpdate: () => void;
}

function WorkPackageItem({ workPackage, onSelect }: WorkPackageItemProps) {
  const [expanded, setExpanded] = useState(true);
  const [childrenState, setChildrenState] = useState(false);

  const hasChildren = workPackage._count.children > 0;
  const completedTasks = workPackage.tasks.filter(t => t.status === 'DONE').length;
  const totalTasks = workPackage.tasks.length;
  const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const handleSelect = () => {
    if (onSelect) {
      onSelect(workPackage);
    }
  };

  return (
    <div className="wp-item">
      <div className="wp-item-main" onClick={handleSelect}>
        {hasChildren && (
          <button className="wp-expand" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
            {expanded ? '▼' : '▶'}
          </button>
        )}
        {!hasChildren && <span className="wp-spacer" />}
        
        <div className="wp-info">
          <div className="wp-title-row">
            <span className="wp-priority">{getPriorityIcon(workPackage.priority)}</span>
            <span className="wp-name">{workPackage.name}</span>
            {workPackage.parent && (
              <span className="wp-parent-badge">{workPackage.parent.name}</span>
            )}
          </div>
          <div className="wp-meta-row">
            <span className={`wp-status ${getStatusColor(workPackage.status)}`}>
              {workPackage.status.replace('_', ' ')}
            </span>
            {totalTasks > 0 && (
              <div className="wp-progress">
                <div className="progress-bar">
                  <div className="progress-fill" style={{ width: `${progress}%` }} />
                </div>
                <span className="progress-text">{completedTasks}/{totalTasks} tasks</span>
              </div>
            )}
            {workPackage.dueDate && (
              <span className="wp-due-date">
                Due: {new Date(workPackage.dueDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Work Package Modal Component
// ============================================================================

interface WorkPackageModalProps {
  projectId: string;
  workPackage?: WorkPackage;
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function WorkPackageModal({ projectId, workPackage, parentId, onClose, onSuccess }: WorkPackageModalProps) {
  const isEditing = !!workPackage;
  const [formData, setFormData] = useState({
    name: workPackage?.name || '',
    description: workPackage?.description || '',
    priority: workPackage?.priority || 'MEDIUM',
    status: workPackage?.status || 'TODO',
    startDate: workPackage?.startDate ? workPackage.startDate.split('T')[0] : '',
    dueDate: workPackage?.dueDate ? workPackage.dueDate.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await http.put(`/work-packages/${workPackage.id}`, {
          name: formData.name,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
        });
      } else {
        await http.post('/work-packages', {
          name: formData.name,
          description: formData.description,
          priority: formData.priority,
          status: formData.status,
          projectId,
          parentId,
          startDate: formData.startDate || undefined,
          dueDate: formData.dueDate || undefined,
        });
      }
      onSuccess();
    } catch (err: any) {
      setError(isEditing ? 'Failed to update work package' : 'Failed to create work package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Work Package' : (parentId ? 'Add Sub-Work Package' : 'Create Work Package')}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">Name *</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter work package name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this work package..."
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
                  <option value="REVIEW">Review</option>
                  <option value="DONE">Done</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="startDate">Start Date</label>
                <input
                  type="date"
                  id="startDate"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label htmlFor="dueDate">Due Date</label>
                <input
                  type="date"
                  id="dueDate"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? (isEditing ? 'Saving...' : 'Creating...') : (isEditing ? 'Save Changes' : 'Create Work Package')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Work Package Detail Modal
// ============================================================================

interface WorkPackageDetailModalProps {
  workPackage: WorkPackage;
  onClose: () => void;
  onEdit: (wp: WorkPackage) => void;
  onViewTasks?: (wp: WorkPackage) => void;
}

function WorkPackageDetailModal({ workPackage, onClose, onEdit, onViewTasks }: WorkPackageDetailModalProps) {
  const [showTasks, setShowTasks] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingTask, setAddingTask] = useState(false);

  const loadTasks = async () => {
    if (tasks.length > 0) {
      setShowTasks(!showTasks);
      return;
    }
    
    setLoadingTasks(true);
    setShowTasks(true);
    try {
      const { tasks: data } = await http.get(`/tasks/work-package/${workPackage.id}`);
      setTasks(data || []);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoadingTasks(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    
    setAddingTask(true);
    try {
      await http.post('/tasks', {
        title: newTaskTitle,
        workPackageId: workPackage.id,
        projectId: workPackage.projectId,
        status: 'TODO',
      });
      setNewTaskTitle('');
      loadTasks();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      alert(err.response?.data?.error || 'Failed to create task');
    } finally {
      setAddingTask(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{workPackage.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {workPackage.description && (
            <div className="detail-section">
              <h4>Description</h4>
              <p>{workPackage.description}</p>
            </div>
          )}
          
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`wp-status ${workPackage.status.toLowerCase().replace('_', '-')}`}>
                {workPackage.status.replace('_', ' ')}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Priority</span>
              <span className="detail-value">{workPackage.priority}</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Progress</span>
              <span className="detail-value">{workPackage.progress}%</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Tasks</span>
              <span className="detail-value">{workPackage._count.tasks} total</span>
            </div>
            
            {workPackage.startDate && (
              <div className="detail-item">
                <span className="detail-label">Start Date</span>
                <span className="detail-value">
                  {new Date(workPackage.startDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {workPackage.dueDate && (
              <div className="detail-item">
                <span className="detail-label">Due Date</span>
                <span className="detail-value">
                  {new Date(workPackage.dueDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {workPackage.parent && (
              <div className="detail-item">
                <span className="detail-label">Parent</span>
                <span className="detail-value">{workPackage.parent.name}</span>
              </div>
            )}
          </div>

          {/* Tasks Section */}
          <div className="detail-section">
            <div className="section-header">
              <h4>Tasks</h4>
              <button 
                className="text-link" 
                onClick={loadTasks}
                disabled={loadingTasks}
              >
                {loadingTasks ? 'Loading...' : (showTasks ? 'Hide Tasks' : 'Show Tasks')}
              </button>
            </div>
            
            {showTasks && (
              <>
                <ul className="task-list">
                  {tasks.length === 0 ? (
                    <li className="empty-task">No tasks yet</li>
                  ) : (
                    tasks.map((task: any) => (
                      <li key={task.id} className="task-item">
                        <span className={`task-status ${task.status.toLowerCase().replace('_', '-')}`}>
                          {task.status.replace('_', ' ')}
                        </span>
                        <span className="task-title">{task.title}</span>
                        {task.assignee && (
                          <span className="task-assignee">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        )}
                      </li>
                    ))
                  )}
                </ul>
                
                <form onSubmit={handleAddTask} className="add-task-form">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="Add a new task..."
                    className="task-input"
                  />
                  <button type="submit" className="primary-button" disabled={addingTask || !newTaskTitle.trim()}>
                    {addingTask ? '...' : 'Add'}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
        
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary-button" onClick={() => onEdit(workPackage)}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
