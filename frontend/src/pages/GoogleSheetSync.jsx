import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { RefreshCw, Link2, FileSpreadsheet, Play, CheckCircle2, AlertTriangle, AlertCircle, Clock, FileText } from 'lucide-react';

const GoogleSheetSync = () => {
  const { showToast } = useToast();
  const [sheetIdOrUrl, setSheetIdOrUrl] = useState('');
  const [sheetName, setSheetName] = useState('Participants Master');
  const [loading, setLoading] = useState(false);
  const [syncStatus, setSyncStatus] = useState({
    sheetIdOrUrl: '',
    sheetName: 'Participants Master',
    lastSyncTime: null,
    status: 'idle',
    summary: {
      totalRows: 0,
      importedCount: 0,
      updatedCount: 0,
      duplicateCount: 0,
      invalidCount: 0
    },
    errors: []
  });

  const fetchSyncStatus = async () => {
    try {
      const response = await api.get('/participants/sync-status');
      if (response.data.success) {
        const syncData = response.data.data;
        setSyncStatus(syncData);
        if (syncData.sheetIdOrUrl) {
          setSheetIdOrUrl(syncData.sheetIdOrUrl);
        }
        if (syncData.sheetName) {
          setSheetName(syncData.sheetName);
        }
      }
    } catch (error) {
      showToast('Failed to fetch sync status', 'error');
    }
  };

  useEffect(() => {
    fetchSyncStatus();
  }, []);

  const handleSync = async (e) => {
    e.preventDefault();
    if (!sheetIdOrUrl.trim()) {
      showToast('Please enter a Google Sheet URL or ID', 'warning');
      return;
    }

    try {
      setLoading(true);
      // Optimistically update status to syncing in frontend UI
      setSyncStatus(prev => ({
        ...prev,
        status: 'syncing'
      }));

      const response = await api.post('/participants/sync-google-sheet', {
        sheetIdOrUrl,
        sheetName
      });

      if (response.data.success) {
        showToast('Google Sheet sync completed successfully!', 'success');
        setSyncStatus(response.data.data);
      }
    } catch (error) {
      const msg = error.response?.data?.message || 'Sync failed. Check settings and spreadsheet access.';
      showToast(msg, 'error');
      // If error returned a summary, use it. Otherwise set to failed
      if (error.response?.data?.data) {
        setSyncStatus(error.response.data.data);
      } else {
        setSyncStatus(prev => ({
          ...prev,
          status: 'failed',
          errors: [{ row: 0, name: 'N/A', phone: 'N/A', reason: msg }]
        }));
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'syncing':
        return (
          <span className="bg-primary-50 dark:bg-primary-950/20 text-primary-650 dark:text-primary-400 border border-primary-100 dark:border-primary-900/50 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0 animate-pulse">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Syncing
          </span>
        );
      case 'success':
        return (
          <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Success
          </span>
        );
      case 'failed':
        return (
          <span className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/50 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <AlertCircle className="w-3.5 h-3.5 text-rose-500" /> Failed
          </span>
        );
      default:
        return (
          <span className="bg-slate-50 dark:bg-dark-950 text-slate-500 dark:text-dark-400 border border-slate-200 dark:border-dark-850 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Clock className="w-3.5 h-3.5 text-slate-400" /> Idle
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Title Header Banner */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-dark-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl"></div>

        <div className="relative z-10 space-y-2">
          <span className="bg-primary-500/20 border border-primary-500/30 text-primary-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Integrations
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Google Sheet Sync</h1>
          <p className="text-sm text-slate-350 max-w-xl">
            Synchronize participant registrations directly from a shared Google Spreadsheet. Ensure your sheet is shared with the backend service account email before syncing.
          </p>
        </div>

        <div className="bg-white/10 dark:bg-dark-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg relative z-10 self-start md:self-center">
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Default Target Sheet</div>
          <div className="text-lg font-extrabold text-primary-400 mt-0.5">Participants Master</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sync Settings Form Card */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <form onSubmit={handleSync} className="space-y-5">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
              <Link2 className="w-5 h-5 text-primary-500" />
              <span>Connect Spreadsheet</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">
                Google Sheet URL / ID
              </label>
              <input
                type="text"
                value={sheetIdOrUrl}
                onChange={(e) => setSheetIdOrUrl(e.target.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">
                Sheet Name
              </label>
              <input
                type="text"
                value={sheetName}
                onChange={(e) => setSheetName(e.target.value)}
                placeholder="Participants Master"
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-semibold"
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-650 hover:bg-primary-700 text-white font-bold py-3 px-4 rounded-xl transition-all duration-150 text-sm shadow-md shadow-primary-650/10 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Play className={`w-4 h-4 ${loading ? 'animate-pulse' : ''}`} />
              <span>{loading ? 'Syncing...' : 'Sync from Google Sheet'}</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-800 text-[11px] text-slate-400 font-medium">
            Note: The sheet columns must exactly match the standard schema (Name, Phone, Email, Chess, Carrom, Table Tennis, Ludo, Skipping, Spoon Race, BGMI, Tug of War).
          </div>
        </div>

        {/* Sync Summary & Status Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-dark-800">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-primary-500" />
                <span>Last Sync Execution</span>
              </h3>
              {getStatusBadge(syncStatus.status)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-dark-900 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sync Timestamp</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white">
                  {syncStatus.lastSyncTime ? new Date(syncStatus.lastSyncTime).toLocaleString() : 'Never Synced'}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-dark-900 space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Target Spreadsheet ID</div>
                <div className="text-sm font-bold text-slate-800 dark:text-white truncate max-w-[280px]">
                  {syncStatus.sheetIdOrUrl ? syncStatus.sheetIdOrUrl.split('/').pop() : 'N/A'}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-3">
                Sync Summary Breakdown
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                <div className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-150 dark:border-dark-850 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</div>
                  <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">
                    {syncStatus.summary?.totalRows || 0}
                  </div>
                </div>
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30 text-center">
                  <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Imported</div>
                  <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">
                    {syncStatus.summary?.importedCount || 0}
                  </div>
                </div>
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-center">
                  <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Updated</div>
                  <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">
                    {syncStatus.summary?.updatedCount || 0}
                  </div>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-800/30 text-center">
                  <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Duplicates</div>
                  <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">
                    {syncStatus.summary?.duplicateCount || 0}
                  </div>
                </div>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-800/30 text-center">
                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Invalid</div>
                  <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">
                    {syncStatus.summary?.invalidCount || 0}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sync Errors Log Card */}
          {syncStatus.errors && syncStatus.errors.length > 0 && (
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 animate-bounce" />
                <span>Sync Execution Logs & Warnings</span>
              </h3>
              <div className="border border-slate-150 dark:border-dark-850 rounded-2xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-dark-950 text-slate-400 font-bold uppercase tracking-wider border-b border-slate-150 dark:border-dark-850">
                    <tr>
                      <th className="py-2 px-3">Row</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Phone</th>
                      <th className="py-2 px-3">Error Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-850">
                    {syncStatus.errors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/40 text-slate-700 dark:text-dark-300 font-medium">
                        <td className="py-2.5 px-3 text-slate-400 font-bold">#{err.row || 'N/A'}</td>
                        <td className="py-2.5 px-3 truncate max-w-[120px] font-semibold">{err.name || 'N/A'}</td>
                        <td className="py-2.5 px-3 font-semibold">{err.phone || 'N/A'}</td>
                        <td className="py-2.5 px-3 text-rose-650 dark:text-rose-455 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                          <span>{err.reason}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetSync;
