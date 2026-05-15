import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { dashboardStats, listComplaints, errorMessage } from '../api.js';
import { useAuth } from '../auth.jsx';
import { StatusPill, PriorityPill, SlaBreachPill } from '../components/StatusPill.jsx';

export default function Dashboard() {
  const { user, role, isCustomer, isStaff } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        const [s, list] = await Promise.all([dashboardStats(), listComplaints()]);
        if (cancelled) return;
        setStats(s);
        setRecent(list.slice(0, 6));
      } catch (e) {
        if (!cancelled) setError(errorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Welcome, {user?.name?.split(' ')[0]}</h1>
          <div className="page-subtitle">
            Signed in as <b>{role}</b>
            {' — '}
            {isCustomer ? 'view and file your complaints' :
              isStaff ? 'monitor and resolve customer complaints' : ''}
          </div>
        </div>
        {isCustomer && (
          <Link to="/complaints/new" className="btn btn-primary">+ New Complaint</Link>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      {loading ? (
        <div className="loading">Loading dashboard…</div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total" value={stats?.total_complaints ?? 0} accent="blue" />
            <StatCard label="Open / Assigned" value={stats?.open_complaints ?? 0} accent="red" />
            <StatCard label="In Progress" value={stats?.in_progress ?? 0} accent="amber" />
            <StatCard label="Resolved" value={stats?.resolved ?? 0} accent="green" />
            <StatCard label="Closed" value={stats?.closed ?? 0} accent="info" />
            <StatCard label="Escalated" value={stats?.escalated ?? 0} accent="red" />
            <StatCard label="SLA Breached" value={stats?.sla_breached ?? 0} accent="red" />
            <StatCard
              label="Avg resolution (h)"
              value={stats?.avg_resolution_hours != null ? stats.avg_resolution_hours : '—'}
              accent="info"
            />
            {isStaff && (
              <>
                <StatCard label="Customers" value={stats?.total_customers ?? 0} accent="blue" />
                <StatCard label="Agents" value={stats?.total_agents ?? 0} accent="blue" />
              </>
            )}
          </div>

          <div className="card">
            <h2>Recent complaints</h2>
            {recent.length === 0 ? (
              <div className="empty">
                <div className="empty-title">No complaints yet</div>
                {isCustomer && <div>File one with the button above.</div>}
              </div>
            ) : (
              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((c) => (
                      <tr key={c.complaint_id}>
                        <td><Link to={`/complaints/${c.complaint_id}`}>#{c.complaint_id}</Link></td>
                        <td>{c.subject}</td>
                        <td>{c.category_name}</td>
                        <td><PriorityPill priority={c.priority} /></td>
                        <td>
                          <StatusPill status={c.status} />
                          <SlaBreachPill breached={c.sla_breached} />
                        </td>
                        <td>{new Date(c.updated_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}

function StatCard({ label, value, accent }) {
  return (
    <div className={`stat-card stat-accent-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
    </div>
  );
}
