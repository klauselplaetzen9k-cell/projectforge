// ============================================================================
// Task Comments Component
// ============================================================================

import { useState, useEffect, useRef } from 'react';
import { http } from '../../services/api';

// ============================================================================
// Types
// ============================================================================

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    avatarUrl?: string;
  };
}

interface TaskCommentsProps {
  taskId: string;
}

// ============================================================================
// Task Comments Component
// ============================================================================

export default function TaskComments({ taskId }: TaskCommentsProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const commentsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchComments();
  }, [taskId]);

  useEffect(() => {
    commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  const fetchComments = async () => {
    try {
      // Get task details which includes comments
      const { task } = await http.get(`/tasks/${taskId}`);
      setComments(task.comments || []);
    } catch (error) {
      console.error('Failed to fetch comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    try {
      const { comment } = await http.post(`/tasks/${taskId}/comments`, {
        content: newComment,
      });
      setComments([...comments, comment]);
      setNewComment('');
    } catch (error) {
      console.error('Failed to post comment:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return <div className="loading">Loading comments...</div>;
  }

  return (
    <div className="task-comments">
      <h3>💬 Comments ({comments.length})</h3>

      {/* Comments List */}
      <div className="comments-list">
        {comments.length === 0 ? (
          <div className="no-comments">
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="comment">
              <div className="comment-header">
                <div className="comment-avatar">
                  {comment.user.avatarUrl ? (
                    <img src={comment.user.avatarUrl} alt={comment.user.firstName} />
                  ) : (
                    <span>
                      {comment.user.firstName[0]}{comment.user.lastName[0]}
                    </span>
                  )}
                </div>
                <div className="comment-meta">
                  <span className="comment-author">
                    {comment.user.firstName} {comment.user.lastName}
                  </span>
                  <span className="comment-date">{formatDate(comment.createdAt)}</span>
                </div>
              </div>
              <div className="comment-body">
                <p>{comment.content}</p>
              </div>
            </div>
          ))
        )}
        <div ref={commentsEndRef} />
      </div>

      {/* New Comment Form */}
      <form onSubmit={handleSubmit} className="new-comment-form">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Write a comment..."
          rows={3}
          className="comment-input"
        />
        <button 
          type="submit" 
          className="submit-comment" 
          disabled={!newComment.trim() || submitting}
        >
          {submitting ? 'Posting...' : 'Comment'}
        </button>
      </form>
    </div>
  );
}
