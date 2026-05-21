import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function SummaryPanel() {
  const [summary,     setSummary]     = useState('');
  const [cached,      setCached]      = useState(false);
  const [isStale,     setIsStale]     = useState(false);
  const [noCache,     setNoCache]     = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const fetchSummary = async (force = false) => {
    setLoading(true); setError('');
    try {
      const { data } = await client.get(`/teacher/summary?force=${force}&_=${Date.now()}`);
      setSummary(data.summary);
      setCached(data.cached);
      setIsStale(data.isStale || false);
      setNoCache(data.noCache || false);
      setGeneratedAt(data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(false); }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary">AI Summary</h3>
        <div className="flex items-center gap-2">
          {!loading && (
            <>
              {isStale && (
                <span className="px-2.5 py-0.5 text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-md animate-pulse">
                  ⚠️ Outdated
                </span>
              )}
              {cached && !isStale && (
                <span className="badge-green">⚡ Cached</span>
              )}
              {!cached && !noCache && (
                <span className="badge-blue">✨ Fresh</span>
              )}
            </>
          )}
          <button id="refresh-summary-btn" onClick={() => fetchSummary(true)} disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3">
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Loading AI summary...</span>
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : noCache ? (
        <div className="py-8 px-4 text-center border-2 border-dashed border-base rounded-xl bg-gray-500/5 transition-all">
          <div className="text-3xl mb-3 text-secondary">📊</div>
          <h4 className="text-sm font-semibold text-primary mb-1">No AI Summary Yet</h4>
          <p className="text-secondary text-xs mb-5 max-w-sm mx-auto leading-relaxed">
            An AI summary has not been generated for your performance yet. Let's analyze your feedback!
          </p>
          <button 
            onClick={() => fetchSummary(true)} 
            className="btn-primary py-2 px-5 text-xs font-semibold hover:scale-105 active:scale-95 transition-transform"
          >
            ⚡ Generate AI Summary
          </button>
        </div>
      ) : (
        <>
          {isStale && (
            <div className="mb-4 p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all duration-300">
              <div className="flex items-center gap-2">
                <span className="text-base leading-none">🔔</span>
                <span className="leading-relaxed">New student feedback has been submitted since this summary was generated.</span>
              </div>
              <button 
                onClick={() => fetchSummary(true)} 
                className="btn-primary text-[10px] py-1.5 px-4 shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-medium border-none shadow-sm transition-all hover:scale-105"
              >
                ⚡ Update Summary
              </button>
            </div>
          )}
          <div className="prose dark:prose-invert text-primary text-sm leading-relaxed whitespace-pre-wrap">
            {summary}
          </div>
          {generatedAt && (
            <p className="text-xs text-secondary mt-4">Generated: {generatedAt}</p>
          )}
        </>
      )}
    </div>
  );
}
