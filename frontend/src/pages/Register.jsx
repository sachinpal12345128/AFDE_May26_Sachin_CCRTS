import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { register, errorMessage } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  function validate() {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!form.email.trim() || !EMAIL_RE.test(form.email)) e.email = 'Valid email required';
    if (!form.password || form.password.length < 6) e.password = 'At least 6 characters';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || null,
      });
      navigate('/');
    } catch (err) {
      setErrs({ _form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <h1>Create account</h1>
        <div className="auth-sub">Register as a Customer to file complaints</div>
        <form className="form" onSubmit={submit}>
          {errs._form && <div className="alert">{errs._form}</div>}
          <div className="form-field">
            <label>Full name</label>
            <input
              className={'input' + (errs.name ? ' input-error' : '')}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errs.name && <div className="field-error">{errs.name}</div>}
          </div>
          <div className="form-field">
            <label>Email</label>
            <input
              type="email"
              className={'input' + (errs.email ? ' input-error' : '')}
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {errs.email && <div className="field-error">{errs.email}</div>}
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Phone (optional)</label>
              <input
                className="input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password" autoComplete="new-password"
                className={'input' + (errs.password ? ' input-error' : '')}
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              {errs.password && <div className="field-error">{errs.password}</div>}
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Creating…' : 'Create account'}
          </button>
        </form>
        <div className="auth-foot">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}
