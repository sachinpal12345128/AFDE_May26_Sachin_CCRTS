import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './auth.jsx';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Complaints from './pages/Complaints.jsx';
import ComplaintNew from './pages/ComplaintNew.jsx';
import ComplaintDetail from './pages/ComplaintDetail.jsx';
import Users from './pages/Users.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) return <div className="loading">Loading…</div>;

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <div className="app-shell">
      <Navbar />
      <main className="page">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/complaints" element={<Complaints />} />
          <Route
            path="/complaints/new"
            element={
              <ProtectedRoute allow={['Customer']}>
                <ComplaintNew />
              </ProtectedRoute>
            }
          />
          <Route path="/complaints/:id" element={<ComplaintDetail />} />
          <Route
            path="/admin/users"
            element={
              <ProtectedRoute allow={['Admin']}>
                <Users />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
