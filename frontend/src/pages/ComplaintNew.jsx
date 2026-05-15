import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createComplaint, listCategories, errorMessage } from '../api.js';

const PRIORITY_OPTIONS = ['Low', 'Medium', 'High', 'Critical'];

export default function ComplaintNew() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState({
    category_id: '', subject: '', description: '', priority: 'Medium',
  });
  const [errs, setErrs] = useState({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  function validate() {
    const e = {};
    if (!form.category_id) e.category_id = 'Pick a category';
    if (!form.subject.trim() || form.subject.length < 3) e.subject = 'At least 3 characters';
    if (!form.description.trim() || form.description.length < 5) e.description = 'Please describe the issue';
    setErrs(e);
    return Object.keys(e).length === 0;
  }

  async function submit(e) {
    e.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      const created = await createComplaint({
        category_id: Number(form.category_id),
        subject: form.subject.trim(),
        description: form.description.trim(),
        priority: form.priority,
      });
      navigate(`/complaints/${created.complaint_id}`);
    } catch (err) {
      setErrs({ _form: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1>File a complaint</h1>
          <div className="page-subtitle">Provide as much detail as you can — it helps us resolve faster.</div>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 720 }}>
        <form className="form" onSubmit={submit}>
          {errs._form && <div className="alert">{errs._form}</div>}
          <div className="form-row">
            <div className="form-field">
              <label>Category</label>
              <select
                className={'input' + (errs.category_id ? ' input-error' : '')}
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">Select category…</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>{c.category_name}</option>
                ))}
              </select>
              {errs.category_id && <div className="field-error">{errs.category_id}</div>}
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select
                className="input" value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
              >
                {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <small>
                SLA: Low 72h, Medium 48h, High 24h, Critical 4h
              </small>
            </div>
          </div>
          <div className="form-field">
            <label>Subject</label>
            <input
              className={'input' + (errs.subject ? ' input-error' : '')}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Short summary"
            />
            {errs.subject && <div className="field-error">{errs.subject}</div>}
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              className={'input' + (errs.description ? ' input-error' : '')}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={6}
              placeholder="What happened, when, what you've tried…"
            />
            {errs.description && <div className="field-error">{errs.description}</div>}
          </div>
          <div className="modal-actions">
            <button type="button" className="btn" onClick={() => navigate(-1)} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Submitting…' : 'Submit complaint'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
