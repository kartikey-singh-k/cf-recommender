import { useState, useEffect, useCallback } from 'react';
import { getTodaysQueue, regenerateQueue } from '../api/queue.js';
import ProblemCard from './ProblemCard.jsx';

export default function DailyQueue({ onSolve }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState('');
  const [regenError, setRegenError] = useState('');

  const fetchQueue = useCallback(async () => {
    try {
      setError('');
      const data = await getTodaysQueue();
      setQueue(data.problems);
    } catch (err) {
      setError('Failed to load queue. Make sure your submissions are synced.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleRegenerate() {
    setRegenerating(true);
    setRegenError('');
    try {
      const data = await regenerateQueue();
      setQueue(data.problems);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to regenerate';
      setRegenError(msg); // shows rate limit message
    } finally {
      setRegenerating(false);
    }
  }

  if (loading) return (
    <div style={styles.section}>
      <div style={styles.loadingText}>Loading your daily queue...</div>
    </div>
  );

  return (
    <div style={styles.section}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>Today's Problems</h2>
          <p style={styles.subtitle}>
            {new Date().toLocaleDateString('en-IN', {
              weekday: 'long', month: 'long', day: 'numeric'
            })}
          </p>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={styles.regenBtn}
        >
          {regenerating ? 'Regenerating...' : 'Regenerate'}
        </button>
      </div>

      {/* Rate limit error */}
      {regenError && (
        <p style={styles.regenError}>{regenError}</p>
      )}

      {/* Error state */}
      {error && (
        <div style={styles.errorBox}>
          <p style={{ margin: 0, color: '#f87171' }}>{error}</p>
        </div>
      )}

      {/* Empty state */}
      {!error && queue.length === 0 && (
        <div style={styles.emptyBox}>
          <p style={{ margin: 0, color: '#64748b' }}>
            No problems generated yet. Make sure your CF handle is linked and submissions are synced.
          </p>
        </div>
      )}

      {/* Problem grid */}
      <div style={styles.grid}>
        {queue.map((problem, idx) => (
          <ProblemCard
            key={problem.id + idx}
            problem={problem}
            onSolved={onSolve}
          />
        ))}
      </div>

    </div>
  );
}

const styles = {
  section: {
    marginBottom: '2rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '18px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  subtitle: {
    color: '#64748b',
    fontSize: '13px',
    margin: 0,
  },
  regenBtn: {
    padding: '7px 16px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  regenError: {
    color: '#f59e0b',
    fontSize: '13px',
    margin: '0 0 1rem',
    padding: '8px 12px',
    background: '#1c1100',
    borderRadius: '8px',
  },
  errorBox: {
    padding: '1rem',
    background: '#1e0a0a',
    borderRadius: '8px',
    marginBottom: '1rem',
  },
  emptyBox: {
    padding: '2rem',
    background: '#1e293b',
    borderRadius: '8px',
    textAlign: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
    padding: '2rem 0',
  },
};