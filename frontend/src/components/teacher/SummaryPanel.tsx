import { useEffect, useState } from 'react';
import client from '../../api/client';

export default function SummaryPanel() {
  const [summary,     setSummary]     = useState('');
  const [cached,      setCached]      = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string>('');
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState('');

  const fetchSummary = async () => {
    setLoading(true); setError('');
    try {
      const { data } = await client.get('/teacher/summary');
      setSummary(data.summary);
      setCached(data.cached);
      setGeneratedAt(data.generatedAt ? new Date(data.generatedAt).toLocaleString() : '');
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Failed to load summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSummary(); }, []);

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-primary">AI Summary</h3>
        <div className="flex items-center gap-2">
          {!loading && (
            <span className={cached ? 'badge-green' : 'badge-gray'}>
              {cached ? '⚡ Cached' : '✨ Fresh'}
            </span>
          )}
          <button id="refresh-summary-btn" onClick={fetchSummary} disabled={loading}
            className="btn-secondary text-xs py-1.5 px-3">
            {loading ? '...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-3 py-8 justify-center">
          <div className="w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-400">Generating AI summary...</span>
        </div>
      ) : error ? (
        <p className="text-red-400">{error}</p>
      ) : (
        <>
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
