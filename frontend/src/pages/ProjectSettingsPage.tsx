import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import MattermostSettings from '../components/settings/MattermostSettings';

interface ProjectSettingsPageProps {
  projectId?: string;
}

export default function ProjectSettingsPage({ projectId: propProjectId }: ProjectSettingsPageProps) {
  const params = useParams();
  const projectId = propProjectId || params.projectId || '';
  const [activeTab, setActiveTab] = useState<'general' | 'notifications' | 'members'>('general');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  return (
    <div className="project-settings-page">
      <div className="page-header">
        <h1>Project Settings</h1>
      </div>

      {/* Tabs */}
      <div className="settings-tabs">
        <button
          className={`tab ${activeTab === 'general' ? 'active' : ''}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`tab ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications
        </button>
        <button
          className={`tab ${activeTab === 'members' ? 'active' : ''}`}
          onClick={() => setActiveTab('members')}
        >
          Members
        </button>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      {/* General Tab */}
      {activeTab === 'general' && (
        <div className="settings-section">
          <h2>Project Information</h2>
          <p className="section-description">
            Update your project details and configuration.
          </p>

          <div className="form-group">
            <label>Project Name</label>
            <input
              type="text"
              className="form-input"
              placeholder="Enter project name"
              defaultValue="My Project"
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              className="form-textarea"
              placeholder="Describe your project..."
              rows={4}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Project Key</label>
              <input
                type="text"
                className="form-input"
                placeholder="PRJ"
                defaultValue="PRJ"
                maxLength={5}
              />
            </div>
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                className="form-color"
                defaultValue="#6366f1"
              />
            </div>
          </div>

          <button className="btn btn-primary">
            Save Changes
          </button>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="settings-section">
          <MattermostSettings 
            projectId={projectId}
            onUpdate={() => setMessage({ type: 'success', text: 'Settings updated!' })}
          />
        </div>
      )}

      {/* Members Tab */}
      {activeTab === 'members' && (
        <div className="settings-section">
          <h2>Team Members</h2>
          <p className="section-description">
            Manage who has access to this project.
          </p>

          <div className="members-list">
            <div className="member-item">
              <div className="member-avatar">
                <span>JD</span>
              </div>
              <div className="member-info">
                <span className="member-name">John Doe</span>
                <span className="member-email">john@example.com</span>
              </div>
              <div className="member-role">
                <select className="role-select">
                  <option value="OWNER">Owner</option>
                  <option value="MANAGER">Manager</option>
                  <option value="MEMBER">Member</option>
                  <option value="VIEWER">Viewer</option>
                </select>
              </div>
            </div>
          </div>

          <button className="btn btn-secondary">
            + Invite Member
          </button>
        </div>
      )}
    </div>
  );
}
