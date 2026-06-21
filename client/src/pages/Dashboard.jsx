import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import DailyQueue from '../components/DailyQueue.jsx';
import StreakWidget from '../components/StreakWidget.jsx';
import TagHeatmap from '../components/TagHeatmap.jsx';
import ComfortZoneChart from '../components/ComfortZoneChart.jsx';
import OverviewCards from '../components/OverviewCards.jsx';
import { getOverview } from '../api/analytics.js';
import { useEffect } from 'react';
import WeaknessReport from '../components/WeaknessReport.jsx';
import PracticePlan from '../components/PracticePlan.jsx';
import { syncSubmissions } from '../api/user.js';
import RatingHistory from '../components/RatingHistory.jsx';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [overview, setOverview] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    getOverview()
      .then(d => setOverview(d.overview))
      .catch(console.error);
  }, [refreshKey]);

  // Called when user marks a problem solved
  // Refreshes overview stats
  const handleSolve = useCallback(() => {
    setRefreshKey(k => k + 1);
  }, []);

  function handleLogout() {
    logout();
    navigate('/login');
  }
// Add this state inside Dashboard component
const [syncing, setSyncing] = useState(false);
const [syncMsg, setSyncMsg] = useState('');

async function handleSync() {
  setSyncing(true);
  setSyncMsg('');
  try {
    await syncSubmissions();
    setSyncMsg('Sync started — refresh in 30 seconds');
    // Auto-refresh stats after 30 seconds
    setTimeout(() => {
      setRefreshKey(k => k + 1);
      setSyncMsg('');
    }, 30000);
  } catch (err) {
    setSyncMsg('Sync failed');
  } finally {
    setSyncing(false);
  }
}

  return (
    <div style={styles.root}>

      {/* Navbar */}
     <nav style={styles.nav}>
      <span style={styles.navBrand}>CF Recommender</span>
      <div style={styles.navRight}>
        {syncMsg && <span style={styles.syncMsg}>{syncMsg}</span>}
        <button
          onClick={handleSync}
          disabled={syncing}
          style={styles.syncBtn}
        >
          {syncing ? 'Syncing...' : 'Sync CF'}
        </button>
        <a href="/friends" style={styles.navLink}>Friends</a>
        <a href={`/profile/${user?.cf_handle}`} style={styles.navLink}>
          My Profile
        </a>
        <span style={styles.navHandle}>{user?.cf_handle}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
      
      {/* Main content */}
      <main style={styles.main}>

      {/* Overview stats */}
      <OverviewCards data={overview} />

      {/* Streak */}
      <StreakWidget key={refreshKey} />

      {/* AI Section */}        {/* ← ADD HERE */}
      <WeaknessReport />
      <PracticePlan />

      {/* Daily Queue */}
      <DailyQueue onSolve={handleSolve} />

      {/* Charts side by side */}
      <div style={styles.chartsGrid}>
        <TagHeatmap />
        <ComfortZoneChart />
      </div>
      <div style={{ marginTop: '1rem' }}>
          <RatingHistory />
        </div>
    </main>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    background: '#0f172a',
  },
  nav: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '1rem 2rem',
    borderBottom: '1px solid #1e293b',
    background: '#0f172a',
    position: 'sticky',
    top: 0,
    zIndex: 10,
  },
  navBrand: {
    color: '#6366f1',
    fontWeight: 700,
    fontSize: '16px',
    letterSpacing: '0.5px',
  },
  navRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  navHandle: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  logoutBtn: {
    padding: '6px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: 'transparent',
    color: '#94a3b8',
    fontSize: '13px',
    cursor: 'pointer',
  },
  main: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '2rem',
  },
  chartsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  navLink: {
  color: '#94a3b8',
  fontSize: '14px',
  textDecoration: 'none',
},
syncBtn: {
  padding: '6px 14px',
  borderRadius: '8px',
  border: '1px solid #6366f1',
  background: 'transparent',
  color: '#6366f1',
  fontSize: '13px',
  cursor: 'pointer',
  fontWeight: 500,
},
syncMsg: {
  color: '#94a3b8',
  fontSize: '12px',
},
};
