import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Trophy,
  Users,
  Calendar,
  ClipboardCheck,
  BookOpen,
  Bell,
  FileText,
  Shield,
  Settings,
  User,
  LogOut,
  UsersRound
} from 'lucide-react';

const Sidebar = ({ isOpen, toggleSidebar }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'viewer'] },
    { path: '/participant-dashboard', label: 'My Dashboard', icon: LayoutDashboard, roles: ['participant'] },
    { path: '/visitor-dashboard', label: 'My Dashboard', icon: LayoutDashboard, roles: ['visitor'] },
    { path: '/tournaments', label: 'Tournaments', icon: Calendar, roles: ['super_admin', 'admin', 'viewer', 'visitor'] },
    { path: '/participants', label: 'Participants', icon: Users, roles: ['super_admin', 'admin', 'viewer'] },
    { path: '/teams', label: 'Teams', icon: UsersRound, roles: ['super_admin', 'admin', 'viewer', 'visitor'] },
    { path: '/attendance', label: 'Attendance', icon: ClipboardCheck, roles: ['super_admin', 'admin', 'viewer'] },
    { path: '/leaderboard', label: 'Leaderboard', icon: Trophy, roles: ['super_admin', 'admin', 'viewer', 'visitor'] },
    { path: '/rules', label: 'Rules & Regulations', icon: BookOpen, roles: ['super_admin', 'admin', 'viewer', 'visitor'] },
    { path: '/announcements', label: 'Announcements', icon: Bell, roles: ['super_admin', 'admin', 'viewer', 'visitor'] },
    { path: '/reports', label: 'Reports', icon: FileText, roles: ['super_admin', 'admin', 'viewer'] },
    { path: '/committee', label: 'Committee Members', icon: Shield, roles: ['super_admin'] },
    { path: '/audit-logs', label: 'Audit Logs', icon: FileText, roles: ['super_admin'] },
    { path: '/settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin'] },
    { path: '/profile', label: 'Profile', icon: User, roles: ['super_admin', 'admin', 'viewer', 'participant', 'visitor'] },
  ];

  const filteredItems = navItems.filter(item => item.roles.includes(user?.role));

  return (
    <aside
      className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transition-transform lg:translate-x-0 flex flex-col justify-between border-r border-slate-800 dark:bg-dark-950 dark:border-dark-900 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Sidebar Header Title */}
        <div className="flex items-center gap-2 px-6 py-5 border-b border-slate-800">
          <Trophy className="w-7 h-7 text-primary-500 animate-bounce" />
          <div>
            <h1 className="font-extrabold text-white text-lg tracking-tight leading-none">ICAI SPORTS</h1>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Tournament Admin</span>
          </div>
        </div>

        {/* Navigation links */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {filteredItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={toggleSidebar}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-150 group ${
                    isActive
                      ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25'
                      : 'hover:bg-slate-800 hover:text-white dark:hover:bg-dark-900'
                  }`
                }
              >
                <Icon className="w-5 h-5 transition-transform group-hover:scale-110" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer Profile */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-10 h-10 rounded-full bg-primary-600 flex items-center justify-center text-white font-bold shadow-md shadow-primary-600/30">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="overflow-hidden">
            <h3 className="text-white text-sm font-semibold truncate">{user?.name}</h3>
            <span className="text-xs text-slate-400 font-medium capitalize">{user?.role?.replace('_', ' ')}</span>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-rose-600 hover:text-white text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition-all duration-150 text-sm shadow-md"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
