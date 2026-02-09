// ============================================================================
// Gantt Chart Component
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Timeline {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  isDefault: boolean;
  events: TimelineEvent[];
}

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  eventType: string;
  startDate: string;
  endDate?: string;
  color?: string;
}

interface Milestone {
  id: string;
  name: string;
  dueDate: string;
  completed: boolean;
}

interface GanttChartProps {
  projectId: string;
}

// ============================================================================
// Gantt Chart Component
// ============================================================================

export default function GanttChart({ projectId }: GanttChartProps) {
  const [timelines, setTimelines] = useState<Timeline[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [zoom, setZoom] = useState<'week' | 'month' | 'quarter'>('month');
  const [createModalState, setCreateModalState] = useState(false);

  const openCreateModal = () => setCreateModalState(true);
  const closeCreateModal = () => setCreateModalState(false);

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const fetchData = async () => {
    try {
      const { timelines: t } = await http.get(`/timelines/project/${projectId}`);
      setTimelines(t);
      if (t.length > 0 && !selectedTimelineId) {
        const defaultTimeline = t.find((tl: Timeline) => tl.isDefault) || t[0];
        setSelectedTimelineId(defaultTimeline.id);
      }

      // Fetch milestones
      const { milestones: m } = await http.get(`/milestones/project/${projectId}`);
      setMilestones(m);
    } catch (error) {
      console.error('Failed to fetch timeline data:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedTimeline = timelines.find(t => t.id === selectedTimelineId);

  const { dateRange, columns } = useMemo(() => {
    if (!selectedTimeline) return { dateRange: { start: new Date(), end: new Date() }, columns: [] };

    const start = new Date(selectedTimeline.startDate);
    const end = new Date(selectedTimeline.endDate);
    const cols: { date: Date; label: string; isWeekend: boolean }[] = [];

    let current = new Date(start);
    while (current <= end) {
      const isWeekend = current.getDay() === 0 || current.getDay() === 6;
      cols.push({
        date: new Date(current),
        label: zoom === 'week' 
          ? `${current.getDate()}/${current.getMonth() + 1}`
          : current.getDate() === 1 
            ? current.toLocaleDateString('en-US', { month: 'short' })
            : current.getDate().toString(),
        isWeekend,
      });
      current.setDate(current.getDate() + 1);
    }

    return { dateRange: { start, end: new Date(end) }, columns: cols };
  }, [selectedTimeline, zoom]);

  const getPosition = (date: Date) => {
    const totalDays = Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    const dayOffset = Math.ceil((date.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24));
    return (dayOffset / totalDays) * 100;
  };

  const getWidth = (startDate: string, endDate?: string) => {
    const start = new Date(startDate);
    const end = endDate ? new Date(endDate) : new Date(start);
    const startPos = getPosition(start);
    const endPos = getPosition(end);
    return Math.max(endPos - startPos + 2, 5); // Minimum width
  };

  const getEventColor = (eventType: string, color?: string) => {
    if (color) return color;
    switch (eventType) {
      case 'MILESTONE': return '#6366f1';
      case 'DEADLINE': return '#ef4444';
      case 'REVIEW': return '#f59e0b';
      case 'MEETING': return '#3b82f6';
      case 'RELEASE': return '#22c55e';
      default: return '#64748b';
    }
  };

  if (loading) {
    return <div className="loading">Loading Gantt chart...</div>;
  }

  return (
    <div className="gantt-chart">
      <div className="gantt-header">
        <div className="gantt-title">
          <h2>📅 Timeline</h2>
          <select
            value={selectedTimelineId || ''}
            onChange={(e) => setSelectedTimelineId(e.target.value)}
            className="timeline-select"
          >
            {timelines.map(tl => (
              <option key={tl.id} value={tl.id}>
                {tl.name} {tl.isDefault ? '(Default)' : ''}
              </option>
            ))}
          </select>
        </div>
        <div className="gantt-controls">
          <div className="zoom-controls">
            <button 
              className={`zoom-button ${zoom === 'week' ? 'active' : ''}`}
              onClick={() => setZoom('week')}
            >Week</button>
            <button 
              className={`zoom-button ${zoom === 'month' ? 'active' : ''}`}
              onClick={() => setZoom('month')}
            >Month</button>
            <button 
              className={`zoom-button ${zoom === 'quarter' ? 'active' : ''}`}
              onClick={() => setZoom('quarter')}
            >Quarter</button>
          </div>
          <button className="primary-button" onClick={() => openCreateModal()}>
            + Timeline Event
          </button>
        </div>
      </div>

      {timelines.length === 0 ? (
        <div className="empty-gantt">
          <p>No timelines created yet.</p>
          <button className="secondary-button" onClick={() => openCreateModal()}>
            Create Your First Timeline
          </button>
        </div>
      ) : (
        <div className="gantt-container">
          {/* Timeline Header */}
          <div className="gantt-timeline-header">
            <div className="gantt-sidebar-header">Event / Task</div>
            <div className="gantt-timeline-dates" style={{ position: 'relative' }}>
              {columns.map((col, i) => (
                <div 
                  key={i} 
                  className={`gantt-date-header ${col.isWeekend ? 'weekend' : ''}`}
                  style={{ 
                    position: 'absolute',
                    left: `${(i / columns.length) * 100}%`,
                    width: `${100 / columns.length}%`,
                  }}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Body */}
          <div className="gantt-body">
            {/* Events */}
            <div className="gantt-section">
              <div className="gantt-section-title">Events</div>
              {selectedTimeline?.events.map(event => (
                <div key={event.id} className="gantt-row">
                  <div className="gantt-sidebar">
                    <span 
                      className="event-type-indicator"
                      style={{ backgroundColor: getEventColor(event.eventType, event.color) }}
                    />
                    <span className="event-title">{event.title}</span>
                  </div>
                  <div className="gantt-timeline-row" style={{ position: 'relative' }}>
                    <div 
                      className="gantt-bar event"
                      style={{
                        position: 'absolute',
                        left: `${getPosition(new Date(event.startDate))}%`,
                        width: `${getWidth(event.startDate, event.endDate)}%`,
                        backgroundColor: getEventColor(event.eventType, event.color),
                      }}
                    >
                      <span className="bar-label">{event.title}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Milestones */}
            <div className="gantt-section">
              <div className="gantt-section-title">Milestones</div>
              {milestones.map(milestone => (
                <div key={milestone.id} className="gantt-row">
                  <div className="gantt-sidebar">
                    <span className={`milestone-marker ${milestone.completed ? 'completed' : ''}`}>
                      {milestone.completed ? '✓' : '◆'}
                    </span>
                    <span className="milestone-title">{milestone.name}</span>
                  </div>
                  <div className="gantt-timeline-row" style={{ position: 'relative' }}>
                    <div 
                      className={`gantt-marker ${milestone.completed ? 'completed' : ''}`}
                      style={{
                        position: 'absolute',
                        left: `${getPosition(new Date(milestone.dueDate))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Today Line */}
          <div 
            className="today-line"
            style={{
              left: `${getPosition(new Date())}%`,
            }}
          />
        </div>
      )}

      {/* Today Label */}
      <div className="today-label" style={{ left: `${getPosition(new Date())}%` }}>
        Today
      </div>
    </div>
  );
}
