import React from 'react';
import { FileSpreadsheet, Info } from 'lucide-react';

const GoogleSheetSync = () => {
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
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Google Sync Management</h1>
          <p className="text-sm text-slate-350 max-w-xl">
            Configure, map, and synchronize participant databases in real-time from active Google Spreadsheets.
          </p>
        </div>
      </div>

      {/* Placeholder card */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-8 max-w-2xl shadow-sm text-center flex flex-col items-center justify-center space-y-5">
        <div className="p-4 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-full">
          <FileSpreadsheet className="w-12 h-12" />
        </div>
        <div className="space-y-2 max-w-md">
          <h3 className="text-xl font-bold text-slate-905 dark:text-white">Google Sheet sync setup will be managed here.</h3>
          <p className="text-xs text-slate-450 dark:text-dark-400 leading-relaxed">
            Integration configuration is currently offline. Administrator controls for Google Drive credentials and real-time syncing pipelines will display once credentials are fully whitelisted.
          </p>
        </div>
        <div className="flex gap-2 items-center bg-slate-50 dark:bg-dark-950 border border-slate-150 dark:border-dark-850 px-4 py-2.5 rounded-2xl text-[11px] text-slate-500 dark:text-dark-450 max-w-sm">
          <Info className="w-4 h-4 text-primary-500 shrink-0" />
          <span className="font-semibold text-left">No active API route errors. Local settings are healthy.</span>
        </div>
      </div>
    </div>
  );
};

export default GoogleSheetSync;
