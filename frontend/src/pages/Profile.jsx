import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { User, Mail, Phone, Lock, Save, Shield, Trophy } from 'lucide-react';

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

  const isParticipant = user?.role === 'participant';

  if (isParticipant) {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${user?.userId?.toUpperCase()}`;
    return (
      <div className="max-w-4xl mx-auto space-y-6 fade-in">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            <User className="w-8 h-8 text-primary-500" />
            <span>My Profile</span>
          </h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Your registered player profile and check-in QR code.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Details Card */}
          <div className="md:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              <span>Registration Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Player ID</span>
                <div className="text-sm font-extrabold text-slate-800 dark:text-white bg-slate-50 dark:bg-dark-950 p-3.5 rounded-xl border border-slate-100 dark:border-dark-850">
                  {user?.userId?.toUpperCase()}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Full Name</span>
                <div className="text-sm font-bold text-slate-850 dark:text-slate-200 bg-slate-50 dark:bg-dark-950 p-3.5 rounded-xl border border-slate-100 dark:border-dark-850">
                  {user?.name}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Phone Number</span>
                <div className="text-sm font-bold text-slate-850 dark:text-slate-200 bg-slate-50 dark:bg-dark-950 p-3.5 rounded-xl border border-slate-100 dark:border-dark-850">
                  {user?.mobileNumber || 'Not Specified'}
                </div>
              </div>

              <div>
                <span className="block text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1">Email Address</span>
                <div className="text-sm font-bold text-slate-850 dark:text-slate-200 bg-slate-50 dark:bg-dark-950 p-3.5 rounded-xl border border-slate-100 dark:border-dark-850 truncate">
                  {user?.email || 'Not Specified'}
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-150 dark:border-dark-805 text-xs text-slate-400 italic">
              * To request details modification, please contact your tournament administrator.
            </div>
          </div>

          {/* QR Code Card */}
          <div className="md:col-span-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-between text-center">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 w-full flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-primary-500 animate-pulse" />
              <span>Attendance QR</span>
            </h3>

            <div className="my-6 p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-150 dark:border-dark-850 shadow-inner flex items-center justify-center">
              <img
                src={qrUrl}
                alt="Attendance QR Code"
                className="w-40 h-40 object-contain rounded-lg border border-slate-200 dark:border-dark-800"
              />
            </div>

            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-800 dark:text-white">Check-in Pass</h4>
              <p className="text-[10px] text-slate-450 dark:text-dark-400 leading-normal max-w-[180px]">
                Present this QR code at the registration desk to mark your daily attendance.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

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
