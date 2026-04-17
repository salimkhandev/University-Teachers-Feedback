import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function PendingStudents() {
  const [globalPending,   setGlobalPending]   = useState<any[]>([]);
  const [pendingLoading,  setPendingLoading]  = useState(true);

  useEffect(() => {
    loadGlobalPending();
  }, []);

  const loadGlobalPending = async () => {
    setPendingLoading(true);
    try {
      const r = await client.get('/admin/pending-students');
      setGlobalPending(r.data ?? []);
    } catch (err) {
      console.error('Failed to load global pending:', err);
    } finally {
      setPendingLoading(false);
    }
  };

  const renderReminderButton = (email: string, name: string, missingTeachers: string[]) => {
    if (!email) return <span className="text-xs text-gray-500">No Email Saved</span>;
    
    const emailSubject = `Pending Feedback Requirement for ${missingTeachers.join(', ')}`;
    const emailBody = `Hi ${name},\n\nPlease log in to the feedback system and submit your pending evaluations for the following teachers:\n- ${missingTeachers.join('\n- ')}\n\nYou can log in directly here to provide your feedback: https://studentfeedbackicp.vercel.app\n\nYour prompt response is required.\n\nThank you.`;
    
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const mailToLink = `mailto:${email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const webMailLink = `https://mail.google.com/mail/?view=cm&fs=1&to=${email}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    
    return (
      <a 
        href={isMobile ? mailToLink : webMailLink}
        target={isMobile ? '_self' : '_blank'}
        rel="noopener noreferrer"
        className="inline-block px-3 py-1.5 bg-brand-500 hover:bg-brand-400 text-white text-xs rounded transition-colors whitespace-nowrap"
      >
        Send Reminder
      </a>
    );
  };

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">System-Wide Pending Students</h3>
        <button onClick={loadGlobalPending} disabled={pendingLoading} className="text-xs text-gray-400 hover:text-white transition-colors">
          {pendingLoading ? '↻ Refreshing...' : '↻ Refresh'}
        </button>
      </div>

      {pendingLoading ? (
        <div className="text-center py-16 text-gray-400 flex-1">Loading system data...</div>
      ) : globalPending.length === 0 ? (
        <div className="text-center py-16 text-brand-400 flex-1 flex flex-col items-center justify-center">
          <span className="text-4xl mb-4">🎉</span>
          <span className="text-lg">All clear! No students owe feedback.</span>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-left">
                <th className="pb-3 text-gray-400 font-medium">Student Info</th>
                <th className="pb-3 text-gray-400 font-medium">Placement (Dept / Sem / Section)</th>
                <th className="pb-3 text-gray-400 font-medium">Missing Feedbacks</th>
                <th className="pb-3 text-gray-400 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {globalPending.map((s, idx) => (
                <tr key={`${s.id}-${idx}`} className="hover:bg-gray-800/20">
                  <td className="py-3">
                    <div className="font-medium text-white">{s.name}</div>
                    <div className="text-xs text-gray-500">@{s.username}</div>
                  </td>
                  <td className="py-3 text-gray-400">
                    <span className="text-gray-300">{s.department}</span> &gt; {s.semester} &gt; {s.section}
                  </td>
                  <td className="py-3">
                    <div className="text-red-400 font-medium whitespace-nowrap">
                      {s.totalAssigned - s.submittedCount} Pending
                    </div>
                    <div className="text-xs text-gray-500 max-w-xs truncate" title={s.missingTeacherNames.join(', ')}>
                      ({s.missingTeacherNames.join(', ')})
                    </div>
                  </td>
                  <td className="py-3 text-right">
                    {renderReminderButton(s.email, s.name, s.missingTeacherNames)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
