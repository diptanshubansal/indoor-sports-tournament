import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Settings, Save, ShieldAlert, Check, Plus, Trash2, KeyRound, Eye } from 'lucide-react';

const SystemSettings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    appName: '',
    qrVerification: true,
    themePrimary: '#10b981',
  });

  // Visitor state
  const [visitors, setVisitors] = useState([]);
  const [loadingVisitors, setLoadingVisitors] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      if (response.data.success) {
        const settings = response.data.data;
        const appName = settings.find(s => s.key === 'app_name')?.value || '';
        const qrVerification = settings.find(s => s.key === 'qr_verification_enabled')?.value ?? true;
        const themePrimary = settings.find(s => s.key === 'theme_primary')?.value || '#10b981';
        
        setForm({ appName, qrVerification, themePrimary });
      }
    } catch (err) {
      showToast('Failed to load system settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchVisitors = async () => {
    try {
      setLoadingVisitors(true);
      const response = await api.get('/visitors');
      if (response.data.success) {
        setVisitors(response.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingVisitors(false);
    }
  };

  useEffect(() => {
    loadSettings();
    if (user?.role === 'super_admin' || user?.role === 'admin') {
      fetchVisitors();
    }
  }, []);

  const handleToggleQr = () => {
    setForm(prev => ({ ...prev, qrVerification: !prev.qrVerification }));
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      await Promise.all([
        api.post('/settings', { key: 'app_name', value: form.appName }),
        api.post('/settings', { key: 'qr_verification_enabled', value: form.qrVerification }),
        api.post('/settings', { key: 'theme_primary', value: form.themePrimary }),
      ]);
      showToast('System settings saved successfully!', 'success');
    } catch (err) {
      showToast('Failed to save settings configurations', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateVisitor = async () => {
    try {
      const response = await api.post('/visitors');
      if (response.data.success) {
        showToast(`Visitor ${response.data.data.visitorId} generated successfully!`, 'success');
        fetchVisitors();
      }
    } catch (err) {
      showToast('Failed to generate visitor account', 'error');
    }
  };

  const handleResetVisitorPassword = async (v) => {
    if (!window.confirm(`Reset password for visitor ${v.visitorId}?`)) return;
    try {
      const response = await api.post(`/visitors/${v._id}/reset-password`);
      if (response.data.success) {
        showToast(response.data.message, 'success');
        fetchVisitors();
      }
    } catch (err) {
      showToast('Failed to reset visitor password', 'error');
    }
  };

  const handleDeleteVisitor = async (v) => {
    if (!window.confirm(`Are you sure you want to delete visitor ${v.visitorId}? This will remove login access.`)) return;
    try {
      const response = await api.delete(`/visitors/${v._id}`);
      if (response.data.success) {
        showToast('Visitor account deleted', 'success');
        fetchVisitors();
      }
    } catch (err) {
      showToast('Failed to delete visitor', 'error');
    }
  };

  if (user?.role !== 'super_admin' && user?.role !== 'admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl max-w-lg mx-auto mt-12 flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold">Access Restricted</h3>
        <p className="text-xs text-rose-600 leading-relaxed">
          Only Admins can modify global settings.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary-500" />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Configure global application branding and observer visitor accounts.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
          <div className="h-12 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
        </div>
      ) : (
        <div className="space-y-8">
          <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
            {/* App Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Application Branding Name</label>
              <input
                type="text"
                name="appName"
                value={form.appName}
                onChange={handleFormChange}
                placeholder="e.g. Indoor Sports Tournament"
                className="w-full bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-3 px-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                required
              />
            </div>

            {/* Theme primary color hex picker */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Primary Palette Accent</label>
              <div className="flex gap-4 items-center">
                <input
                  type="color"
                  name="themePrimary"
                  value={form.themePrimary}
                  onChange={handleFormChange}
                  className="w-12 h-12 rounded-xl bg-transparent cursor-pointer border-0"
                />
                <input
                  type="text"
                  name="themePrimary"
                  value={form.themePrimary}
                  onChange={handleFormChange}
                  placeholder="#10b981"
                  className="bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white font-mono focus:outline-none"
                />
              </div>
            </div>

            {/* QR Verification Switch */}
            <div className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-dark-800 bg-slate-50 dark:bg-dark-950/40">
              <div>
                <h4 className="text-sm font-bold text-slate-855 dark:text-white">QR Barcode Verification</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">Enables individual participant barcode verification on check-ins.</p>
              </div>

              <button
                type="button"
                onClick={handleToggleQr}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-all duration-300 ${
                  form.qrVerification ? 'bg-primary-500 justify-end' : 'bg-slate-300 dark:bg-dark-800 justify-start'
                }`}
              >
                <span className="bg-white w-4.5 h-4.5 rounded-full shadow-md"></span>
              </button>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-dark-800 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all border border-primary-500/20 active:scale-[0.98]"
              >
                {saving ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Configuration</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Visitor Management Section */}
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 dark:border-dark-800 pb-4">
              <div>
                <h3 className="font-extrabold text-slate-850 dark:text-white text-lg">Visitor Observer Accounts</h3>
                <p className="text-xs text-slate-500 mt-0.5">Generate and manage credentials for guest observers who have read-only access.</p>
              </div>
              <button
                type="button"
                onClick={handleCreateVisitor}
                className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md border border-primary-500/20 active:scale-[0.98] transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Generate Visitor Account</span>
              </button>
            </div>

            {loadingVisitors ? (
              <div className="animate-pulse space-y-2 py-4">
                <div className="h-8 bg-slate-100 dark:bg-dark-950 rounded-lg"></div>
                <div className="h-8 bg-slate-100 dark:bg-dark-950 rounded-lg"></div>
              </div>
            ) : visitors.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400 italic">
                No visitor observer accounts created yet. Click above to generate visitor credentials.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-dark-950/40 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 dark:border-dark-800/80">
                      <th className="py-3 px-4">Visitor ID</th>
                      <th className="py-3 px-4">Username</th>
                      <th className="py-3 px-4">Temporary Password</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-850">
                    {visitors.map(v => (
                      <tr key={v._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 text-xs">
                        <td className="py-3 px-4 font-bold text-slate-800 dark:text-slate-200">{v.visitorId}</td>
                        <td className="py-3 px-4 font-semibold text-slate-600 dark:text-dark-300">{v.username}</td>
                        <td className="py-3 px-4 font-mono text-indigo-500 bg-indigo-500/5 dark:bg-indigo-950/10 px-2 py-0.5 rounded max-w-[120px] truncate">{v.temporaryPassword}</td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => handleResetVisitorPassword(v)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-450 hover:text-amber-500 rounded transition-colors"
                              title="Reset Password"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteVisitor(v)}
                              className="p-1 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-450 hover:text-rose-500 rounded transition-colors"
                              title="Delete Visitor"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SystemSettings;
