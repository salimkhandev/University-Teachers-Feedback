import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

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

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const chartStyles = {
    grid: isDark ? '#1f2937' : '#e5e7eb',
    tick: isDark ? '#9ca3af' : '#4b5563',
    tooltipBg: isDark ? '#111827' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f3f4f6' : '#111827',
    tooltipLabel: isDark ? '#e5e7eb' : '#6b7280',
  };

  return (
    <div className="card">
      <div className="flex items-start sm:items-center justify-between mb-4 gap-3">
        <h3 className="font-semibold text-primary text-sm sm:text-base">Rating Distribution</h3>
        <div className="text-right">
          <div className="text-2xl sm:text-3xl font-bold text-brand-600 dark:text-brand-400">{overall}</div>
          <div className="text-xs text-secondary">/ 10 overall</div>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={chartStyles.grid} />
          <XAxis dataKey="rating" tick={{ fill: chartStyles.tick, fontSize: 12 }} />
          <YAxis tick={{ fill: chartStyles.tick, fontSize: 12 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{ 
              backgroundColor: chartStyles.tooltipBg, 
              border: `1px solid ${chartStyles.tooltipBorder}`, 
              borderRadius: '8px' 
            }}
            labelStyle={{ color: chartStyles.tooltipLabel }} 
            itemStyle={{ color: chartStyles.tooltipText }}
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
