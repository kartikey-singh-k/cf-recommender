import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export default function PublicProfile() {
  const { handle } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get(`${API_URL}/api/user/public/${handle}`)
      .then(r => setProfile(r.data))
      .catch(() => setError('Profile not found'))
      .finally(() => setLoading(false));
  }, [handle]);

  if (loading) return (
    <div style={styles.center}>
      <p style={styles.loadingText}>Loading profile...</p>
    </div>
  );

  if (error) return (
    <div style={styles.center}>
      <p style={styles.errorText}>{error}</p>
      <p style={styles.errorSub}>
        This handle hasn't signed up on CF Recommender yet.
      </p>
    </div>
  );

  return (
    <div style={styles.root}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div style={styles.avatar}>
            {profile.handle.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={styles.handle}>{profile.handle}</h1>
            <p style={styles.sub}>CF Recommender Profile</p>
          </div>
          <a
            href="/"
            style={styles.signupBtn}
          >
            Get your profile
          </a>
        </div>

        {/* Stats row */}
        <div style={styles.statsGrid}>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{profile.stats.problems_solved || 0}</p>
            <p style={styles.statLabel}>Problems Solved</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{profile.comfortZone}</p>
            <p style={styles.statLabel}>Comfort Zone</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{profile.stats.hardest_solved || 'N/A'}</p>
            <p style={styles.statLabel}>Hardest Solved</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{profile.currentStreak}d</p>
            <p style={styles.statLabel}>Current Streak</p>
          </div>
          <div style={styles.statCard}>
            <p style={styles.statValue}>{profile.stats.success_rate || 0}%</p>
            <p style={styles.statLabel}>Success Rate</p>
          </div>
        </div>

        <div style={styles.tagsGrid}>
          {/* Weak tags */}
          <div style={styles.tagsCard}>
            <h2 style={styles.tagsTitle}>Working On</h2>
            <p style={styles.tagsSub}>Tags with lowest success rate</p>
            <div style={styles.tagsList}>
              {profile.weakTags.map(t => (
                <div key={t.tag} style={styles.tagRow}>
                  <span style={styles.tagName}>{t.tag}</span>
                  <div style={styles.tagBarBg}>
                    <div style={{
                      ...styles.tagBarFill,
                      width: `${Math.round(t.success_rate * 100)}%`,
                      background: '#ef4444'
                    }} />
                  </div>
                  <span style={styles.tagPct}>
                    {Math.round(t.success_rate * 100)}%
                  </span>
                </div>
              ))}
              {profile.weakTags.length === 0 && (
                <p style={styles.noData}>Not enough data yet</p>
              )}
            </div>
          </div>

          {/* Strong tags */}
          <div style={styles.tagsCard}>
            <h2 style={styles.tagsTitle}>Strongest At</h2>
            <p style={styles.tagsSub}>Tags with highest success rate</p>
            <div style={styles.tagsList}>
              {profile.strongTags.map(t => (
                <div key={t.tag} style={styles.tagRow}>
                  <span style={styles.tagName}>{t.tag}</span>
                  <div style={styles.tagBarBg}>
                    <div style={{
                      ...styles.tagBarFill,
                      width: `${Math.round(t.success_rate * 100)}%`,
                      background: '#22c55e'
                    }} />
                  </div>
                  <span style={styles.tagPct}>
                    {Math.round(t.success_rate * 100)}%
                  </span>
                </div>
              ))}
              {profile.strongTags.length === 0 && (
                <p style={styles.noData}>Not enough data yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Share section */}
        <div style={styles.shareCard}>
          <p style={styles.shareText}>
            Share your profile:
            <span style={styles.shareUrl}>
              {window.location.origin}/profile/{profile.handle}
            </span>
          </p>
          <button
            onClick={() => {
              navigator.clipboard.writeText(
                `${window.location.origin}/profile/${profile.handle}`
              );
            }}
            style={styles.copyBtn}
          >
            Copy Link
          </button>
        </div>

        {/* Footer CTA */}
        <div style={styles.footer}>
          <p style={styles.footerText}>
            Get personalized CP problem recommendations
          </p>
          <a href="/" style={styles.footerBtn}>
            Try CF Recommender
          </a>
        </div>

      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
    padding: '2rem 1rem',
  },
  container: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
  },
  loadingText: {
    color: '#64748b',
    fontSize: '14px',
  },
  errorText: {
    color: '#f87171',
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 8px',
  },
  errorSub: {
    color: '#64748b',
    fontSize: '14px',
    margin: 0,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '1.5rem',
    flexWrap: 'wrap',
  },
  avatar: {
    width: '52px',
    height: '52px',
    borderRadius: '50%',
    background: '#6366f1',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '22px',
    fontWeight: 700,
    flexShrink: 0,
  },
  handle: {
    color: '#f1f5f9',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 2px',
  },
  sub: {
    color: '#64748b',
    fontSize: '12px',
    margin: 0,
  },
  signupBtn: {
    marginLeft: 'auto',
    padding: '8px 16px',
    borderRadius: '8px',
    background: '#6366f1',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    textDecoration: 'none',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: '10px',
    marginBottom: '1rem',
  },
  statCard: {
    background: '#1e293b',
    borderRadius: '10px',
    padding: '1rem',
    textAlign: 'center',
  },
  statValue: {
    color: '#6366f1',
    fontSize: '22px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  statLabel: {
    color: '#64748b',
    fontSize: '11px',
    margin: 0,
  },
  tagsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: '10px',
    marginBottom: '1rem',
  },
  tagsCard: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
  },
  tagsTitle: {
    color: '#f1f5f9',
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 2px',
  },
  tagsSub: {
    color: '#64748b',
    fontSize: '11px',
    margin: '0 0 12px',
  },
  tagsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  tagRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  tagName: {
    color: '#94a3b8',
    fontSize: '12px',
    width: '80px',
    flexShrink: 0,
  },
  tagBarBg: {
    flex: 1,
    height: '6px',
    background: '#0f172a',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  tagBarFill: {
    height: '100%',
    borderRadius: '3px',
  },
  tagPct: {
    color: '#64748b',
    fontSize: '11px',
    width: '32px',
    textAlign: 'right',
    flexShrink: 0,
  },
  noData: {
    color: '#475569',
    fontSize: '12px',
    margin: 0,
    fontStyle: 'italic',
  },
  shareCard: {
    background: '#1e293b',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '12px',
    marginBottom: '1rem',
    flexWrap: 'wrap',
  },
  shareText: {
    color: '#94a3b8',
    fontSize: '13px',
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  shareUrl: {
    color: '#6366f1',
    fontSize: '12px',
    fontFamily: 'monospace',
  },
  copyBtn: {
    padding: '7px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#334155',
    color: '#f1f5f9',
    fontSize: '13px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  footer: {
    textAlign: 'center',
    padding: '1.5rem',
  },
  footerText: {
    color: '#64748b',
    fontSize: '13px',
    margin: '0 0 12px',
  },
  footerBtn: {
    padding: '10px 24px',
    borderRadius: '8px',
    background: '#6366f1',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    textDecoration: 'none',
  },
};