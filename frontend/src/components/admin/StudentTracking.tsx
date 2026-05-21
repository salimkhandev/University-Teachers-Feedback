import { useState, useEffect } from 'react';
import client from '../../api/client';

export default function StudentTracking() {
  const [depts, setDepts] = useState<any[]>([]);
  const [activeDeptId, setActiveDeptId] = useState('');
  
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    client.get('/setup/departments').then(r => {
      setDepts(r.data ?? []);
      if (r.data?.length > 0) {
        setActiveDeptId(r.data[0]._id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeDeptId) return;
    setStudents([]);
    setPage(1);
    setHasMore(false);
    setTotal(0);
    loadStudents(activeDeptId, 1);
  }, [activeDeptId]);

  const loadStudents = async (dId: string, p: number) => {
    setLoading(true);
    try {
      const r = await client.get(`/admin/student-tracking/department/${dId}?page=${p}&limit=50`);
      setStudents(prev => p === 1 ? r.data.students : [...prev, ...r.data.students]);
      setHasMore(r.data.hasMore);
      setTotal(r.data.total);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNextPage = () => {
    const next = page + 1;
    setPage(next);
    loadStudents(activeDeptId, next);
  };

  // Mailto Helper Function
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
        className="block text-center mt-4 w-full px-4 py-2 bg-brand-500 hover:bg-brand-400 text-white text-sm font-medium rounded-lg transition-colors shadow-sm cursor-pointer"
      >
        Send Reminder
      </a>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 mb-6">
         {depts.map(d => (
           <button 
             key={d._id}
             onClick={() => setActiveDeptId(d._id)}
             className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 cursor-pointer ${
               activeDeptId === d._id 
                 ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' 
                 : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200'
             }`}
           >
             {d.name}
           </button>
         ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {students.map(s => (
          <div key={s.id} className="card flex flex-col justify-between hover:border-indigo-500/50 transition-colors">
             <div>
               <div className="flex justify-between items-start mb-2">
                 <h3 className="font-semibold text-primary tracking-tight">{s.name}</h3>
                 {s.status === 'Pending' ? (
                    <span className="bg-red-500/10 text-red-400 text-xs px-2 py-0.5 rounded-full border border-red-500/20 font-medium whitespace-nowrap">Pending</span>
                 ) : (
                    <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium whitespace-nowrap">Completed</span>
                 )}
               </div>
               
               <p className="text-secondary text-xs mb-4">{s.email || 'No email'}</p>
               
               <div className="space-y-3">
                 <div className="flex justify-between items-center text-sm">
                   <span className="text-secondary">Roll No</span>
                   <span className="text-primary font-mono text-xs bg-gray-500/10 px-2 py-1 rounded border border-base">{s.rollNumber}</span>
                 </div>
                 
                 <div className="mt-4 pt-4 border-t border-base">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs text-secondary font-medium">Feedback Progress</span>
                      <span className="text-xs text-primary font-medium">{s.submittedCount} / {s.totalAssigned}</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-500/10 rounded-full overflow-hidden">
                       <div className={`h-full ${s.status === 'Completed' ? 'bg-emerald-400' : 'bg-brand-500'}`} style={{ width: `${s.totalAssigned > 0 ? (s.submittedCount / s.totalAssigned) * 100 : 0}%` }}></div>
                    </div>
                 </div>
               </div>
             </div>
             
             {s.status === 'Pending' ? renderReminderButton(s.email, s.name, s.missingTeacherNames) : (
                <div className="mt-4 text-center py-2 text-xs text-emerald-500/50 bg-emerald-500/5 rounded-lg border border-emerald-500/10">All Feedbacks Submitted</div>
             )}
          </div>
        ))}
      </div>

      {loading && (
        <div className="text-center py-12 text-brand-400 flex justify-center items-center gap-3">
           <svg className="animate-spin h-6 w-6" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
           <span className="font-medium animate-pulse">Loading students...</span>
        </div>
      )}

      {!loading && students.length === 0 && activeDeptId && (
        <div className="text-center py-16 card border border-dashed border-base flex flex-col items-center justify-center gap-3">
           <svg className="w-12 h-12 text-secondary opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
           <div className="text-secondary font-medium">No students found assigned to this department.</div>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center mt-10 mb-4">
           <button 
             onClick={handleNextPage} 
             disabled={loading}
             className="px-6 py-2.5 bg-gray-500/10 hover:bg-gray-500/20 text-primary rounded-xl font-medium shadow-sm hover:shadow transition-all border border-base disabled:opacity-50 flex items-center gap-2 cursor-pointer"
           >
             {loading ? 'Fetching...' : `Load Next 50 (${students.length} / ${total})`}
           </button>
        </div>
      )}
    </div>
  );
}
