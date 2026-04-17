import { useState } from 'react';
import FeedbackBadge from './FeedbackBadge';
import FeedbackForm  from './FeedbackForm';

interface Props {
  assignment: any;
  onRefresh:  () => void;
}

export default function TeacherCard({ assignment, onRefresh }: Props) {
  const [open, setOpen] = useState(false);

  const teacher = assignment.teacherId;
  const subject = assignment.subjectId;

  return (
    <div className="card hover:border-gray-700 transition-all duration-200">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-brand-600/30 flex items-center justify-center text-brand-400 font-bold text-sm flex-shrink-0">
            {teacher?.name?.[0] ?? '?'}
          </div>
          <div>
            <h3 className="font-semibold text-primary">{teacher?.name ?? 'Unknown Teacher'}</h3>
            <p className="text-sm text-secondary">{subject?.name ?? 'Unknown Subject'}
              {subject?.code && <span className="ml-2 text-xs text-secondary opacity-70">({subject.code})</span>}
            </p>
          </div>
        </div>
        <div className="self-start sm:self-auto">
          <FeedbackBadge submitted={assignment.feedbackSubmitted} version={assignment.feedbackVersion} />
        </div>
      </div>

      {/* Rating preview if submitted */}
      {assignment.feedbackSubmitted && (
        <div className="mt-3 flex items-center gap-2">
          <div className="flex-1 bg-gray-500/10 rounded-full h-1.5">
            <div className="bg-brand-500 h-1.5 rounded-full transition-all"
              style={{ width: `${(assignment.currentRating / 10) * 100}%` }} />
          </div>
          <span className="text-xs text-secondary">{assignment.currentRating}/10</span>
        </div>
      )}

      <button id={`toggle-feedback-${assignment._id}`}
        onClick={() => setOpen(!open)}
        className="mt-4 text-sm text-brand-400 hover:text-brand-300 transition-colors font-medium text-left">
        {open ? '▲ Hide' : (assignment.feedbackSubmitted ? '✏️ View / Edit Feedback' : '+ Give Feedback')}
      </button>

      {open && (
        <div className="mt-4 pt-4 border-t border-base">
          <FeedbackForm assignment={assignment} onRefresh={onRefresh} onDone={() => { setOpen(false); }} />
        </div>
      )}
    </div>
  );
}
