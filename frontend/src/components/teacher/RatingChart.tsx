import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props { breakdown: any[] }

export default function RatingChart({ breakdown }: Props) {
  // Build distribution data across all subjects
  const dist: Record<number, number> = {};
  for (let i = 1; i <= 10; i++) dist[i] = 0;
  breakdown.forEach(b => {
    Object.entries(b.distribution).forEach(([k, v]) => {
      dist[Number(k)] = (dist[Number(k)] ?? 0) + (v as number);
    });
  });

  const data = Object.entries(dist).map(([rating, count]) => ({ rating: Number(rating), count }));
  const overall = breakdown.length
    ? (breakdown.reduce((s, b) => s + b.averageRating * b.totalCount, 0) /
       Math.max(breakdown.reduce((s, b) => s + b.totalCount, 0), 1)).toFixed(2)
    : '0';

  const getColor = (rating: number) =>
    rating >= 8 ? '#10b981' : rating >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-white">Rating Distribution</h3>
        <div className="text-right">
          <div className="text-3xl font-bold text-brand-400">{overall}</div>
          <div className="text-xs text-gray-500">/ 10 overall</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="rating" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis tick={{ fill: '#9ca3af', fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#9ca3af' }}
            formatter={(v: any) => [v, 'Students']} labelFormatter={(l) => `Rating: ${l}/10`} />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {data.map((entry) => (
              <Cell key={entry.rating} fill={getColor(entry.rating)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
