import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Navbar() {
  const { user, role, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  const links = [
    { to: '/', label: 'Dashboard', end: true },
    { to: '/complaints', label: 'Complaints' },
  ];
  if (isAdmin) links.push({ to: '/admin/users', label: 'Users' });

  return (
    <header className="navbar">
      <div className="navbar-inner">
        <div className="brand">
          <span className="brand-icon">CC</span>
          <span>CCRTS — Complaint Tracking</span>
        </div>
        <nav className="nav-links">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.end}
              className={({ isActive }) =>
                'nav-link' + (isActive ? ' active' : '')
              }
            >
              {l.label}
            </NavLink>
          ))}
          <span className="nav-user">
            <b>{user?.name}</b>
            <span className="role-badge">{role}</span>
          </span>
          <button
            className="btn btn-sm"
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Logout
          </button>
        </nav>
      </div>
    </header>
  );
}
