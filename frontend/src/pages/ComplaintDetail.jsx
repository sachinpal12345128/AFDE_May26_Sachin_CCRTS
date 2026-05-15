import { useEffect, useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  getComplaint, listAgents, assignComplaint, updateComplaintStatus,
  submitFeedback, errorMessage,
} from '../api.js';
import { useAuth } from '../auth.jsx';
import Modal from '../components/Modal.jsx';
import { StatusPill, PriorityPill, SlaBreachPill, Stars } from '../components/StatusPill.jsx';

const ALL_STATUSES = [
  'Open', 'Assigned', 'In Progress', 'Pending Customer Response',
  'Escalated', 'Resolved', 'Closed',
];

// Which transitions each role is allowed to perform (validated server-side too).
function allowedNextStatuses(role, complaint) {
  if (!complaint) return [];
  if (role === 'Admin' || role === 'Supervisor') return ALL_STATUSES;
  if (role === 'Agent') {
    return ['In Progress', 'Pending Customer Response', 'Escalated', 'Resolved'];
  }
  if (role === 'Customer') {
    const out = [];
    if (complaint.status === 'Resolved') out.push('Closed');
    out.push('Pending Customer Response');
    return out;
  }
  return [];
}

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role, isCustomer, isStaff, isAdmin, isSupervisor, isAgent } = useAuth();

  const [c, setC] = useState(null);
  const [agents, setAgents] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // status modal
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusForm, setStatusForm] = useState({ status: '', comment: '', resolution_notes: '' });
  const [statusBusy, setStatusBusy] = useState(false);

  // assign modal
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignId, setAssignId] = useState('');
  const [assignBusy, setAssignBusy] = useState(false);

  // feedback modal
  const [fbOpen, setFbOpen] = useState(false);
  const [fbForm, setFbForm] = useState({ rating: 5, comments: '' });
  const [fbBusy, setFbBusy] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const [c2, ags] = await Promise.all([
        getComplaint(id),
        isStaff ? listAgents().catch(() => []) : Promise.resolve([]),
      ]);
      setC(c2);
      setAgents(ags);
      setError('');
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  if (loading) return <div className="loading">Loading complaint…</div>;
  if (error) return <div className="alert">{error}</div>;
  if (!c) return null;

  const nextStatuses = allowedNextStatuses(role, c).filter((s) => s !== c.status);
  const canAssign = (isAdmin || isSupervisor) && c.status !== 'Closed';
  const canChangeStatus = nextStatuses.length > 0;
  const canSubmitFeedback =
    isCustomer && c.customer_id === user.user_id &&
    (c.status === 'Resolved' || c.status === 'Closed') &&
    !c.feedback;

  async function openStatus() {
    setStatusForm({ status: nextStatuses[0] || '', comment: '', resolution_notes: c.resolution_notes || '' });
    setStatusOpen(true);
  }
  async function submitStatus(e) {
    e.preventDefault();
    if (!statusForm.status) return;
    setStatusBusy(true);
    try {
      await updateComplaintStatus(c.complaint_id, {
        status: statusForm.status,
        comment: statusForm.comment.trim() || null,
        resolution_notes: statusForm.resolution_notes?.trim() || null,
      });
      setStatusOpen(false);
      await load();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setStatusBusy(false);
    }
  }

  async function submitAssign(e) {
    e.preventDefault();
    if (!assignId) return;
    setAssignBusy(true);
    try {
      await assignComplaint(c.complaint_id, Number(assignId));
      setAssignOpen(false);
      setAssignId('');
      await load();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setAssignBusy(false);
    }
  }

  async function submitFb(e) {
    e.preventDefault();
    setFbBusy(true);
    try {
      await submitFeedback(c.complaint_id, {
        rating: Number(fbForm.rating),
        comments: fbForm.comments.trim() || null,
      });
      setFbOpen(false);
      await load();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setFbBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>
            <Link to="/complaints" style={{ color: 'var(--gray-500)' }}>← Complaints</Link>
            {' / '}
            #{c.complaint_id}
          </h1>
          <div className="page-subtitle">{c.subject}</div>
        </div>
        <div className="btn-row">
          {canAssign && (
            <button className="btn btn-accent" onClick={() => setAssignOpen(true)}>
              {c.assigned_to ? 'Reassign' : 'Assign agent'}
            </button>
          )}
          {canChangeStatus && (
            <button className="btn btn-primary" onClick={openStatus}>Update status</button>
          )}
          {canSubmitFeedback && (
            <button className="btn btn-success" onClick={() => setFbOpen(true)}>Give feedback</button>
          )}
        </div>
      </div>

      <div className="detail-grid">
        <div className="card">
          <h3>Summary</h3>
          <dl className="detail-meta">
            <dt>Status</dt>
            <dd>
              <StatusPill status={c.status} />
              <SlaBreachPill breached={c.sla_breached} />
            </dd>
            <dt>Priority</dt><dd><PriorityPill priority={c.priority} /></dd>
            <dt>Category</dt><dd>{c.category_name}</dd>
            <dt>Customer</dt><dd>{c.customer_name}</dd>
            <dt>Assigned to</dt>
            <dd>{c.assigned_agent_name || <span style={{color:'var(--gray-500)'}}>—</span>}</dd>
            <dt>SLA target</dt><dd>{c.sla_hours} hours</dd>
            <dt>Created</dt><dd>{new Date(c.created_at).toLocaleString()}</dd>
            <dt>Updated</dt><dd>{new Date(c.updated_at).toLocaleString()}</dd>
            {c.resolved_at && (<><dt>Resolved</dt><dd>{new Date(c.resolved_at).toLocaleString()}</dd></>)}
            {c.closed_at && (<><dt>Closed</dt><dd>{new Date(c.closed_at).toLocaleString()}</dd></>)}
          </dl>

          <div className="section">
            <div className="section-title">Description</div>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c.description}</div>
          </div>

          {c.resolution_notes && (
            <div className="section">
              <div className="section-title">Resolution notes</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{c.resolution_notes}</div>
            </div>
          )}

          {c.feedback && (
            <div className="section">
              <div className="section-title">Customer feedback</div>
              <div><Stars rating={c.feedback.rating} /></div>
              {c.feedback.comments && (
                <div style={{ marginTop: '0.4rem' }}>{c.feedback.comments}</div>
              )}
              <small>{new Date(c.feedback.submitted_at).toLocaleString()}</small>
            </div>
          )}
        </div>

        <div className="card">
          <h3>History</h3>
          {c.history.length === 0 ? (
            <div className="empty"><div className="empty-title">No history yet</div></div>
          ) : (
            <div className="history-list">
              {c.history.map((h) => (
                <div className="history-item" key={h.history_id}>
                  <div className="history-item-head">
                    <span>
                      {h.old_status ? (
                        <>
                          <StatusPill status={h.old_status} />{' → '}<StatusPill status={h.new_status} />
                        </>
                      ) : (
                        <StatusPill status={h.new_status} />
                      )}
                    </span>
                    <span className="history-item-meta">
                      {new Date(h.updated_at).toLocaleString()}
                    </span>
                  </div>
                  <div>{h.comment || <span style={{color:'var(--gray-500)'}}>(no comment)</span>}</div>
                  <small>by {h.updated_by_name || `user ${h.updated_by}`}</small>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Status modal */}
      <Modal open={statusOpen} title="Update status" onClose={() => setStatusOpen(false)}>
        <form className="form" onSubmit={submitStatus}>
          <div className="form-field">
            <label>New status</label>
            <select
              className="input" value={statusForm.status}
              onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
            >
              {nextStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="form-field">
            <label>Comment (optional)</label>
            <textarea
              className="input" value={statusForm.comment}
              onChange={(e) => setStatusForm({ ...statusForm, comment: e.target.value })}
              rows={3}
            />
          </div>
          {(statusForm.status === 'Resolved' || isStaff) && (
            <div className="form-field">
              <label>Resolution notes (saved on the complaint)</label>
              <textarea
                className="input" value={statusForm.resolution_notes}
                onChange={(e) => setStatusForm({ ...statusForm, resolution_notes: e.target.value })}
                rows={3}
              />
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setStatusOpen(false)} disabled={statusBusy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={statusBusy}>
              {statusBusy ? 'Updating…' : 'Update'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign modal */}
      <Modal open={assignOpen} title="Assign agent" onClose={() => setAssignOpen(false)}>
        <form className="form" onSubmit={submitAssign}>
          <div className="form-field">
            <label>Pick an agent</label>
            <select
              className="input" value={assignId}
              onChange={(e) => setAssignId(e.target.value)}
            >
              <option value="">Select…</option>
              {agents.map((a) => (
                <option key={a.user_id} value={a.user_id}>{a.name} — {a.email}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setAssignOpen(false)} disabled={assignBusy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={assignBusy || !assignId}>
              {assignBusy ? 'Assigning…' : 'Assign'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Feedback modal */}
      <Modal open={fbOpen} title="Share your feedback" onClose={() => setFbOpen(false)}>
        <form className="form" onSubmit={submitFb}>
          <div className="form-field">
            <label>Rating (1–5)</label>
            <select
              className="input" value={fbForm.rating}
              onChange={(e) => setFbForm({ ...fbForm, rating: e.target.value })}
            >
              <option value="5">5 — Excellent</option>
              <option value="4">4 — Very Good</option>
              <option value="3">3 — Good</option>
              <option value="2">2 — Fair</option>
              <option value="1">1 — Poor</option>
            </select>
          </div>
          <div className="form-field">
            <label>Comments (optional)</label>
            <textarea
              className="input" value={fbForm.comments}
              onChange={(e) => setFbForm({ ...fbForm, comments: e.target.value })}
              rows={3}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => setFbOpen(false)} disabled={fbBusy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-success" disabled={fbBusy}>
              {fbBusy ? 'Saving…' : 'Submit feedback'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}
