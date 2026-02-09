// ============================================================================
// Project Detail Page
// ============================================================================

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { http } from '../services/api';
import MilestoneList from '../components/milestones/MilestoneList';
import WorkPackageList from '../components/work-packages/WorkPackageList';

// ============================================================================
// Types
// ============================================================================

interface ProjectMember {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

interface WorkPackage {
  id: string;
  name: string;
  status: string;
  priority: string;
  _count: {
    tasks: number;
  };
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  key: string;
  color: string;
  status: string;
  startDate?: string;
  endDate?: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  members: ProjectMember[];
  workPackages: WorkPackage[];
  milestones: Milestone[];
}

// ============================================================================
// Project Detail Page Component
// ============================================================================

export default function ProjectDetailPage() {
  const { id } = useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'work-packages' | 'milestones' | 'members'>('overview');
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    if (id) fetchProject();
  }, [id]);

  const fetchProject = async () => {
    try {
      const { project: data } = await http.get(`/projects/${id}`);
      setProject(data);
    } catch (error) {
      console.error('Failed to fetch project:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'ON_HOLD': return 'status-on-hold';
      case 'COMPLETED': return 'status-completed';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'priority-urgent';
      case 'HIGH': return 'priority-high';
      case 'MEDIUM': return 'priority-medium';
      case 'LOW': return 'priority-low';
      default: return '';
    }
  };

  if (loading) {
    return <div className="loading">Loading project...</div>;
  }

  if (!project) {
    return <div className="error">Project not found</div>;
  }

  return (
    <div className="project-detail-page">
      {/* Header */}
      <div className="project-header" style={{ borderLeftColor: project.color }}>
        <div className="project-header-info">
          <div className="project-breadcrumb">
            <Link to="/projects">Projects</Link>
            <span>/</span>
            <span>{project.name}</span>
          </div>
          <div className="project-title-row">
            <span className="project-key-badge">{project.key}</span>
            <h1>{project.name}</h1>
            <span className={`project-status ${getStatusColor(project.status)}`}>
              {project.status.replace('_', ' ')}
            </span>
          </div>
          {project.description && <p className="project-description">{project.description}</p>}
        </div>
        <div className="project-header-actions">
          <button className="secondary-button" onClick={() => setShowAddMember(true)}>
            Add Member
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="detail-tabs">
        <button className={`tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview
        </button>
        <button className={`tab ${activeTab === 'work-packages' ? 'active' : ''}`} onClick={() => setActiveTab('work-packages')}>
          Work Packages ({project.workPackages.length})
        </button>
        <button className={`tab ${activeTab === 'milestones' ? 'active' : ''}`} onClick={() => setActiveTab('milestones')}>
          Milestones ({project.milestones.length})
        </button>
        <button className={`tab ${activeTab === 'members' ? 'active' : ''}`} onClick={() => setActiveTab('members')}>
          Members ({project.members.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="overview-tab">
          <div className="overview-grid">
            {/* Stats Cards */}
            <div className="stat-card">
              <h3>Work Packages</h3>
              <span className="stat-number">{project.workPackages.length}</span>
            </div>
            <div className="stat-card">
              <h3>Active Milestones</h3>
              <span className="stat-number">{project.milestones.filter(m => !m.completed).length}</span>
            </div>
            <div className="stat-card">
              <h3>Team Members</h3>
              <span className="stat-number">{project.members.length}</span>
            </div>

            {/* Recent Work Packages */}
            <div className="overview-section">
              <div className="section-header">
                <h2>Work Packages</h2>
                <button className="text-link" onClick={() => setActiveTab('work-packages')}>View All</button>
              </div>
              {project.workPackages.length === 0 ? (
                <p className="empty-message">No work packages yet</p>
              ) : (
                <ul className="work-package-list">
                  {project.workPackages.slice(0, 5).map(wp => (
                    <li key={wp.id}>
                      <span className="wp-name">{wp.name}</span>
                      <span className={`wp-status ${wp.status.toLowerCase().replace('_', '-')}`}>{wp.status}</span>
                      <span className="wp-tasks">{wp._count.tasks} tasks</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upcoming Milestones */}
            <div className="overview-section">
              <div className="section-header">
                <h2>Upcoming Milestones</h2>
                <button className="text-link" onClick={() => setActiveTab('milestones')}>View All</button>
              </div>
              {project.milestones.filter(m => !m.completed).length === 0 ? (
                <p className="empty-message">No upcoming milestones</p>
              ) : (
                <ul className="milestone-list">
                  {project.milestones.filter(m => !m.completed).slice(0, 3).map(m => (
                    <li key={m.id}>
                      <span className="milestone-name">{m.name}</span>
                      <span className="milestone-date">{new Date(m.dueDate).toLocaleDateString()}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'work-packages' && (
        <div className="work-packages-tab">
          <WorkPackageList projectId={project.id} />
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="milestones-tab">
          <MilestoneList projectId={project.id} />
        </div>
      )}

      {activeTab === 'members' && (
        <div className="members-tab">
          <div className="tab-header">
            <h2>Team Members</h2>
            <button className="primary-button" onClick={() => setShowAddMember(true)}>Add Member</button>
          </div>
          <div className="members-grid">
            {project.members.map(member => (
              <div key={member.id} className="member-card">
                <div className="member-avatar large">
                  {member.user.avatarUrl ? (
                    <img src={member.user.avatarUrl} alt={member.user.firstName} />
                  ) : (
                    <span>{member.user.firstName[0]}{member.user.lastName[0]}</span>
                  )}
                </div>
                <div className="member-info">
                  <h3>{member.user.firstName} {member.user.lastName}</h3>
                  <p>{member.user.email}</p>
                  <span className={`member-role role-${member.role.toLowerCase()}`}>{member.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <AddMemberModal
          projectId={project.id}
          existingMembers={project.members.map(m => m.user.id)}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            setShowAddMember(false);
            fetchProject();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Add Member Modal
// ============================================================================

interface AddMemberModalProps {
  projectId: string;
  existingMembers: string[];
  onClose: () => void;
  onSuccess: () => void;
}

function AddMemberModal({ projectId, existingMembers, onClose, onSuccess }: AddMemberModalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('MEMBER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const handleSearch = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const { users } = await http.get(`/users/search?q=${query}`);
      setSearchResults(users.filter((u: any) => !existingMembers.includes(u.id)));
    } catch (err) {
      console.error('Search failed:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await http.post(`/projects/${projectId}/members`, { userId: email, role });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Team Member</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="email">User Email or ID</label>
              <input
                type="text"
                id="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  handleSearch(e.target.value);
                }}
                placeholder="Search by email..."
                required
              />
              {searchResults.length > 0 && (
                <ul className="search-results">
                  {searchResults.map(user => (
                    <li key={user.id} onClick={() => { setEmail(user.id); setSearchResults([]); }}>
                      <span>{user.firstName} {user.lastName}</span>
                      <span className="email">{user.email}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="role">Role</label>
              <select id="role" value={role} onChange={(e) => setRole(e.target.value)}>
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Adding...' : 'Add Member'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
