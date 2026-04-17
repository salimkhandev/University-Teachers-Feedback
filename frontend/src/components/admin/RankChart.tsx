import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props { rankings: any[] }

export default function RankChart({ rankings }: Props) {
  if (rankings.length === 0) return null;

  const data = rankings.map(r => ({
    name:          r.name.split(' ')[0], // first name to keep X axis readable
    averageRating: r.averageRating,
  }));

  const getColor = (v: number) => v >= 7 ? '#10b981' : v >= 5 ? '#f59e0b' : '#ef4444';

  return (
    <div className="card">
      <h3 className="font-semibold text-white mb-4">Ratings Overview</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fill: '#9ca3af', fontSize: 12 }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#111827', border: '1px solid #374151', borderRadius: '8px' }}
            labelStyle={{ color: '#e5e7eb' }} itemStyle={{ color: '#9ca3af' }}
            formatter={(v: any) => [`${v}/10`, 'Average Rating']} />
          <Bar dataKey="averageRating" radius={[4, 4, 0, 0]}>
            {data.map((entry, i) => (
              <Cell key={i} fill={getColor(entry.averageRating)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
