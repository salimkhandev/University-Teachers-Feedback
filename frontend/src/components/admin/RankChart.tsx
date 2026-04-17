import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '../../context/ThemeContext';

interface Props { rankings: any[] }

function CompactTooltip({ active, payload, label, isDark }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="max-w-[160px] sm:max-w-[220px] rounded-lg border p-2 shadow-lg text-xs sm:text-sm whitespace-normal break-words"
      style={{
        backgroundColor: isDark ? '#111827' : '#ffffff',
        borderColor: isDark ? '#374151' : '#e5e7eb',
        color: isDark ? '#f3f4f6' : '#111827',
      }}
    >
      <p className="font-semibold mb-1">{label}</p>
      <p>{`Average Rating: ${payload[0].value}/10`}</p>
    </div>
  );
}

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
            content={<CompactTooltip isDark={isDark} />}
            wrapperStyle={{ zIndex: 50 }}
            allowEscapeViewBox={{ x: false, y: true }}
            cursor={{ fill: 'rgba(99, 102, 241, 0.08)' }}
          />
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
