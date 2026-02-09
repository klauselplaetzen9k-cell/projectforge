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
          parentId={selectedWP?.id}
          onClose={() => { setShowCreateModal(false); setSelectedWP(null); }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedWP(null);
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
  parentId?: string;
  onClose: () => void;
  onSuccess: () => void;
}

function WorkPackageModal({ projectId, parentId, onClose, onSuccess }: WorkPackageModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    startDate: '',
    dueDate: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
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
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create work package');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{parentId ? 'Add Sub-Work Package' : 'Create Work Package'}</h2>
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
              {loading ? 'Creating...' : 'Create Work Package'}
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
}

function WorkPackageDetailModal({ workPackage, onClose, onEdit }: WorkPackageDetailModalProps) {
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
