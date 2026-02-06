// ============================================================================
// Projects Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { http } from '../services/api';

// ============================================================================
// Types
// ============================================================================

interface ProjectMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  role: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  slug: string;
  key: string;
  color: string;
  status: string;
  team: {
    id: string;
    name: string;
    slug: string;
  };
  members: ProjectMember[];
  _count: {
    workPackages: number;
    milestones: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface Team {
  id: string;
  name: string;
  slug: string;
}

// ============================================================================
// Projects Page Component
// ============================================================================

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterTeam, setFilterTeam] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  useEffect(() => {
    fetchProjects();
    fetchTeams();
  }, []);

  const fetchProjects = async () => {
    try {
      const { projects: data } = await http.get('/projects');
      setProjects(data);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeams = async () => {
    try {
      const { teams: data } = await http.get('/teams');
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    }
  };

  const filteredProjects = projects.filter(project => {
    if (filterTeam && project.team.id !== filterTeam) return false;
    if (filterStatus && project.status !== filterStatus) return false;
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'status-active';
      case 'ON_HOLD': return 'status-on-hold';
      case 'COMPLETED': return 'status-completed';
      case 'ARCHIVED': return 'status-archived';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="projects-page">
        <div className="loading">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="projects-page">
      <div className="page-header">
        <div>
          <h1>Projects</h1>
          <p className="page-subtitle">Manage your projects and work packages</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreateModal(true)}>
          Create Project
        </button>
      </div>

      {/* Filters */}
      <div className="filters">
        <div className="filter-group">
          <label>Team</label>
          <select value={filterTeam} onChange={(e) => setFilterTeam(e.target.value)}>
            <option value="">All Teams</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>{team.name}</option>
            ))}
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="ACTIVE">Active</option>
            <option value="ON_HOLD">On Hold</option>
            <option value="COMPLETED">Completed</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        {(filterTeam || filterStatus) && (
          <button className="clear-filter" onClick={() => { setFilterTeam(''); setFilterStatus(''); }}>
            Clear Filters
          </button>
        )}
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h2>No projects found</h2>
          <p>Create your first project to start tracking work.</p>
          <button className="primary-button" onClick={() => setShowCreateModal(true)}>
            Create Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {filteredProjects.map((project) => (
            <Link to={`/projects/${project.id}`} key={project.id} className="project-card-link">
              <div className="project-card" style={{ borderLeftColor: project.color }}>
                <div className="project-card-header">
                  <span className="project-key">{project.key}</span>
                  <span className={`project-status ${getStatusColor(project.status)}`}>
                    {project.status.replace('_', ' ')}
                  </span>
                </div>
                <h3>{project.name}</h3>
                {project.description && <p>{project.description}</p>}
                <div className="project-meta">
                  <span className="project-team">{project.team.name}</span>
                  <span className="project-stats">
                    {project._count.workPackages} work packages
                  </span>
                </div>
                <div className="project-members">
                  {project.members.slice(0, 4).map((member) => (
                    <div key={member.user.id} className="member-avatar" title={`${member.user.firstName} ${member.user.lastName}`}>
                      {member.user.avatarUrl ? (
                        <img src={member.user.avatarUrl} alt={member.user.firstName} />
                      ) : (
                        <span>{member.user.firstName[0]}{member.user.lastName[0]}</span>
                      )}
                    </div>
                  ))}
                  {project.members.length > 4 && (
                    <div className="member-avatar more">+{project.members.length - 4}</div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Create Project Modal */}
      {showCreateModal && (
        <ProjectModal
          teams={teams}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchProjects();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Project Modal Component
// ============================================================================

interface ProjectModalProps {
  teams: Team[];
  onClose: () => void;
  onSuccess: () => void;
}

function ProjectModal({ teams, onClose, onSuccess }: ProjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    key: '',
    color: '#6366f1',
    teamId: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await http.post('/projects', formData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create Project</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="teamId">Team *</label>
              <select
                id="teamId"
                value={formData.teamId}
                onChange={(e) => setFormData({ ...formData, teamId: e.target.value })}
                required
              >
                <option value="">Select a team</option>
                {teams.map(team => (
                  <option key={team.id} value={team.id}>{team.name}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="name">Project Name *</label>
                <input
                  type="text"
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Project"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="key">Project Key *</label>
                <input
                  type="text"
                  id="key"
                  value={formData.key}
                  onChange={(e) => setFormData({ ...formData, key: e.target.value.toUpperCase().slice(0, 5) })}
                  placeholder="PRJ"
                  minLength={2}
                  maxLength={5}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of your project..."
                rows={3}
              />
            </div>

            <div className="form-group">
              <label htmlFor="color">Color</label>
              <div className="color-picker">
                <input
                  type="color"
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
                <span className="color-value">{formData.color}</span>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
