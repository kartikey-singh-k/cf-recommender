import { useEffect, useState } from 'react';
import { getStreak } from '../api/analytics.js';

export default function StreakWidget() {
  const [data, setData] = useState(null);

  useEffect(() => {
    getStreak().then(setData).catch(console.error);
  }, []);

  if (!data) return (
    <div style={styles.card}>
      <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Loading streak...</p>
    </div>
  );

  // Build solve log map
  const logMap = {};
  data.solveLog.forEach(entry => {
    const key = entry.solved_date ? entry.solved_date.split('T')[0] : null;
    if (key) logMap[key] = parseInt(entry.problems_solved) || 0;
  });

  // Build 84 days starting from 83 days ago
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allDays = [];
  for (let i = 83; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().split('T')[0];
    allDays.push({
      date: key,
      count: logMap[key] || 0,
      display: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
    });
  }

  // 12 weeks × 7 days
  const weeks = [];
  for (let w = 0; w < 12; w++) {
    weeks.push(allDays.slice(w * 7, w * 7 + 7));
  }

  // Month label — only show when month changes between week columns
  const monthLabels = weeks.map((week, i) => {
    const m = new Date(week[0].date).toLocaleDateString('en-IN', { month: 'short' });
    if (i === 0) return m;
    const prev = new Date(weeks[i - 1][0].date).toLocaleDateString('en-IN', { month: 'short' });
    return m !== prev ? m : '';
  });

  // Only label alternate rows to avoid clutter
  const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={styles.card}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Solve Streak</h2>
          <p style={styles.subtitle}>Daily solve activity — last 12 weeks</p>
        </div>
        <div style={styles.badges}>
          <div style={styles.badge}>
            <span style={styles.badgeNum}>{data.currentStreak}</span>
            <span style={styles.badgeLabel}>Current streak</span>
          </div>
          <div style={styles.badge}>
            <span style={styles.badgeNum}>{data.longestStreak}</span>
            <span style={styles.badgeLabel}>Longest streak</span>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div style={styles.heatmapOuter}>
        <table style={styles.table} cellSpacing={0} cellPadding={0}>
          <thead>
            <tr>
              {/* spacer cell for day-label column */}
              <td style={styles.cornerCell} />
              {weeks.map((_, wi) => (
                <td key={wi} style={styles.monthTd}>
                  {monthLabels[wi]
                    ? <span style={styles.monthSpan}>{monthLabels[wi]}</span>
                    : null}
                </td>
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_LABELS.map((label, di) => (
              <tr key={label}>
                {/* Day label — only Mon / Wed / Fri */}
                <td style={styles.dayTd}>
                  {(label === 'Mon' || label === 'Wed' || label === 'Fri') && (
                    <span style={styles.daySpan}>{label}</span>
                  )}
                </td>
                {weeks.map((week, wi) => {
                  const cell = week[di];
                  return (
                    <td key={wi} style={styles.cellTd}>
                      <div
                        title={`${cell.display}: ${cell.count} problem${cell.count !== 1 ? 's' : ''} solved`}
                        style={{
                          ...styles.cell,
                          background: getCellColor(cell.count),
                          border: `1px solid ${getCellBorder(cell.count)}`,
                        }}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Legend */}
        <div style={styles.legend}>
          <span style={styles.legendText}>Less</span>
          {[0, 1, 2, 3, 4].map(n => (
            <div
              key={n}
              title={n === 0 ? '0 problems' : n === 4 ? '4+ problems' : `${n} problem${n > 1 ? 's' : ''}`}
              style={{
                ...styles.legendCell,
                background: getCellColor(n),
                border: `1px solid ${getCellBorder(n)}`,
              }}
            />
          ))}
          <span style={styles.legendText}>More</span>
        </div>
      </div>

    </div>
  );
}

function getCellColor(count) {
  if (count === 0) return '#0f172a';
  if (count === 1) return '#1e3a8a';
  if (count === 2) return '#1d4ed8';
  if (count === 3) return '#2563eb';
  if (count === 4) return '#3b82f6';
  return '#60a5fa';
}

function getCellBorder(count) {
  if (count === 0) return '#1e293b';
  if (count === 1) return '#1e40af';
  if (count === 2) return '#2563eb';
  if (count === 3) return '#3b82f6';
  if (count === 4) return '#60a5fa';
  return '#93c5fd';
}

const styles = {
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
    gap: '12px',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '16px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
  },
  badges: {
    display: 'flex',
    gap: '12px',
  },
  badge: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '10px 20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: '80px',
  },
  badgeNum: {
    color: '#6366f1',
    fontSize: '28px',
    fontWeight: 800,
    lineHeight: 1,
  },
  badgeLabel: {
    color: '#64748b',
    fontSize: '11px',
    whiteSpace: 'nowrap',
  },
  heatmapOuter: {
    background: '#0f172a',
    borderRadius: '10px',
    padding: '16px 20px 12px',
    overflowX: 'auto',
  },
  table: {
    borderCollapse: 'separate',
    borderSpacing: '4px',
    tableLayout: 'fixed',
  },
  cornerCell: {
    width: '32px',
    padding: 0,
  },
  monthTd: {
    width: '18px',
    height: '16px',
    padding: 0,
    verticalAlign: 'bottom',
    position: 'relative',
  },
  monthSpan: {
    color: '#64748b',
    fontSize: '11px',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    position: 'absolute',
    left: 0,
    bottom: '2px',
  },
  dayTd: {
    width: '32px',
    padding: 0,
    paddingRight: '6px',
    textAlign: 'right',
    verticalAlign: 'middle',
  },
  daySpan: {
    color: '#64748b',
    fontSize: '11px',
    whiteSpace: 'nowrap',
  },
  cellTd: {
    width: '18px',
    height: '18px',
    padding: 0,
  },
  cell: {
    width: '16px',
    height: '16px',
    borderRadius: '3px',
    cursor: 'default',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    justifyContent: 'flex-end',
    marginTop: '12px',
    paddingLeft: '32px',
  },
  legendText: {
    color: '#475569',
    fontSize: '11px',
  },
  legendCell: {
    width: '13px',
    height: '13px',
    borderRadius: '2px',
    flexShrink: 0,
  },
};