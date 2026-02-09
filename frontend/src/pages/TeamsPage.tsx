// ============================================================================
// Teams Page
// ============================================================================

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import { http } from '../services/api';

// ============================================================================
// Types
// ============================================================================

interface TeamMember {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
  role: string;
  joinedAt: string;
}

interface Team {
  id: string;
  name: string;
  description?: string;
  slug: string;
  avatarUrl?: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: TeamMember[];
  _count: {
    projects: number;
  };
  createdAt: string;
}

// ============================================================================
// Teams Page Component
// ============================================================================

export default function TeamsPage() {
  const { user: authUser } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  useEffect(() => {
    fetchTeams();
  }, []);

  const fetchTeams = async () => {
    try {
      const { teams: data } = await http.get('/teams');
      setTeams(data);
    } catch (error) {
      console.error('Failed to fetch teams:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="teams-page">
        <div className="loading">Loading teams...</div>
      </div>
    );
  }

  return (
    <div className="teams-page">
      <div className="page-header">
        <div>
          <h1>Teams</h1>
          <p className="page-subtitle">Manage your teams and collaborators</p>
        </div>
        <button className="primary-button" onClick={() => setShowCreateModal(true)}>
          Create Team
        </button>
      </div>

      {/* Teams Grid */}
      {teams.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <h2>No teams yet</h2>
          <p>Create your first team to start collaborating.</p>
          <button className="primary-button" onClick={() => setShowCreateModal(true)}>
            Create Team
          </button>
        </div>
      ) : (
        <div className="teams-grid">
          {teams.map((team) => (
            <TeamCard
              key={team.id}
              team={team}
              onUpdate={() => {
                fetchTeams();
                setEditingTeam(null);
              }}
            />
          ))}
        </div>
      )}

      {/* Create Team Modal */}
      {showCreateModal && (
        <TeamModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchTeams();
          }}
        />
      )}

      {/* Edit Team Modal */}
      {editingTeam && (
        <TeamModal
          team={editingTeam}
          onClose={() => setEditingTeam(null)}
          onSuccess={() => {
            setEditingTeam(null);
            fetchTeams();
          }}
        />
      )}
    </div>
  );
}

// ============================================================================
// Team Card Component
// ============================================================================

interface TeamCardProps {
  team: Team;
  onUpdate: () => void;
}

function TeamCard({ team }: TeamCardProps) {
  const [showMembers, setShowMembers] = useState(false);

  const memberCount = team.members.length;
  const projectCount = team._count.projects;

  return (
    <div className="team-card">
      <div className="team-card-header">
        <div className="team-avatar">
          {team.avatarUrl ? (
            <img src={team.avatarUrl} alt={team.name} />
          ) : (
            <span className="avatar-placeholder">
              {team.name[0].toUpperCase()}
            </span>
          )}
        </div>
        <div className="team-info">
          <h3>{team.name}</h3>
          {team.description && <p>{team.description}</p>}
        </div>
      </div>

      <div className="team-stats">
        <div className="stat">
          <span className="stat-value">{memberCount}</span>
          <span className="stat-label">Members</span>
        </div>
        <div className="stat">
          <span className="stat-value">{projectCount}</span>
          <span className="stat-label">Projects</span>
        </div>
      </div>

      <div className="team-members-preview">
        {team.members.slice(0, 5).map((member) => (
          <div key={member.user.id} className="member-avatar" title={`${member.user.firstName} ${member.user.lastName}`}>
            {member.user.avatarUrl ? (
              <img src={member.user.avatarUrl} alt={member.user.firstName} />
            ) : (
              <span>{member.user.firstName[0]}{member.user.lastName[0]}</span>
            )}
          </div>
        ))}
        {team.members.length > 5 && (
          <div className="member-avatar more">
            +{team.members.length - 5}
          </div>
        )}
      </div>

      <div className="team-card-actions">
        <button className="secondary-button" onClick={() => setShowMembers(!showMembers)}>
          {showMembers ? 'Hide Members' : 'Show Members'}
        </button>
        <Link to={`/teams/${team.id}`} className="primary-button">
          View Team
        </Link>
      </div>

      {showMembers && (
        <div className="team-members-list">
          <h4>Members</h4>
          <ul>
            {team.members.map((member) => (
              <li key={member.user.id}>
                <div className="member-info">
                  <div className="member-avatar small">
                    {member.user.avatarUrl ? (
                      <img src={member.user.avatarUrl} alt={member.user.firstName} />
                    ) : (
                      <span>{member.user.firstName[0]}{member.user.lastName[0]}</span>
                    )}
                  </div>
                  <div>
                    <span className="member-name">{member.user.firstName} {member.user.lastName}</span>
                    <span className="member-email">{member.user.email}</span>
                  </div>
                </div>
                <span className={`member-role role-${member.role.toLowerCase()}`}>
                  {member.role}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Team Modal Component
// ============================================================================

interface TeamModalProps {
  team?: Team;
  onClose: () => void;
  onSuccess: () => void;
}

function TeamModal({ team, onClose, onSuccess }: TeamModalProps) {
  const isEditing = !!team;
  const [formData, setFormData] = useState({
    name: team?.name || '',
    description: team?.description || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isEditing) {
        await http.put(`/teams/${team.id}`, formData);
      } else {
        await http.post('/teams', formData);
      }
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEditing ? 'Edit Team' : 'Create Team'}</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}

            <div className="form-group">
              <label htmlFor="name">Team Name</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Engineering Team"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description (optional)</label>
              <textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="A brief description of your team..."
                rows={3}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="secondary-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={loading}>
              {loading ? 'Saving...' : isEditing ? 'Save Changes' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
