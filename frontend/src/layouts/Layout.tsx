import { NavLink, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Badge, LoadingSpinner } from '../utils/helpers';
import { UserRole } from '../types';

const navItems: { path: string; label: string; roles: UserRole[] }[] = [
  { path: '/dashboard', label: 'Dashboard', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { path: '/customers', label: 'Customers', roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
  { path: '/products', label: 'Products', roles: ['ADMIN', 'SALES', 'WAREHOUSE', 'ACCOUNTS'] },
  { path: '/stock', label: 'Stock', roles: ['ADMIN', 'WAREHOUSE'] },
  { path: '/challans', label: 'Sales Challans', roles: ['ADMIN', 'SALES', 'ACCOUNTS'] },
];

export default function Layout() {
  const { user, loading, logout, hasRole } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <h1>Mini ERP</h1>
          <span>Operations Portal</span>
        </div>
        <nav className="sidebar-nav">
          {navItems.filter((item) => hasRole(...item.roles)).map((item) => (
            <NavLink key={item.path} to={item.path} className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="main-wrapper">
        <header className="topbar">
          <div className="topbar-user">
            <div>
              <strong>{user.name}</strong>
              <Badge status={user.role} />
            </div>
            <button className="btn btn-outline btn-sm" onClick={logout}>Logout</button>
          </div>
        </header>
        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
