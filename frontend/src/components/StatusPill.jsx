// Small helpers for rendering complaint status, priority, and SLA badges
// consistently across the app.

export function StatusPill({ status }) {
  return (
    <span className={'pill pill-status-' + status.replace(/ /g, '\\ ')}>{status}</span>
  );
}

export function PriorityPill({ priority }) {
  return <span className={'pill pill-priority-' + priority}>{priority}</span>;
}

export function SlaBreachPill({ breached }) {
  if (!breached) return null;
  return <span className="pill pill-sla-breach">SLA breached</span>;
}

export function Stars({ rating }) {
  return (
    <span className="rating-stars" title={`${rating}/5`}>
      {'★'.repeat(rating)}{'☆'.repeat(5 - rating)}
    </span>
  );
}
