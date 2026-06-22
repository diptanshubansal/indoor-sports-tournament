import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Settings, Save, ShieldAlert, Check } from 'lucide-react';

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

  useEffect(() => {
    loadSettings();
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
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Settings className="w-8 h-8 text-primary-500" />
          <span>System Settings</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Configure global application branding and verification variables.</p>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
          <div className="h-28 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
          <div className="h-12 bg-slate-200 dark:bg-dark-800 rounded-xl"></div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
          {/* App Name */}
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Application Branding Name</label>
            <input
              type="text"
              name="appName"
              value={form.appName}
              onChange={handleFormChange}
              placeholder="e.g. ICAI Bathinda Sports Tournament"
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
      )}
    </div>
  );
};

export default SystemSettings;
