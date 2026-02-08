// ============================================================================
// Main Layout Component
// ============================================================================

import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/auth.context';
import NotificationBell from './notifications/NotificationBell';
import ThemeToggle from '../context/ThemeContext';

// ============================================================================
// Navigation Items
// ============================================================================

const navigation = [
  { name: 'Dashboard', href: '/', icon: DashboardIcon },
  { name: 'Projects', href: '/projects', icon: ProjectsIcon },
  { name: 'Teams', href: '/teams', icon: TeamsIcon },
  { name: 'Settings', href: '/settings', icon: SettingsIcon },
];

// ============================================================================
// Layout Component
// ============================================================================

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Logo */}
        <div className="sidebar-header">
          <h1 className="logo">ProjectForge</h1>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href));

              return (
                <li key={item.name}>
                  <Link
                    to={item.href}
                    className={`nav-link ${isActive ? 'active' : ''}`}
                  >
                    <item.icon className="nav-icon" />
                    <span>{item.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User Section */}
        <div className="sidebar-footer">
          {user && (
            <div className="user-info">
              <div className="user-avatar">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={user.firstName} />
                ) : (
                  <span className="avatar-placeholder">
                    {user.firstName[0]}{user.lastName[0]}
                  </span>
                )}
              </div>
              <div className="user-details">
                <span className="user-name">{user.firstName} {user.lastName}</span>
                <span className="user-email">{user.email}</span>
              </div>
              <NotificationBell />
              <ThemeToggle />
              <button onClick={handleLogout} className="logout-button" title="Logout">
                <LogoutIcon />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}

// ============================================================================
// Icon Components (Inline for simplicity)
// ============================================================================

function DashboardIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  );
}

function ProjectsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 3h18v18H3zM3 9h18M9 21V9" />
    </svg>
  );
}

function TeamsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="9" cy="7" r="4" />
      <circle cx="17" cy="7" r="4" />
      <circle cx="13" cy="12" r="3" />
      <path d="M5 21v-2a4 4 0 014-4h6a4 4 0 014 4v2" />
    </svg>
  );
}

function SettingsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <polyline points="16,17 21,12 16,7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
