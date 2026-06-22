import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { Sun, Moon, Bell, Menu, ShieldCheck } from 'lucide-react';
import api from '../services/api';

const Header = ({ toggleSidebar }) => {
  const { isDarkMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const fetchRecentAnnouncements = async () => {
      try {
        const response = await api.get('/announcements/dashboard');
        if (response.data.success) {
          setAnnouncements(response.data.data);
        }
      } catch (err) {
        console.error('Failed to load header notifications', err);
      }
    };
    if (user) {
      fetchRecentAnnouncements();
    }
  }, [user]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-dark-900/80 backdrop-blur-md border-b border-slate-200 dark:border-dark-800 transition-colors duration-200">
      <div className="flex items-center gap-4">
        {/* Toggle Sidebar mobile menu */}
        <button
          onClick={toggleSidebar}
          className="p-2 -ml-2 text-slate-500 rounded-lg hover:bg-slate-100 dark:hover:bg-dark-800 lg:hidden focus:outline-none"
        >
          <Menu className="w-6 h-6" />
        </button>
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
            Welcome back, {user?.name || 'User'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-dark-400">
            Monitor tourneys, rankings, and check-in rosters.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Role Badge Indicator */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1 bg-primary-50 dark:bg-primary-950/30 text-primary-700 dark:text-primary-400 text-xs font-semibold rounded-full border border-primary-200/50 dark:border-primary-800/30">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-500 hover:text-primary-500 dark:text-dark-400 dark:hover:text-primary-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors focus:outline-none"
          title="Toggle Light/Dark Theme"
        >
          {isDarkMode ? <Sun className="w-5.5 h-5.5" /> : <Moon className="w-5.5 h-5.5" />}
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:text-primary-500 dark:text-dark-400 dark:hover:text-primary-400 rounded-xl hover:bg-slate-100 dark:hover:bg-dark-800 transition-colors focus:outline-none relative"
            title="Recent Notices"
          >
            <Bell className="w-5.5 h-5.5" />
            {announcements.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white dark:ring-dark-900 animate-pulse"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl shadow-xl z-50 py-2 overflow-hidden animate-[fadeIn_0.2s_ease-out_forwards]">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-dark-800 flex justify-between items-center bg-slate-50 dark:bg-dark-950/50">
                <h3 className="font-bold text-sm text-slate-800 dark:text-white">Recent Notices</h3>
                <span className="text-[10px] bg-primary-100 dark:bg-primary-950 text-primary-700 dark:text-primary-400 font-extrabold px-2 py-0.5 rounded-full">
                  {announcements.length} New
                </span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {announcements.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-dark-500 text-center py-6">No recent announcements</p>
                ) : (
                  announcements.map((notif) => (
                    <div
                      key={notif._id}
                      className="px-4 py-3 hover:bg-slate-50 dark:hover:bg-dark-950/40 border-b border-slate-100 dark:border-dark-800/40 last:border-b-0 cursor-pointer"
                    >
                      <h4 className="text-xs font-bold text-slate-700 dark:text-white truncate">{notif.title}</h4>
                      <p className="text-[11px] text-slate-500 dark:text-dark-400 line-clamp-2 mt-0.5">{notif.content}</p>
                      <span className="text-[9px] text-slate-400 dark:text-dark-500 mt-1 block">
                        {new Date(notif.scheduledFor).toLocaleDateString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
