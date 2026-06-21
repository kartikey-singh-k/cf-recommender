import { useState } from 'react';
import { markSolved } from '../api/queue.js';

export default function ProblemCard({ problem, onSolved }) {
  const [solved, setSolved] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSolved() {
    if (solved || loading) return;
    setLoading(true);
    try {
      await markSolved(problem.id);
      setSolved(true);
      onSolved?.();
    } catch (err) {
      console.error('Mark solved failed:', err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      ...styles.card,
      opacity: solved ? 0.6 : 1,
      borderColor: solved ? '#22c55e' : '#334155'
    }}>

      <div style={styles.topRow}>
        <span style={{
          ...styles.ratingBadge,
          background: getRatingColor(problem.rating)
        }}>
          {problem.rating}
        </span>
        {solved && (
          <span style={styles.solvedBadge}>Solved</span>
        )}
      </div>

      <a
        href={problem.url}
        target="_blank"
        rel="noreferrer"
        style={styles.problemName}
      >
        {problem.name}
      </a>

      <p style={styles.reason}>{problem.reason}</p>

      <div style={styles.tags}>
        {problem.tags.slice(0, 4).map(tag => (
          <span key={tag} style={styles.tag}>{tag}</span>
        ))}
        {problem.tags.length > 4 && (
          <span style={styles.tag}>+{problem.tags.length - 4}</span>
        )}
      </div>

      <div style={styles.actions}>
        <a
          href={problem.url}
          target="_blank"
          rel="noreferrer"
          style={styles.solveBtn}
        >
          Solve on CF
        </a>
        <button
          onClick={handleSolved}
          disabled={solved || loading}
          style={{
            ...styles.markBtn,
            opacity: solved ? 0.5 : 1,
            cursor: solved ? 'default' : 'pointer'
          }}
        >
          {loading ? '...' : solved ? 'Marked' : 'Mark Solved'}
        </button>
      </div>

    </div>
  );
}

function getRatingColor(rating) {
  if (!rating) return '#475569';
  if (rating < 1200) return '#64748b';
  if (rating < 1400) return '#16a34a';
  if (rating < 1600) return '#0891b2';
  if (rating < 1900) return '#2563eb';
  if (rating < 2100) return '#7c3aed';
  if (rating < 2400) return '#f59e0b';
  return '#ef4444';
}

const styles = {
  card: {
    background: '#1e293b',
    border: '1px solid #334155',
    borderRadius: '12px',
    padding: '1.25rem',
    transition: 'border-color 0.2s, opacity 0.2s',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  topRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ratingBadge: {
    fontSize: '12px',
    fontWeight: 700,
    padding: '3px 10px',
    borderRadius: '20px',
    color: '#fff',
  },
  solvedBadge: {
    fontSize: '12px',
    color: '#22c55e',
    fontWeight: 600,
  },
  problemName: {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: 600,
    textDecoration: 'none',
    lineHeight: 1.4,
  },
  reason: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
    fontStyle: 'italic',
  },
  tags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '5px',
  },
  tag: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '20px',
    background: '#0f172a',
    color: '#94a3b8',
    border: '1px solid #1e3a5f',
  },
  actions: {
    display: 'flex',
    gap: '8px',
    marginTop: '4px',
  },
  solveBtn: {
    flex: 1,
    padding: '7px',
    borderRadius: '8px',
    background: '#6366f1',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
    textAlign: 'center',
  },
  markBtn: {
    flex: 1,
    padding: '7px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
};