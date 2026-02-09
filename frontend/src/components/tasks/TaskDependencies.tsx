// ============================================================================
// Task Dependencies Component
// ============================================================================

import { useState, useEffect } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Dependency {
  id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependsOnTask?: {
    id: string;
    title: string;
    status: string;
    assignee?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface TaskDependenciesProps {
  taskId: string;
  onClose: () => void;
}

// ============================================================================
// Task Dependencies Component
// ============================================================================

export default function TaskDependencies({ taskId, onClose }: TaskDependenciesProps) {
  const [blocks, setBlocks] = useState<Dependency[]>([]);
  const [blockedBy, setBlockedBy] = useState<Dependency[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [localTasks, setLocalTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchDependencies();
  }, [taskId]);

  const fetchDependencies = async () => {
    try {
      const data = await http.get(`/tasks/${taskId}/dependencies`);
      setBlocks(data.blocks || []);
      setBlockedBy(data.blockedBy || []);
    } catch (error) {
      console.error('Failed to fetch dependencies:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDependency = async (dependsOnTaskId: string) => {
    try {
      await http.post(`/tasks/${taskId}/dependencies`, { dependsOnTaskId });
      fetchDependencies();
      setShowAddModal(false);
    } catch (error) {
      console.error('Failed to add dependency:', error);
    }
  };

  const handleRemoveDependency = async (dependsOnTaskId: string) => {
    try {
      await http.delete(`/tasks/${taskId}/dependencies/${dependsOnTaskId}`);
      fetchDependencies();
    } catch (error) {
      console.error('Failed to remove dependency:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DONE': return 'status-done';
      case 'IN_PROGRESS': return 'status-in-progress';
      default: return 'status-todo';
    }
  };

  if (loading) {
    return <div className="loading">Loading dependencies...</div>;
  }

  return (
    <div className="task-dependencies">
      <div className="dependencies-header">
        <h2>Task Dependencies</h2>
        <button className="close-button" onClick={onClose}>×</button>
      </div>

      <div className="dependencies-content">
        {/* Blocked By Section */}
        <div className="dependency-section">
          <h3>🔒 Blocked By</h3>
          <p className="section-description">Tasks that must be completed before this task</p>
          
          {blockedBy.length === 0 ? (
            <div className="empty-dependencies">
              <p>Not blocked by any task</p>
            </div>
          ) : (
            <ul className="dependency-list">
              {blockedBy.map(dep => (
                <li key={dep.id} className="dependency-item">
                  <div className="dependency-info">
                    <span className={`dependency-status ${getStatusColor(dep.dependsOnTask?.status || '')}`}>
                      {dep.dependsOnTask?.status?.replace('_', ' ')}
                    </span>
                    <span className="dependency-title">{dep.dependsOnTask?.title}</span>
                    {dep.dependsOnTask?.assignee && (
                      <span className="dependency-assignee">
                        {dep.dependsOnTask.assignee.firstName} {dep.dependsOnTask.assignee.lastName}
                      </span>
                    )}
                  </div>
                  <button 
                    className="remove-dependency"
                    onClick={() => handleRemoveDependency(dep.dependsOnTaskId)}
                    title="Remove dependency"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Blocks Section */}
        <div className="dependency-section">
          <h3>🚧 Blocks</h3>
          <p className="section-description">Tasks that are waiting for this task</p>
          
          {blocks.length === 0 ? (
            <div className="empty-dependencies">
              <p>Does not block any task</p>
            </div>
          ) : (
            <ul className="dependency-list">
              {blocks.map(dep => (
                <li key={dep.id} className="dependency-item">
                  <div className="dependency-info">
                    <span className={`dependency-status ${getStatusColor(dep.dependsOnTask?.status || '')}`}>
                      {dep.dependsOnTask?.status?.replace('_', ' ')}
                    </span>
                    <span className="dependency-title">{dep.dependsOnTask?.title}</span>
                    {dep.dependsOnTask?.assignee && (
                      <span className="dependency-assignee">
                        {dep.dependsOnTask.assignee.firstName} {dep.dependsOnTask.assignee.lastName}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Add Dependency Button */}
        <button className="add-dependency-button" onClick={() => setShowAddModal(true)}>
          + Add Dependency
        </button>
      </div>

      {/* Add Dependency Modal */}
      {showAddModal && (
        <AddDependencyModal
          taskId={taskId}
          existingBlocks={blocks.map(b => b.dependsOnTaskId)}
          existingBlockedBy={blockedBy.map(b => b.dependsOnTaskId)}
          onSelect={handleAddDependency}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </div>
  );
}

// ============================================================================
// Add Dependency Modal
// ============================================================================

interface AddDependencyModalProps {
  taskId: string;
  existingBlocks: string[];
  existingBlockedBy: string[];
  onSelect: (taskId: string) => void;
  onClose: () => void;
}

function AddDependencyModal({ taskId, existingBlocks, existingBlockedBy, onSelect, onClose }: AddDependencyModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }
    setLoading(true);
    try {
      // Get tasks from project - you'd need to implement this endpoint
      const { tasks } = await http.get(`/tasks/project/${localStorage.getItem('currentProjectId') || ''}`);
      const filtered = tasks.filter((t: any) => 
        t.id !== taskId &&
        !existingBlocks.includes(t.id) &&
        !existingBlockedBy.includes(t.id) &&
        t.title.toLowerCase().includes(query.toLowerCase())
      );
      setSearchResults(filtered.slice(0, 10));
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal small" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Dependency</h2>
          <button className="close-button" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <p className="search-hint">Search for a task to depend on:</p>
          
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="dependency-search"
            autoFocus
          />

          {loading && <div className="search-loading">Searching...</div>}

          {searchResults.length > 0 && (
            <ul className="search-results">
              {searchResults.map(task => (
                <li key={task.id} onClick={() => onSelect(task.id)}>
                  <div className="result-info">
                    <span className="result-title">{task.title}</span>
                    <span className="result-status">{task.status}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {searchQuery.length >= 2 && !loading && searchResults.length === 0 && (
            <p className="no-results">No tasks found</p>
          )}
        </div>
      </div>
    </div>
  );
}
