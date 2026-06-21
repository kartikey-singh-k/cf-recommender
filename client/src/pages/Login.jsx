import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.jsx';
import { login, register } from '../api/auth.js';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { setUser } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = isRegister
        ? await register(email, password)
        : await login(email, password);

      // Save tokens
      localStorage.setItem('accessToken', data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);

      // Update auth context
      setUser(data.user);

      // Redirect to dashboard
      navigate('/dashboard');

    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>CF Recommender</h1>
        <p style={styles.subtitle}>
          {isRegister ? 'Create your account' : 'Welcome back'}
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
            required
          />
          <input
            type="password"
            placeholder="Password (min 8 chars)"
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
            required
          />
          <button
            type="submit"
            disabled={loading}
            style={styles.button}
          >
            {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Login'}
          </button>
        </form>

        <p style={styles.toggle}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}
          {' '}
          <span
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            style={styles.link}
          >
            {isRegister ? 'Login' : 'Register'}
          </span>
        </p>
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
  },
  card: {
    background: '#1e293b',
    padding: '2.5rem',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
  },
  title: {
    color: '#f1f5f9',
    margin: '0 0 4px',
    fontSize: '24px',
    fontWeight: 700,
  },
  subtitle: {
    color: '#94a3b8',
    margin: '0 0 24px',
    fontSize: '14px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: '14px',
    outline: 'none',
  },
  button: {
    padding: '10px',
    borderRadius: '8px',
    border: 'none',
    background: '#6366f1',
    color: '#fff',
    fontSize: '14px',
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: '4px',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    background: '#450a0a',
    padding: '8px 12px',
    borderRadius: '6px',
    marginBottom: '12px',
  },
  toggle: {
    color: '#94a3b8',
    fontSize: '13px',
    textAlign: 'center',
    marginTop: '20px',
  },
  link: {
    color: '#6366f1',
    cursor: 'pointer',
    fontWeight: 500,
  },
};