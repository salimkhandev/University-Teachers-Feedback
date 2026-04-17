import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface Props { rankings: any[] }

export default function RankChart({ rankings }: Props) {
  if (rankings.length === 0) return null;

  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const data = rankings.map(r => ({
    name:          r.name.split(' ')[0], // first name to keep X axis readable
    averageRating: r.averageRating,
  }));

  const getColor = (v: number) => v >= 7 ? '#10b981' : v >= 5 ? '#f59e0b' : '#ef4444';

  const styles = {
    grid: isDark ? '#1f2937' : '#e5e7eb',
    tick: isDark ? '#9ca3af' : '#4b5563',
    tooltipBg: isDark ? '#111827' : '#ffffff',
    tooltipBorder: isDark ? '#374151' : '#e5e7eb',
    tooltipText: isDark ? '#f3f4f6' : '#111827',
    tooltipLabel: isDark ? '#e5e7eb' : '#6b7280',
  };

  return (
    <div className="card">
      <h3 className="font-semibold text-primary mb-3 sm:mb-4 text-sm sm:text-base">Ratings Overview</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 5, right: 5, bottom: 5, left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={styles.grid} />
          <XAxis dataKey="name" tick={{ fill: styles.tick, fontSize: 12 }} />
          <YAxis domain={[0, 10]} tick={{ fill: styles.tick, fontSize: 12 }} />
          <Tooltip
            contentStyle={{ 
              backgroundColor: styles.tooltipBg, 
              border: `1px solid ${styles.tooltipBorder}`, 
              borderRadius: '8px' 
            }}
            labelStyle={{ color: styles.tooltipLabel }} 
            itemStyle={{ color: styles.tooltipText }}
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
