import { useState } from 'react';
import client from '../../api/client';

interface Props {
  assignment: any;
  onDone:     () => void;
}

export default function FeedbackForm({ assignment, onDone }: Props) {
  const already    = assignment.feedbackSubmitted;
  const [rating,   setRating]  = useState<number>(assignment.currentRating ?? 5);
  const [comment,  setComment] = useState<string>(assignment.currentComment ?? '');
  const [editing,  setEditing] = useState(false);
  const [loading,  setLoading] = useState(false);
  const [error,    setError]   = useState('');
  const [success,  setSuccess] = useState('');

  const readOnly = already && !editing;

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      if (already && editing) {
        await client.patch(`/feedback/${assignment.feedbackId}`, { rating, comment });
        setSuccess('Feedback updated!');
      } else {
        await client.post('/feedback', { assignmentId: assignment._id, rating, comment });
        setSuccess('Feedback submitted!');
      }
      setEditing(false);
      setTimeout(onDone, 800);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Rating slider */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-medium text-gray-300">Rating</label>
          <span className="text-2xl font-bold text-brand-400">{rating}<span className="text-sm text-gray-500">/10</span></span>
        </div>
        <input id="rating-slider" type="range" min={1} max={10} value={rating}
          disabled={readOnly}
          onChange={e => setRating(Number(e.target.value))}
          className="w-full accent-brand-500 disabled:opacity-50" />
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>1 — Poor</span><span>10 — Excellent</span>
        </div>
      </div>

      {/* Comment */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Comment (optional)</label>
        <textarea id="feedback-comment" rows={3} value={comment} disabled={readOnly}
          onChange={e => setComment(e.target.value)}
          placeholder="Share your thoughts about this teacher..."
          className="input resize-none disabled:opacity-50" />
      </div>

      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-emerald-400 text-sm">{success}</p>}

      <div className="flex gap-3">
        {already && !editing && (
          <button id="edit-feedback-btn" onClick={() => setEditing(true)} className="btn-secondary flex-1">
            ✏️ Edit Feedback
          </button>
        )}
        {(!already || editing) && (
          <button id="submit-feedback-btn" onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? 'Saving...' : already ? 'Update Feedback' : 'Submit Feedback'}
          </button>
        )}
        {editing && (
          <button onClick={() => setEditing(false)} className="btn-secondary">Cancel</button>
        )}
      </div>
    </div>
  );
}
