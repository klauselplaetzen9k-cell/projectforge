import React, { useState } from 'react';
import { http } from '../../services/api';

interface MattermostSettingsProps {
  projectId: string;
  initialSettings?: {
    webhookUrl: string;
    channel: string;
    username: string;
    enabled: boolean;
    events: {
      taskAssigned: boolean;
      taskCompleted: boolean;
      taskDueSoon: boolean;
      taskComment: boolean;
      milestoneReached: boolean;
      projectUpdated: boolean;
      memberJoined: boolean;
    };
    isManager: boolean;
  };
  onUpdate?: () => void;
}

export default function MattermostSettings({ projectId, initialSettings, onUpdate }: MattermostSettingsProps) {
  const [settings, setSettings] = useState({
    webhookUrl: initialSettings?.webhookUrl || '',
    channel: initialSettings?.channel || '',
    username: initialSettings?.username || 'ProjectForge',
    enabled: initialSettings?.enabled || false,
    events: initialSettings?.events || {
      taskAssigned: true,
      taskCompleted: true,
      taskDueSoon: true,
      taskComment: true,
      milestoneReached: true,
      projectUpdated: false,
      memberJoined: true,
    },
    isManager: initialSettings?.isManager || false,
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    if (!settings.isManager) return;

    setSaving(true);
    setMessage(null);

    try {
      await http.put(`/notifications/project/${projectId}/settings`, {
        webhookUrl: settings.webhookUrl,
        channel: settings.channel,
        username: settings.username,
        enabled: settings.enabled,
        events: settings.events,
      });

      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      onUpdate?.();
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Failed to save settings' 
      });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setMessage(null);

    try {
      await http.post(`/notifications/project/${projectId}/test`);
      setMessage({ type: 'success', text: 'Test notification sent!' });
    } catch (error: any) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.error || 'Test failed - check webhook URL' 
      });
    } finally {
      setTesting(false);
    }
  };

  const eventDescriptions = {
    taskAssigned: 'When a task is assigned to someone',
    taskCompleted: 'When a task is marked as done',
    taskDueSoon: 'When a task is approaching its due date',
    taskComment: 'When a new comment is added to a task',
    milestoneReached: 'When a milestone is completed',
    projectUpdated: 'When project settings are changed',
    memberJoined: 'When a new member joins the project',
  };

  if (!settings.isManager) {
    return (
      <div className="mattermost-settings">
        <h3>🔗 Mattermost Integration</h3>
        <p className="manager-notice">
          Only project managers can configure Mattermost notifications.
        </p>
      </div>
    );
  }

  return (
    <div className="mattermost-settings">
      <div className="settings-header">
        <h3>🔗 Mattermost Integration</h3>
        <p className="settings-description">
          Send notifications to Mattermost when events occur in your project.
        </p>
      </div>

      {message && (
        <div className={`settings-message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="settings-section">
        <label className="toggle-label">
          <input
            type="checkbox"
            checked={settings.enabled}
            onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
          />
          <span className="toggle-label-text">
            <strong>Enable Mattermost Notifications</strong>
          </span>
        </label>
      </div>

      {settings.enabled && (
        <>
          <div className="settings-section">
            <label className="form-label">
              Webhook URL *
            </label>
            <input
              type="url"
              className="form-input"
              placeholder="https://mattermost.example.com/hooks/xxx"
              value={settings.webhookUrl}
              onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
            />
            <p className="form-hint">
              Create an incoming webhook in your Mattermost instance and paste the URL here.
              <a 
                href="https://developers.mattermost.com/integrate/webhooks/incoming/" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                Learn more →
              </a>
            </p>
          </div>

          <div className="settings-row">
            <div className="settings-section">
              <label className="form-label">Channel</label>
              <input
                type="text"
                className="form-input"
                placeholder="project-notifications"
                value={settings.channel}
                onChange={(e) => setSettings({ ...settings, channel: e.target.value })}
              />
              <p className="form-hint">Optional: Override default channel</p>
            </div>

            <div className="settings-section">
              <label className="form-label">Bot Username</label>
              <input
                type="text"
                className="form-input"
                placeholder="ProjectForge"
                value={settings.username}
                onChange={(e) => setSettings({ ...settings, username: e.target.value })}
              />
            </div>
          </div>

          <div className="settings-section">
            <h4>Notification Events</h4>
            <div className="events-grid">
              {Object.entries(settings.events).map(([key, enabled]) => (
                <label key={key} className="event-item">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => setSettings({
                      ...settings,
                      events: {
                        ...settings.events,
                        [key]: e.target.checked
                      }
                    })}
                  />
                  <div className="event-info">
                    <span className="event-name">
                      {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                    </span>
                    <span className="event-desc">
                      {eventDescriptions[key as keyof typeof eventDescriptions]}
                    </span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="settings-actions">
            <button
              className="btn btn-secondary"
              onClick={handleTest}
              disabled={testing || !settings.webhookUrl}
            >
              {testing ? 'Sending...' : 'Send Test Notification'}
            </button>
            <button
              className="btn btn-primary"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </>
      )}

      {!settings.enabled && (
        <div className="settings-disabled">
          <p>Enable Mattermost to start receiving notifications in your team's channel.</p>
        </div>
      )}
    </div>
  );
}
