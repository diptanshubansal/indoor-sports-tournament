import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { ShieldAlert, Terminal, Search, Filter, RefreshCw } from 'lucide-react';

const AuditLogs = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const fetchLogs = async () => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      setLoading(true);
      const params = {
        search: search || undefined,
        action: actionFilter || undefined,
        role: roleFilter || undefined,
      };
      const response = await api.get('/audit-logs', { params });
      if (response.data.success) {
        setLogs(response.data.data);
      }
    } catch (err) {
      showToast('Failed to retrieve system audit logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [search, actionFilter, roleFilter, currentUser]);

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl max-w-lg mx-auto mt-12 flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold">Access Restricted</h3>
        <p className="text-xs text-rose-600 leading-relaxed">
          Only Super Admins can access system audit logs.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Security Audit Logs</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Trace user authentications, data creations, modifications, and deletions.</p>
        </div>

        <button
          onClick={fetchLogs}
          className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-750 text-white font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-700 shadow-md self-start sm:self-center"
        >
          <RefreshCw className="w-4 h-4 animate-spin-slow" />
          <span>Refresh Audits</span>
        </button>
      </div>

      {/* Filters bar */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search details or IP address..."
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
            >
              <option value="">All Actions</option>
              <option value="login">Login</option>
              <option value="logout">Logout</option>
              <option value="create">Record Creation</option>
              <option value="update">Record Modification</option>
              <option value="delete">Record Deletion</option>
            </select>
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
          >
            <option value="">All Roles</option>
            <option value="super_admin">Super Admin</option>
            <option value="admin">Admin</option>
            <option value="system">System</option>
          </select>
        </div>
      </div>

      {/* Logs Table Grid */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : logs.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <Terminal className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">Audit Trail Clear</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">There are no matching audit entries logged in the database.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto font-mono text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-[10px] font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6">Action</th>
                  <th className="py-4 px-6">Operator / Role</th>
                  <th className="py-4 px-6">Details</th>
                  <th className="py-4 px-6">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60">
                {logs.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                    <td className="py-4 px-6 text-slate-400 whitespace-nowrap">{new Date(item.timestamp).toLocaleString()}</td>
                    <td className="py-4 px-6">
                      <span className={`font-bold uppercase px-2 py-0.5 rounded ${
                        item.action === 'login' || item.action === 'logout' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
                        item.action === 'create' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                        item.action === 'update' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400' :
                        'bg-rose-100 text-rose-800 dark:bg-rose-950/30 dark:text-rose-400'
                      }`}>
                        {item.action}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-700 dark:text-dark-300">{item.userId?.name || 'System'}</div>
                      <div className="text-[9px] text-slate-400 capitalize">{item.role}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-600 dark:text-dark-300 font-medium">{item.details}</td>
                    <td className="py-4 px-6 text-slate-400 font-semibold">{item.ipAddress || 'unknown'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
