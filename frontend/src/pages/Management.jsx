import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Committee from './Committee';
import SystemSettings from './Settings';
import AuditLogs from './AuditLogs';
import { Shield, Settings as SettingsIcon, Users, FileText, Fingerprint, Award, CheckCircle } from 'lucide-react';

const Management = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  // Build tabs dynamically based on user privilege level
  const tabs = [
    ...(isSuperAdmin ? [
      { id: 'users', label: 'Users', icon: Users },
      { id: 'committee', label: 'Committee Members', icon: Shield }
    ] : []),
    { id: 'roles', label: 'Roles', icon: Fingerprint },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
    ...(isSuperAdmin ? [
      { id: 'audit', label: 'Audit Logs', icon: FileText }
    ] : [])
  ];

  const [activeTab, setActiveTab] = useState(isSuperAdmin ? 'users' : 'roles');

  const rolesInfo = [
    { name: 'Super Admin', desc: 'Full administrative access to all read/write features. Authorized to provision coordinators, view system audit trails, modify global app settings, and run Excel exports.', privileges: ['Manage User Accounts', 'View Security Audit Logs', 'Modify Global Branding', 'Google Sheet Sync Operations', 'Barcode/QR Check-in scanner'] },
    { name: 'Admin', desc: 'Read/write authority to configure tournaments, coordinate bracket grids, allocate team players, upload registration Excel rosters, and trigger Google Sheet sync.', privileges: ['Configure Brackets', 'Edit Participant Details', 'Roster Excel Upload / Sync', 'Manual Attendance Override', 'QR check-in scanner'] },
    { name: 'Viewer / Committee', desc: 'Staff observers and check-in assistants. Authorized to view match schedules, results, leaderboards, and announcements. Can use the QR scanner to verify attendee arrivals.', privileges: ['View Roster Registry', 'View Tournaments Board', 'View Announcements & Rules', 'Mark attendance via QR Scan Terminal'] },
    { name: 'Visitor', desc: 'Guest observer account. Authorized read-only access to match fixtures, results, leaderboards, and bulletins. No settings, manual editing or audit access.', privileges: ['View Standing Charts', 'Read Bulletins', 'View Game Fixtures'] },
    { name: 'Participant', desc: 'Registered tournament athletes. Read-only portal displaying registered profile details, check-in QR code, enrolled games list, fixtures, and results.', privileges: ['View Player Dashboard', 'Read Enrolled Games List', 'View Check-in Pass QR'] }
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Header section */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Management Hub</h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Configure global application branding, manage user permissions, and audit logs.</p>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-slate-200 dark:border-dark-800 pb-px gap-2 overflow-x-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-3 px-4 font-bold text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-450 hover:text-slate-750 dark:text-dark-400'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels content */}
      <div className="mt-4">
        {activeTab === 'users' && isSuperAdmin && (
          <Committee showAllUsers={true} />
        )}

        {activeTab === 'committee' && isSuperAdmin && (
          <Committee showAllUsers={false} />
        )}

        {activeTab === 'settings' && (
          <SystemSettings />
        )}

        {activeTab === 'audit' && isSuperAdmin && (
          <AuditLogs />
        )}

        {activeTab === 'roles' && (
          <div className="space-y-6 max-w-4xl">
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Fingerprint className="w-5 h-5 text-primary-500" />
                  <span>Access Control Matrix (RBAC)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">Role definitions and authorized privileges under the Tournament system.</p>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-dark-800 space-y-5 pt-3">
                {rolesInfo.map((role, idx) => (
                  <div key={idx} className={`pt-5 flex flex-col md:flex-row gap-4 items-start ${idx === 0 ? 'pt-0 border-t-0' : 'border-t border-slate-100 dark:border-dark-850'}`}>
                    <div className="md:w-1/4 shrink-0">
                      <span className="inline-flex items-center gap-1 bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 text-xs font-black px-3 py-1 rounded-full uppercase border border-primary-200 dark:border-primary-900/30">
                        <Award className="w-3.5 h-3.5" />
                        <span>{role.name}</span>
                      </span>
                    </div>
                    <div className="md:w-3/4 space-y-3">
                      <p className="text-xs text-slate-650 dark:text-dark-300 leading-relaxed font-semibold">{role.desc}</p>
                      <div className="flex flex-wrap gap-2">
                        {role.privileges.map((p, pIdx) => (
                          <span key={pIdx} className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-dark-400 text-[10px] font-bold px-2 py-0.5 rounded border border-slate-150 dark:border-dark-850 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3 text-emerald-500" />
                            <span>{p}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Management;
