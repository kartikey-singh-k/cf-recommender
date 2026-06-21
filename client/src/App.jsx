import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import Setup from './pages/Setup.jsx';
import Friends from './pages/Friends.jsx';
import PublicProfile from './pages/PublicProfile.jsx';

// Requires login — redirects to /login if not authenticated
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  return children;
}

// Requires login AND cf_handle linked
function DashboardRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={styles.loading}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (!user.cf_handle) return <Navigate to="/setup" />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route path="/setup" element={
        <ProtectedRoute>
          <Setup />
        </ProtectedRoute>
      } />
      <Route path="/friends" element={
          <ProtectedRoute>
            <Friends />
          </ProtectedRoute>
        } />
      <Route path="/dashboard" element={
        <DashboardRoute>
          <Dashboard />
        </DashboardRoute>
      } />
        
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/profile/:handle" element={<PublicProfile />} />
    </Routes>
  );
}

const styles = {
  loading: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0f172a',
    color: '#94a3b8',
    fontSize: '16px',
  }
};