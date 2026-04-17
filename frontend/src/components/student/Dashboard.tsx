import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import client from '../../api/client';
import TeacherCard from './TeacherCard';
import ThemeToggle from '../common/ThemeToggle';

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const [assignments, setAssignments] = useState<any[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const fetchAssignments = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await client.get('/student/assignments');
      setAssignments(data);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load assignments');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAssignments(); }, [fetchAssignments]);

  const submitted = assignments.filter(a => a.feedbackSubmitted).length;
  const pct       = assignments.length ? Math.round((submitted / assignments.length) * 100) : 0;

  return (
    <div className="min-h-screen transition-colors duration-200">
      <nav className="nav">
        <div className="nav-inner">
          <div className="min-w-0">
            <h1 className="font-bold text-primary text-sm sm:text-base truncate">Student Dashboard</h1>
            <p className="text-xs text-secondary truncate">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <ThemeToggle />
            <button id="logout-btn" onClick={logout} className="btn-secondary shrink-0 text-xs sm:text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="page-wrap">
        {/* Progress card */}
        <div className="card mb-6">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
            <h2 className="font-semibold text-primary text-sm sm:text-base">Feedback Progress</h2>
            <span className="text-xs sm:text-sm text-secondary">
              {submitted} / {assignments.length} teachers rated
            </span>
          </div>
          <div className="w-full bg-gray-500/10 rounded-full h-2.5">
            <div className="bg-brand-500 h-2.5 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }} />
          </div>
          {pct === 100 && assignments.length > 0 && (
            <p className="text-emerald-400 text-xs sm:text-sm mt-3">🎉 You've rated all your teachers!</p>
          )}
        </div>

        {/* Cards grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="card text-red-500 text-center text-sm">{error}</div>
        ) : assignments.length === 0 ? (
          <div className="card text-center text-secondary text-sm">No teacher assignments found for your section.</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {assignments.map(a => (
              <TeacherCard key={a._id} assignment={a} onRefresh={fetchAssignments} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
