import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import client from '../../api/client';
import RatingChart  from './RatingChart';
import SummaryPanel from './SummaryPanel';
import AIChat       from './AIChat';

const TABS = ['My Ratings', 'AI Summary', 'Chat with AI'] as const;

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const [tab,        setTab]     = useState<typeof TABS[number]>('My Ratings');
  const [ratingsData,setRatings] = useState<any>(null);
  const [loading,    setLoading] = useState(true);

  useEffect(() => {
    client.get('/teacher/ratings')
      .then(({ data }) => setRatings(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gray-950">
      <nav className="nav">
        <div className="nav-inner">
          <div className="min-w-0">
            <h1 className="font-bold text-white text-sm sm:text-base truncate">Teacher Dashboard</h1>
            <p className="text-xs text-gray-400 truncate">Welcome, {user?.name}</p>
          </div>
          <button id="logout-btn" onClick={logout} className="btn-secondary shrink-0 text-xs sm:text-sm">
            Sign Out
          </button>
        </div>
      </nav>

      <div className="page-wrap">
        {/* Scrollable tab row on mobile */}
        <div className="flex gap-1.5 sm:gap-2 mb-5 overflow-x-auto pb-1 scrollbar-none">
          {TABS.map(t => (
            <button key={t} id={`tab-${t.replace(/\s+/g, '-').toLowerCase()}`}
              onClick={() => setTab(t)}
              className={`tab shrink-0 ${t === tab ? 'tab-active' : 'tab-inactive'}`}>{t}
            </button>
          ))}
        </div>

        {tab === 'My Ratings' && (
          <div className="space-y-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ratingsData ? (
              <>
                <RatingChart breakdown={ratingsData.breakdown} />
                <div className="card">
                  <h3 className="font-semibold text-white mb-4 text-sm sm:text-base">Per-Subject Breakdown</h3>
                  {ratingsData.breakdown.length === 0 ? (
                    <p className="text-gray-500 text-sm">No feedback received yet.</p>
                  ) : (
                    <div className="table-wrap">
                      <table className="w-full text-sm min-w-[320px]">
                        <thead>
                          <tr className="border-b border-gray-800 text-left">
                            <th className="pb-3 text-gray-400 font-medium">Subject</th>
                            <th className="pb-3 text-gray-400 font-medium text-right">Avg</th>
                            <th className="pb-3 text-gray-400 font-medium text-right">Count</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                          {ratingsData.breakdown.map((b: any, i: number) => (
                            <tr key={i} className="hover:bg-gray-800/30 transition-colors">
                              <td className="py-3 text-white">
                                {b.assignment?.subjectId?.name ?? '—'}
                                <span className="text-xs text-gray-500 ml-1 hidden sm:inline">({b.assignment?.subjectId?.code})</span>
                              </td>
                              <td className="py-3 text-right">
                                <span className={`font-bold ${b.averageRating >= 7 ? 'text-emerald-400' : b.averageRating >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                                  {b.averageRating}/10
                                </span>
                              </td>
                              <td className="py-3 text-right text-gray-400">{b.totalCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card text-center text-gray-400 text-sm">Failed to load ratings.</div>
            )}
          </div>
        )}

        {tab === 'AI Summary'   && <SummaryPanel />}
        {tab === 'Chat with AI' && <AIChat />}
      </div>
    </div>
  );
}
