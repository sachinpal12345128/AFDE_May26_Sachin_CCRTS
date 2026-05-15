import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { listComplaints, listCategories, errorMessage } from '../api.js';
import { useAuth } from '../auth.jsx';
import { StatusPill, PriorityPill, SlaBreachPill } from '../components/StatusPill.jsx';

const STATUS_OPTIONS = [
  'Open', 'Assigned', 'In Progress', 'Pending Customer Response',
  'Escalated', 'Resolved', 'Closed',
];
const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export default function Complaints() {
  const { isCustomer } = useAuth();
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    status: '', priority: '', category_id: '', search: '',
  });

  async function load() {
    try {
      setLoading(true);
      const params = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== '' && v !== null),
      );
      const [list, cats] = await Promise.all([listComplaints(params), listCategories()]);
      setItems(list);
      setCategories(cats);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [
    filters.status, filters.priority, filters.category_id,
  ]);

  function onSearchSubmit(e) { e.preventDefault(); load(); }
  function clear() {
    setFilters({ status: '', priority: '', category_id: '', search: '' });
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Complaints</h1>
          <div className="page-subtitle">
            {isCustomer ? 'Your complaints' : 'All complaints in the system'}
          </div>
        </div>
        {isCustomer && (
          <Link to="/complaints/new" className="btn btn-primary">+ New Complaint</Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <form className="toolbar" onSubmit={onSearchSubmit}>
        <input
          className="input"
          placeholder="Search subject/description…"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value })}
        />
        <button type="submit" className="btn">Search</button>
        <select className="input"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="input"
          value={filters.priority}
          onChange={(e) => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All priorities</option>
          {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select className="input"
          value={filters.category_id}
          onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
          ))}
        </select>
        <button type="button" className="btn" onClick={clear}>Clear</button>
        <span className="page-subtitle">{items.length} result{items.length === 1 ? '' : 's'}</span>
      </form>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : items.length === 0 ? (
        <div className="card empty">
          <div className="empty-title">No complaints match</div>
          <div>Try clearing filters or adjust your search.</div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Subject</th>
                <th>Customer</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Assigned to</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.complaint_id}>
                  <td><Link to={`/complaints/${c.complaint_id}`}>#{c.complaint_id}</Link></td>
                  <td>
                    <Link to={`/complaints/${c.complaint_id}`}>{c.subject}</Link>
                  </td>
                  <td>{c.customer_name}</td>
                  <td>{c.category_name}</td>
                  <td><PriorityPill priority={c.priority} /></td>
                  <td>
                    <StatusPill status={c.status} />
                    <SlaBreachPill breached={c.sla_breached} />
                  </td>
                  <td>{c.assigned_agent_name || <span style={{color:'var(--gray-500)'}}>—</span>}</td>
                  <td>{new Date(c.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
