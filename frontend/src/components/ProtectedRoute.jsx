import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function ProtectedRoute({ allow, children }) {
  const { role, user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (allow && !allow.includes(role)) return <Navigate to="/" replace />;
  return children;
}
