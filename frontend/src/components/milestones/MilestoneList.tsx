// ============================================================================
// Milestone List Component
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Milestone {
  id: string;
  name: string;
  description?: string;
  dueDate: string;
  completed: boolean;
  completedAt?: string;
  workPackage?: { id: string; name: string };
  _count: { tasks: number };
  progress: number;
  completedTasks: number;
}

interface MilestoneListProps {
  projectId: string;
  onSelect?: (milestone: Milestone) => void;
}

// ============================================================================
// Milestone List Component
// ============================================================================

export default function MilestoneList({ projectId, onSelect }: MilestoneListProps) {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');

  useEffect(() => {
    fetchMilestones();
  }, [projectId]);

  const fetchMilestones = async () => {
    try {
      const { milestones: data } = await http.get(`/milestones/project/${projectId}`);
      setMilestones(data);
    } catch (error) {
      console.error('Failed to fetch milestones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMilestone = (milestone: Milestone) => {
    setSelectedMilestone(milestone);
    setShowDetailModal(true);
  };

  const filteredMilestones = milestones.filter(m => {
    if (filter === 'active') return !m.completed;
    if (filter === 'completed') return m.completed;
    return true;
  });

  const handleToggleComplete = async (milestone: Milestone) => {
    try {
      await http.put(`/milestones/${milestone.id}`, { completed: !milestone.completed });
      fetchMilestones();
    } catch (error) {
      console.error('Failed to toggle milestone:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const isOverdue = (dueDate: string) => {
    return new Date(dueDate) < new Date() && !milestones.find(m => m.dueDate === dueDate)?.completed;
  };

  if (loading) {
    return <div className="loading">Loading milestones...</div>;
  }

  return (
    <div className="milestone-list">
      <div className="milestone-header">
        <div className="milestone-filters">
          <button
            className={`filter-button ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({milestones.length})
          </button>
          <button
            className={`filter-button ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({milestones.filter(m => !m.completed).length})
          </button>
          <button
            className={`filter-button ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({milestones.filter(m => m.completed).length})
          </button>
        </div>
        <button className="primary-button" onClick={() => setShowCreateModal(true)}>
          + Milestone
        </button>
      </div>

      {filteredMilestones.length === 0 ? (
        <div className="empty-milestones">
          <p>No milestones found</p>
          <button className="secondary-button" onClick={() => setShowCreateModal(true)}>
            Create First Milestone
          </button>
        </div>
      ) : (
        <div className="milestones-grid">
          {filteredMilestones.map(milestone => (
            <MilestoneCard
              key={milestone.id}
              milestone={milestone}
              onToggle={() => handleToggleComplete(milestone)}
              onClick={() => onSelect && onSelect(milestone)}
            />
          ))}
        </div>
      )}

      {showCreateModal && (
        <MilestoneModal
          projectId={projectId}
          milestone={selectedMilestone || undefined}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedMilestone(null);
          }}
          onSuccess={() => {
            setShowCreateModal(false);
            setSelectedMilestone(null);
            fetchMilestones();
          }}
        />
      )}

      {showDetailModal && selectedMilestone && (
        <MilestoneDetailModal
          milestone={selectedMilestone}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedMilestone(null);
          }}
          onEdit={(m) => {
            setShowDetailModal(false);
            setSelectedMilestone(m);
            setShowCreateModal(true);
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Milestone Card Component
// ============================================================================

interface MilestoneCardProps {
  milestone: Milestone;
  onToggle: () => void;
  onClick?: () => void;
}

function MilestoneCard({ milestone, onToggle, onClick }: MilestoneCardProps) {
  const isOverdue = new Date(milestone.dueDate) < new Date() && !milestone.completed;
  const daysUntilDue = Math.ceil((new Date(milestone.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <div 
      className={`milestone-card ${milestone.completed ? 'completed' : ''} ${isOverdue ? 'overdue' : ''}`}
      onClick={onClick}
    >
      <div className="milestone-header">
        <button 
          className={`milestone-checkbox ${milestone.completed ? 'checked' : ''}`}
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
        >
          {milestone.completed && '✓'}
        </button>
        <div className="milestone-info">
          <h3>{milestone.name}</h3>
          {milestone.workPackage && (
            <span className="milestone-work-package">{milestone.workPackage.name}</span>
          )}
        </div>
        {isOverdue && !milestone.completed && (
          <span className="overdue-badge">Overdue</span>
        )}
      </div>

      {milestone.description && (
        <p className="milestone-description">{milestone.description}</p>
      )}

      <div className="milestone-due-date">
        <span className="due-label">Due:</span>
        <span className={`due-date ${isOverdue ? 'overdue' : ''}`}>
          {new Date(milestone.dueDate).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </span>
        {!milestone.completed && (
          <span className="days-remaining">
            {daysUntilDue > 0 ? `${daysUntilDue} days left` : 'Past due'}
          </span>
        )}
      </div>

      <div className="milestone-progress">
        <div className="progress-header">
          <span>Progress</span>
          <span>{milestone.completedTasks}/{milestone._count.tasks} tasks</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${milestone.progress}%` }}
          />
        </div>
        <span className="progress-percent">{milestone.progress}%</span>
      </div>
    </div>
  );
}

// ============================================================================
// Milestone Modal Component
// ============================================================================

interface MilestoneModalProps {
  projectId: string;
  milestone?: Milestone;
  onClose: () => void;
  onSuccess: () => void;
}

function MilestoneModal({ projectId, milestone, onClose, onSuccess }: MilestoneModalProps) {
  const isEditing = !!milestone;
  const [formData, setFormData] = useState({
    name: milestone?.name || '',
    description: milestone?.description || '',
    dueDate: milestone?.dueDate ? milestone.dueDate.split('T')[0] : '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing && milestone) {
        await http.put(`/milestones/${milestone.id}`, {
          name: formData.name,
          description: formData.description,
          dueDate: formData.dueDate,
        });
      } else {
        await http.post('/milestones', {
          name: formData.name,
          description: formData.description,
          dueDate: formData.dueDate,
          projectId,
        });
      }
      onSuccess();
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to save milestone';
      console.error('Milestone save error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Milestone' : 'Create Milestone'}</h2>
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
                placeholder="Enter milestone name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe this milestone..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="dueDate">Due Date *</label>
              <input
                type="date"
                id="dueDate"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Milestone'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ============================================================================
// Milestone Detail Modal
// ============================================================================

interface MilestoneDetailModalProps {
  milestone: Milestone;
  onClose: () => void;
  onEdit: (milestone: Milestone) => void;
  onDelete?: (id: string) => void;
}

function MilestoneDetailModal({ milestone, onClose, onEdit, onDelete }: MilestoneDetailModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{milestone.name}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          {milestone.description && (
            <div className="detail-section">
              <h4>Description</h4>
              <p>{milestone.description}</p>
            </div>
          )}
          
          <div className="detail-grid">
            <div className="detail-item">
              <span className="detail-label">Due Date</span>
              <span className="detail-value">
                {new Date(milestone.dueDate).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Status</span>
              <span className={`status-badge ${milestone.completed ? 'completed' : 'active'}`}>
                {milestone.completed ? 'Completed' : 'Active'}
              </span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Progress</span>
              <span className="detail-value">{milestone.progress}%</span>
            </div>
            
            <div className="detail-item">
              <span className="detail-label">Tasks</span>
              <span className="detail-value">{milestone.completedTasks}/{milestone._count.tasks}</span>
            </div>
          </div>
          
          {milestone.workPackage && (
            <div className="detail-section">
              <h4>Work Package</h4>
              <p>{milestone.workPackage.name}</p>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="primary-button" onClick={() => onEdit(milestone)}>
            Edit
          </button>
        </div>
      </div>
    </div>
  );
}
