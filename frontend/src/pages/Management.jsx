import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Shield, Settings, ChevronRight } from 'lucide-react';

const Management = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdminOrSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  return (
    <div className="space-y-8 fade-in">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Management Hub</h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1.5">
          Configure system settings, roles, and tournament committee coordinators.
        </p>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
        {/* Committee Members card (Super Admin only) */}
        {isSuperAdmin ? (
          <div
            onClick={() => navigate('/committee')}
            className="group bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 hover-card cursor-pointer flex justify-between items-center transition-all"
          >
            <div className="flex gap-4 items-start">
              <div className="p-4 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-2xl group-hover:scale-110 transition-transform">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary-500 transition-colors">
                  Committee Members
                </h3>
                <p className="text-xs text-slate-450 dark:text-dark-400 leading-relaxed max-w-xs">
                  Add, update, or remove coordinators, staff members, and system viewers.
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-350 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-dark-950/10 border border-slate-200/50 dark:border-dark-900/50 rounded-3xl p-6 flex justify-between items-center opacity-60 cursor-not-allowed">
            <div className="flex gap-4 items-start">
              <div className="p-4 bg-slate-100 dark:bg-dark-900/50 text-slate-400 rounded-2xl">
                <Shield className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-500 dark:text-dark-500">
                  Committee Members
                </h3>
                <p className="text-xs text-slate-400 dark:text-dark-600 leading-relaxed max-w-xs">
                  Restricted to Super Admin role permissions only.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* System Settings card (Admin/Super Admin) */}
        {isAdminOrSuperAdmin ? (
          <div
            onClick={() => navigate('/settings')}
            className="group bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 hover-card cursor-pointer flex justify-between items-center transition-all"
          >
            <div className="flex gap-4 items-start">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-500 rounded-2xl group-hover:scale-110 transition-transform">
                <Settings className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                  System Settings
                </h3>
                <p className="text-xs text-slate-450 dark:text-dark-400 leading-relaxed max-w-xs">
                  Modify environment configurations, tournament parameters, and core defaults.
                </p>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-slate-350 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
          </div>
        ) : (
          <div className="bg-slate-50/50 dark:bg-dark-950/10 border border-slate-200/50 dark:border-dark-900/50 rounded-3xl p-6 flex justify-between items-center opacity-60 cursor-not-allowed">
            <div className="flex gap-4 items-start">
              <div className="p-4 bg-slate-100 dark:bg-dark-900/50 text-slate-400 rounded-2xl">
                <Settings className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold text-slate-500 dark:text-dark-500">
                  System Settings
                </h3>
                <p className="text-xs text-slate-400 dark:text-dark-600 leading-relaxed max-w-xs">
                  Restricted to Admin / Super Admin roles only.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;
