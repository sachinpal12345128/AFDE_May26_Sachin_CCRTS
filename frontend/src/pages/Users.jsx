import { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser, errorMessage } from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';

const ROLES = ['Admin', 'Supervisor', 'Agent', 'Customer'];
const EMPTY = { name: '', email: '', password: '', phone: '', role_name: 'Agent' };

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState({});

  async function load() {
    try {
      setLoading(true);
      const data = await listUsers(roleFilter || undefined);
      setUsers(data);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [roleFilter]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setErrs({});
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({
      name: u.name, email: u.email, password: '', phone: u.phone || '',
      role_name: u.role_name,
    });
    setErrs({});
    setModalOpen(true);
  }

  async function submit(e) {
    e.preventDefault();
    const v = {};
    if (!form.name.trim()) v.name = 'Required';
    if (!editing && !form.email.trim()) v.email = 'Required';
    if (!editing && (!form.password || form.password.length < 6)) v.password = 'At least 6 chars';
    setErrs(v);
    if (Object.keys(v).length) return;
    setBusy(true);
    try {
      if (editing) {
        await updateUser(editing.user_id, {
          name: form.name,
          phone: form.phone || null,
          role_name: form.role_name,
        });
      } else {
        await createUser({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone || null,
          role_name: form.role_name,
        });
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setErrs({ _form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(u) {
    if (u.user_id === me.user_id) {
      alert("You can't delete your own account.");
      return;
    }
    if (!window.confirm(`Delete user "${u.name}"?`)) return;
    try {
      await deleteUser(u.user_id);
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const filtered = users.filter((u) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return u.name.toLowerCase().includes(q) ||
           u.email.toLowerCase().includes(q) ||
           (u.phone || '').includes(q);
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Users</h1>
          <div className="page-subtitle">Admin — manage system users and their roles</div>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add User</button>
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="toolbar">
        <input
          className="input"
          placeholder="Filter by name, email or phone…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="input" value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">All roles</option>
          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <span className="page-subtitle">{filtered.length} of {users.length}</span>
      </div>

      {loading ? (
        <div className="loading">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="card empty">
          <div className="empty-title">No users match</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Phone</th><th>Created</th><th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.user_id}>
                  <td>{u.user_id}</td>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td><span className="pill pill-status-Assigned">{u.role_name}</span></td>
                  <td>{u.phone || '—'}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="btn-row">
                      <button className="btn btn-sm" onClick={() => openEdit(u)}>Edit</button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.name}` : 'Create user'}
        onClose={() => setModalOpen(false)}
      >
        <form className="form" onSubmit={submit}>
          {errs._form && <div className="alert">{errs._form}</div>}
          <div className="form-field">
            <label>Name</label>
            <input
              className={'input' + (errs.name ? ' input-error' : '')}
              value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            {errs.name && <div className="field-error">{errs.name}</div>}
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Email</label>
              <input
                type="email" disabled={!!editing}
                className={'input' + (errs.email ? ' input-error' : '')}
                value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              {errs.email && <div className="field-error">{errs.email}</div>}
            </div>
            <div className="form-field">
              <label>Role</label>
              <select
                className="input" value={form.role_name}
                onChange={(e) => setForm({ ...form, role_name: e.target.value })}
              >
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="form-field">
              <label>Phone</label>
              <input
                className="input" value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            {!editing && (
              <div className="form-field">
                <label>Password</label>
                <input
                  type="password" autoComplete="new-password"
                  className={'input' + (errs.password ? ' input-error' : '')}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                {errs.password && <div className="field-error">{errs.password}</div>}
              </div>
            )}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setModalOpen(false)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : editing ? 'Save' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
