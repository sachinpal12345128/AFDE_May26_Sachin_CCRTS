import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const { login, errorMessage } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await login(email.trim(), password);
      navigate('/');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Sign in</h1>
        <div className="auth-sub">Customer Complaint &amp; Resolution Tracking System</div>
        <form className="form" onSubmit={submit}>
          {error && <div className="alert">{error}</div>}
          <div className="form-field">
            <label>Email</label>
            <input
              type="email" className="input" autoComplete="email" required
              value={email} onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input
              type="password" className="input" autoComplete="current-password" required
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="auth-foot">
          New customer? <Link to="/register">Create an account</Link>
        </div>
        <div className="demo-credentials">
          <b>Demo accounts</b> (all use password <code>password123</code>):<br />
          <code>admin@ccrts.example.com</code> · <code>supervisor@ccrts.example.com</code> ·{' '}
          <code>agent1@ccrts.example.com</code> · <code>customer1@ccrts.example.com</code>
        </div>
      </div>
    </div>
  );
}
