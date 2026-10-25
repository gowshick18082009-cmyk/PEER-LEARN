import { Navigate, Route, Routes, Link, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './AuthContext.jsx';
import AuthPage from './pages/AuthPage.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Find from './pages/Find.jsx';
import AiHelper from './pages/AiHelper.jsx';
import SubjectPages, { SubjectTipsPage } from './pages/SubjectPages.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) return <div className="page-shell">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div>
      <header className="topbar">
        <div className="container nav-row">
          <div className="nav-brand">
            <Link to="/">PeerLearn</Link>
          </div>
          <nav className="nav-links">
            <Link to="/" className={location.pathname === '/' ? 'active' : ''}>Dashboard</Link>
            <Link to="/subjects" className={location.pathname.startsWith('/subjects') ? 'active' : ''}>Subjects</Link>
            <Link to="/find" className={location.pathname === '/find' ? 'active' : ''}>Find</Link>
            <Link to="/ai" className={location.pathname === '/ai' ? 'active' : ''}>AI Helper</Link>
          </nav>
          <div className="nav-right">
            <span className="points-pill">{user?.points ?? 20} pts</span>
            <button className="ghost" type="button" onClick={logout}>Log out</button>
          </div>
        </div>
      </header>
      <main className={`container page-shell${location.pathname.startsWith('/subjects') ? '' : ' app-page'}`}>
        {children}
      </main>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthPage mode="login" />} />
      <Route path="/signup" element={user ? <Navigate to="/" replace /> : <AuthPage mode="signup" />} />
      <Route path="/" element={<ProtectedRoute><AppLayout><Dashboard /></AppLayout></ProtectedRoute>} />
      <Route path="/subjects" element={<ProtectedRoute><AppLayout><SubjectPages /></AppLayout></ProtectedRoute>} />
      <Route path="/subjects/:subject/tips" element={<ProtectedRoute><AppLayout><SubjectTipsPage /></AppLayout></ProtectedRoute>} />
      <Route path="/subjects/:subject" element={<ProtectedRoute><AppLayout><SubjectPages /></AppLayout></ProtectedRoute>} />
      <Route path="/find" element={<ProtectedRoute><AppLayout><Find /></AppLayout></ProtectedRoute>} />
      <Route path="/ai" element={<ProtectedRoute><AppLayout><AiHelper /></AppLayout></ProtectedRoute>} />
      <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
