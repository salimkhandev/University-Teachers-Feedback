import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import client from '../../api/client';
import TeacherRankingTable from './TeacherRankingTable';
import RankChart           from './RankChart';
import StudentTracking     from './StudentTracking';
import PendingStudents     from './PendingStudents';

const TABS = ['Overview', 'Student Tracking', 'Pending Students'] as const;

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState<typeof TABS[number]>('Overview');
  const [rankings, setRankings] = useState<any[]>([]);
  const [status,   setStatus]   = useState<any>(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      client.get('/admin/teachers/rankings'),
      client.get('/admin/report/status'),
    ]).then(([r, s]) => {
      setRankings(r.data);
      setStatus(s.data);
    }).finally(() => setLoading(false));
  }, []);

  const stats = [
    { label: 'Teachers',     value: status?.totalTeachers  ?? '—', icon: '👨‍🏫' },
    { label: 'Students',     value: status?.totalStudents  ?? '—', icon: '👨‍🎓' },
    { label: 'Feedback',     value: status?.totalFeedback  ?? '—', icon: '⭐' },
  ];

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="nav">
        <div className="nav-inner">
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm sm:text-base truncate">Admin Dashboard</h1>
            <p className="text-xs text-gray-400 truncate">Welcome, {user?.name}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to="/admin/setup" id="setup-link"
              className="btn-secondary text-xs sm:text-sm hidden sm:inline-flex">
              ⚙ Setup
            </Link>
            <button id="logout-btn" onClick={logout} className="btn-secondary text-xs sm:text-sm">
              Sign Out
            </button>
          </div>
        </div>
      </nav>

      <div className="page-wrap">
        {/* Setup link (mobile) */}
        <Link to="/admin/setup"
          className="flex items-center gap-2 text-brand-400 text-sm mb-5 sm:hidden">
          ⚙ System Setup →
        </Link>
        
        {/* Navigation Tabs */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-1 scrollbar-none border-b border-gray-800/60 sticky top-0 bg-gray-950 z-10">
          {TABS.map(t => (
            <button key={t} id={`tab-${t.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setTab(t)}
              className={`tab shrink-0 ${t === tab ? 'tab-active' : 'tab-inactive'}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === 'Overview' && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6">
              {stats.map(s => (
                <div key={s.label} className="card py-4 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl sm:text-2xl font-bold text-brand-400">
                    {loading ? '…' : s.value}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="space-y-5">
              <RankChart rankings={rankings} />
              <TeacherRankingTable rankings={rankings} />
            </div>
          </>
        )}
        
        {tab === 'Student Tracking' && <StudentTracking />}
        {tab === 'Pending Students' && <PendingStudents />}
      </div>
    </div>
  );
}
