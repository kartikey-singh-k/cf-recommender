import { useState, useEffect } from 'react';
import { getFriends, addFriend, removeFriend, compareWithFriend } from '../api/friends.js';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [handle, setHandle] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [comparison, setComparison] = useState(null);
  const [comparing, setComparing] = useState(null);

  useEffect(() => {
    getFriends()
      .then(d => setFriends(d.friends))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!handle.trim()) return;
    setAdding(true);
    setError('');
    try {
      const data = await addFriend(handle.trim());
      setFriends(prev => [...prev, data.friend]);
      setHandle('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add friend');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(friendId) {
    try {
      await removeFriend(friendId);
      setFriends(prev => prev.filter(f => f.id !== friendId));
      if (comparison?.friend?.id === friendId) setComparison(null);
    } catch (err) {
      console.error(err);
    }
  }

  async function handleCompare(friendId) {
    setComparing(friendId);
    try {
      const data = await compareWithFriend(friendId);
      setComparison(data);
    } catch (err) {
      console.error(err);
    } finally {
      setComparing(null);
    }
  }

  return (
    <div style={styles.root}>
      <div style={styles.container}>
        <h1 style={styles.pageTitle}>Friends</h1>
        <p style={styles.pageSub}>Compare weak tags and track each other's progress</p>

        {/* Add friend form */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Add a friend</h2>
          <p style={styles.cardSub}>They need to have a CF Recommender account</p>
          <form onSubmit={handleAdd} style={styles.form}>
            <input
              type="text"
              placeholder="Their Codeforces handle"
              value={handle}
              onChange={e => setHandle(e.target.value)}
              style={styles.input}
              disabled={adding}
            />
            <button
              type="submit"
              disabled={adding || !handle.trim()}
              style={styles.addBtn}
            >
              {adding ? 'Adding...' : 'Add Friend'}
            </button>
          </form>
          {error && <p style={styles.error}>{error}</p>}
        </div>

        {/* Friends list */}
        <div style={styles.card}>
          <h2 style={styles.cardTitle}>Your friends ({friends.length})</h2>

          {loading && <p style={styles.empty}>Loading...</p>}

          {!loading && friends.length === 0 && (
            <p style={styles.empty}>
              No friends yet. Add your CP group members to compare progress.
            </p>
          )}

          <div style={styles.friendsList}>
            {friends.map(friend => (
              <div key={friend.id} style={styles.friendCard}>
                <div style={styles.friendInfo}>
                  <p style={styles.friendHandle}>{friend.cf_handle}</p>
                  <div style={styles.friendStats}>
                    <span style={styles.statChip}>
                      Rating: {friend.comfort_zone_rating}
                    </span>
                    <span style={styles.statChip}>
                      Streak: {friend.current_streak}d
                    </span>
                  </div>
                  {/* Weak tags */}
                  {friend.weak_tags && friend.weak_tags.length > 0 && (
                    <div style={styles.weakTags}>
                      <span style={styles.weakLabel}>Weak: </span>
                      {friend.weak_tags.map(t => (
                        <span key={t.tag} style={styles.weakTag}>
                          {t.tag} ({Math.round(t.success_rate * 100)}%)
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={styles.friendActions}>
                  <button
                    onClick={() => handleCompare(friend.id)}
                    disabled={comparing === friend.id}
                    style={styles.compareBtn}
                  >
                    {comparing === friend.id ? '...' : 'Compare'}
                  </button>
                  <button
                    onClick={() => handleRemove(friend.id)}
                    style={styles.removeBtn}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Tag comparison */}
        {comparison && (
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>
              You vs {comparison.friend.cf_handle}
            </h2>
            <p style={styles.cardSub}>
              Common tags you have both attempted (sorted: your weakest first)
            </p>

            {comparison.commonTags.length === 0 && (
              <p style={styles.empty}>
                No common tags yet. Solve more problems to find overlapping tags.
              </p>
            )}

            <div style={styles.comparisonList}>
              {comparison.commonTags.map(item => {
                const myPct = Math.round(item.mine.success_rate * 100);
                const theirPct = Math.round(item.theirs.success_rate * 100);
                const iWin = myPct >= theirPct;

                return (
                  <div key={item.tag} style={styles.compRow}>
                    <div style={styles.compTag}>{item.tag}</div>

                    <div style={styles.compBars}>
                      {/* My bar */}
                      <div style={styles.barRow}>
                        <span style={styles.barLabel}>You</span>
                        <div style={styles.barBg}>
                          <div style={{
                            ...styles.barFill,
                            width: `${myPct}%`,
                            background: iWin ? '#22c55e' : '#ef4444'
                          }} />
                        </div>
                        <span style={{
                          ...styles.barPct,
                          color: iWin ? '#22c55e' : '#ef4444'
                        }}>{myPct}%</span>
                      </div>

                      {/* Friend bar */}
                      <div style={styles.barRow}>
                        <span style={styles.barLabel}>
                          {comparison.friend.cf_handle.slice(0, 8)}
                        </span>
                        <div style={styles.barBg}>
                          <div style={{
                            ...styles.barFill,
                            width: `${theirPct}%`,
                            background: !iWin ? '#22c55e' : '#64748b'
                          }} />
                        </div>
                        <span style={{
                          ...styles.barPct,
                          color: !iWin ? '#22c55e' : '#64748b'
                        }}>{theirPct}%</span>
                      </div>
                    </div>

                    <div style={{
                      ...styles.compResult,
                      color: iWin ? '#22c55e' : '#f87171'
                    }}>
                      {iWin ? '+' : ''}{myPct - theirPct}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
    padding: '2rem',
  },
  container: {
    maxWidth: '800px',
    margin: '0 auto',
  },
  pageTitle: {
    color: '#f1f5f9',
    fontSize: '24px',
    fontWeight: 700,
    margin: '0 0 4px',
  },
  pageSub: {
    color: '#64748b',
    fontSize: '14px',
    margin: '0 0 1.5rem',
  },
  card: {
    background: '#1e293b',
    borderRadius: '12px',
    padding: '1.25rem',
    marginBottom: '1rem',
  },
  cardTitle: {
    color: '#f1f5f9',
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 4px',
  },
  cardSub: {
    color: '#64748b',
    fontSize: '12px',
    margin: '0 0 1rem',
  },
  form: {
    display: 'flex',
    gap: '8px',
  },
  input: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
  },
  addBtn: {
    padding: '8px 18px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    margin: '8px 0 0',
  },
  empty: {
    color: '#64748b',
    fontSize: '13px',
    margin: 0,
    fontStyle: 'italic',
  },
  friendsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  friendCard: {
    background: '#0f172a',
    borderRadius: '8px',
    padding: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '12px',
  },
  friendInfo: {
    flex: 1,
  },
  friendHandle: {
    color: '#f1f5f9',
    fontSize: '14px',
    fontWeight: 600,
    margin: '0 0 6px',
  },
  friendStats: {
    display: 'flex',
    gap: '6px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  statChip: {
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '20px',
    background: '#1e293b',
    color: '#94a3b8',
    border: '1px solid #334155',
  },
  weakTags: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    alignItems: 'center',
  },
  weakLabel: {
    color: '#64748b',
    fontSize: '11px',
  },
  weakTag: {
    fontSize: '11px',
    padding: '1px 6px',
    borderRadius: '20px',
    background: '#450a0a',
    color: '#f87171',
    border: '1px solid #7f1d1d',
  },
  friendActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  compareBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '12px',
    cursor: 'pointer',
  },
  removeBtn: {
    padding: '6px 12px',
    borderRadius: '6px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#64748b',
    fontSize: '12px',
    cursor: 'pointer',
  },
  comparisonList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  compRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  compTag: {
    color: '#94a3b8',
    fontSize: '12px',
    width: '100px',
    flexShrink: 0,
  },
  compBars: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  barRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  barLabel: {
    color: '#64748b',
    fontSize: '11px',
    width: '60px',
    flexShrink: 0,
    textAlign: 'right',
  },
  barBg: {
    flex: 1,
    height: '8px',
    background: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  barPct: {
    fontSize: '11px',
    fontWeight: 600,
    width: '32px',
    flexShrink: 0,
  },
  compResult: {
    fontSize: '12px',
    fontWeight: 700,
    width: '36px',
    flexShrink: 0,
    textAlign: 'right',
  },
};