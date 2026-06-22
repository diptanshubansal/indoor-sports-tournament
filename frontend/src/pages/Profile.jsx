import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { User, Mail, Phone, Lock, Save, Shield } from 'lucide-react';

const Profile = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    mobileNumber: user?.mobileNumber || '',
    password: '',
    confirmPassword: '',
  });
  const [saving, setSaving] = useState(false);

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      showToast('Passwords do not match', 'warning');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        email: form.email,
        mobileNumber: form.mobileNumber,
      };
      
      if (form.password) {
        payload.password = form.password;
      }

      const response = await api.put(`/users/${user._id}`, payload);
      if (response.data.success) {
        showToast('Profile updated successfully!', 'success');
        updateProfile(response.data.data);
        setForm(prev => ({ ...prev, password: '', confirmPassword: '' }));
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update profile details', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <User className="w-8 h-8 text-primary-500" />
          <span>My Profile</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Configure your personal credentials and security password.</p>
      </div>

      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
        {/* Meta details */}
        <div className="flex flex-col sm:flex-row items-center gap-4 pb-6 border-b border-slate-100 dark:border-dark-800">
          <div className="w-16 h-16 rounded-2xl bg-primary-500/10 border border-primary-500/25 flex items-center justify-center text-primary-500 font-extrabold text-2xl shadow-lg shrink-0">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-lg font-bold text-slate-850 dark:text-white">{user?.name}</h3>
            <div className="flex items-center justify-center sm:justify-start gap-1.5 mt-1 text-slate-500 text-xs font-semibold">
              <Shield className="w-3.5 h-3.5 text-primary-500" />
              <span className="capitalize">{user?.role?.replace('_', ' ')}</span>
              <span>•</span>
              <span>ID: {user?.userId}</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Full Name</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <User className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 pl-9 text-sm text-slate-800 dark:text-white focus:outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <input
                  type="text"
                  name="mobileNumber"
                  value={form.mobileNumber}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 pl-9 text-sm text-slate-800 dark:text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleFormChange}
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 pl-9 text-sm text-slate-800 dark:text-white focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Password changes */}
          <div className="pt-4 border-t border-slate-100 dark:border-dark-800 space-y-4">
            <h4 className="text-xs font-extrabold text-slate-400 dark:text-dark-500 uppercase tracking-widest">Update Password</h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-dark-500 mb-1.5">New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    name="password"
                    value={form.password}
                    onChange={handleFormChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 pl-9 text-sm text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-450 dark:text-dark-500 mb-1.5">Confirm New Password</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleFormChange}
                    placeholder="••••••••"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 pl-9 text-sm text-slate-800 dark:text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 dark:border-dark-800 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all active:scale-[0.98]"
            >
              {saving ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Update Profile</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
