import { useState } from 'react';
import client from '../../api/client';

export default function ReportButton() {
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState('');
  const [done,     setDone]     = useState(false);
  const [error,    setError]    = useState('');

  const generate = async () => {
    setLoading(true); setDone(false); setError(''); setProgress('Starting...');
    try {
      const { data } = await client.post('/admin/report/generate');
      const results = data.results || [];
      const failures = results.filter((r: string) => r.startsWith('❌'));
      
      if (failures.length > 0) {
        setError(`${failures.length} summaries failed. Please check your AI API key.`);
      } else {
        setDone(true);
      }
      setProgress(`Processed ${results.length} teachers`);
    } catch (err: any) {
      setError(err.response?.data?.error ?? 'Report generation failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-2">Generate Full AI Report</h3>
      <p className="text-gray-400 text-sm mb-5">
        Generates and caches Gemini summaries for all teachers in batches of 10.
      </p>

      {error    && <p className="text-red-400 text-sm mb-3">{error}</p>}
      {progress && !done && <p className="text-gray-400 text-sm mb-3 animate-pulse">{progress}</p>}
      {done     && <p className="text-emerald-400 text-sm mb-3">✅ All summaries updated successfully!</p>}

      <button id="generate-report-btn" onClick={generate} disabled={loading}
        className="btn-primary">
        {loading
          ? <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
              Generating...
            </span>
          : '⚡ Generate Full Report'
        }
      </button>
    </div>
  );
}
