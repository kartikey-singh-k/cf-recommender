import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { linkHandle } from '../api/user.js';
import { getMe } from '../api/auth.js';

export default function Setup() {
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');

  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setStatus('validating');

    try {
      await linkHandle(handle.trim());
      setStatus('syncing');
      const data = await getMe();
      setUser(data.user);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
      setStatus('error');
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>

        <div style={styles.header}>
          <div style={styles.icon}>⚡</div>
          <h1 style={styles.title}>Link your Codeforces handle</h1>
          <p style={styles.subtitle}>
            We will pull your submission history to generate personalized recommendations.
          </p>
        </div>

        {status !== 'syncing' && (
          <form onSubmit={handleSubmit} style={styles.form}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Your Codeforces handle</label>
              <input
                type="text"
                placeholder="e.g. tourist"
                value={handle}
                onChange={e => setHandle(e.target.value)}
                style={styles.input}
                disabled={status === 'validating'}
                required
              />
              <p style={styles.hint}>
                Find your handle at codeforces.com
              </p>
            </div>

            {error && <p style={styles.error}>{error}</p>}

            <button
              type="submit"
              disabled={status === 'validating' || !handle.trim()}
              style={{
                ...styles.button,
                opacity: status === 'validating' ? 0.7 : 1
              }}
            >
              {status === 'validating' ? 'Validating...' : 'Link Handle'}
            </button>
          </form>
        )}

        {status === 'syncing' && (
          <div style={styles.syncingBox}>
            <p style={styles.syncingTitle}>Syncing your submissions...</p>
            <p style={styles.syncingDesc}>
              Pulling your Codeforces history in the background.
              Takes 10 to 30 seconds depending on your submission count.
            </p>
            <p style={styles.syncingNote}>Taking you to your dashboard now...</p>
          </div>
        )}

        {status === 'idle' && (
          <div style={styles.infoBox}>
            <p style={styles.infoTitle}>What we will compute for you</p>
            <ul style={styles.infoList}>
              <li>Per-tag success rate across all your submissions</li>
              <li>Your comfort zone rating range</li>
              <li>Daily personalized problem queue</li>
              <li>Weakness report powered by AI</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    padding: '1rem',
  },
  card: {
    background: '#1e293b',
    padding: '2.5rem',
    borderRadius: '16px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 32px rgba(0,0,0,0.4)',
  },
  header: {
    textAlign: 'center',
    marginBottom: '2rem',
  },
  icon: {
    fontSize: '2.5rem',
    marginBottom: '0.75rem',
  },
  title: {
    color: '#f1f5f9',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 8px',
  },
  subtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    lineHeight: 1.6,
    margin: 0,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  inputGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    color: '#cbd5e1',
    fontSize: '13px',
    fontWeight: 500,
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '15px',
    outline: 'none',
  },
  hint: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
  },
  button: {
    padding: '11px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    background: '#450a0a',
    padding: '8px 12px',
    borderRadius: '6px',
    margin: 0,
  },
  syncingBox: {
    textAlign: 'center',
    padding: '1rem 0',
  },
  syncingTitle: {
    color: '#f1f5f9',
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  syncingDesc: {
    color: '#94a3b8',
    fontSize: '13px',
    lineHeight: 1.6,
    margin: '0 0 12px',
  },
  syncingNote: {
    color: '#6366f1',
    fontSize: '13px',
    margin: 0,
  },
  infoBox: {
    marginTop: '1.5rem',
    padding: '1rem',
    background: '#0f172a',
    borderRadius: '8px',
    border: '1px solid #1e3a5f',
  },
  infoTitle: {
    color: '#93c5fd',
    fontSize: '13px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  infoList: {
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.8,
    margin: 0,
    paddingLeft: '16px',
  },
};