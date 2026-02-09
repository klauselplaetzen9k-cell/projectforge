// ============================================================================
// Frontend Utility Tests
// ============================================================================

import { describe, it, expect } from 'vitest';

// Test date formatting utilities
describe('Date Utilities', () => {
  const formatDate = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (date: Date | string): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(d);
  };

  it('should format dates correctly', () => {
    const date = new Date('2026-02-07');
    expect(formatDate(date)).toBe('Feb 7, 2026');
  });

  it('should handle relative time for minutes', () => {
    const now = new Date();
    const fiveMinsAgo = new Date(now.getTime() - 5 * 60000);
    expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
  });

  it('should handle relative time for hours', () => {
    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 3600000);
    expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
  });

  it('should handle relative time for days', () => {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 86400000);
    expect(formatRelativeTime(threeDaysAgo)).toBe('3d ago');
  });
});

describe('File Size Formatting', () => {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  it('should format bytes correctly', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(500)).toBe('500 Bytes');
    expect(formatFileSize(1023)).toBe('1023 Bytes');
  });

  it('should format kilobytes correctly', () => {
    expect(formatFileSize(1024)).toBe('1 KB');
    expect(formatFileSize(2048)).toBe('2 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
  });

  it('should format megabytes correctly', () => {
    expect(formatFileSize(1024 * 1024)).toBe('1 MB');
    expect(formatFileSize(5 * 1024 * 1024)).toBe('5 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });
});

describe('Status Color Mapping', () => {
  const getStatusColor = (status: string): string => {
    const colors: Record<string, string> = {
      TODO: '#64748b',
      IN_PROGRESS: '#f59e0b',
      IN_REVIEW: '#3b82f6',
      DONE: '#22c55e',
      CANCELLED: '#ef4444',
    };
    return colors[status] || '#64748b';
  };

  it('should return correct colors for task statuses', () => {
    expect(getStatusColor('TODO')).toBe('#64748b');
    expect(getStatusColor('IN_PROGRESS')).toBe('#f59e0b');
    expect(getStatusColor('DONE')).toBe('#22c55e');
    expect(getStatusColor('CANCELLED')).toBe('#ef4444');
  });

  it('should return default color for unknown status', () => {
    expect(getStatusColor('UNKNOWN')).toBe('#64748b');
  });
});

describe('Priority Icon Mapping', () => {
  const getPriorityIcon = (priority: string): string => {
    const icons: Record<string, string> = {
      URGENT: '🔴',
      HIGH: '🟠',
      MEDIUM: '🟡',
      LOW: '🟢',
    };
    return icons[priority] || '⚪';
  };

  it('should return correct icons for priorities', () => {
    expect(getPriorityIcon('URGENT')).toBe('🔴');
    expect(getPriorityIcon('HIGH')).toBe('🟠');
    expect(getPriorityIcon('MEDIUM')).toBe('🟡');
    expect(getPriorityIcon('LOW')).toBe('🟢');
  });

  it('should return default icon for unknown priority', () => {
    expect(getPriorityIcon('UNKNOWN')).toBe('⚪');
  });
});

describe('Truncation Helpers', () => {
  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  };

  it('should not truncate short text', () => {
    expect(truncateText('Hello', 10)).toBe('Hello');
  });

  it('should truncate long text', () => {
    // maxLength=10 means 7 chars + '...' = 10 total
    expect(truncateText('This is a very long text', 10)).toBe('This is...');
    // maxLength=14 means 11 chars + '...' = 14 total
    expect(truncateText('This is a very long text', 14)).toBe('This is a v...');
  });

  it('should handle exact max length', () => {
    expect(truncateText('Exactly', 7)).toBe('Exactly');
  });
});
