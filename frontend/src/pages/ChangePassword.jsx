import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { KeyRound, Lock, CheckCircle2 } from 'lucide-react';

const ChangePassword = () => {
  const { user, updateProfile } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) {
      showToast('Please fill in all password fields', 'warning');
      return;
    }

    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showToast('Password should be at least 6 characters long', 'warning');
      return;
    }

    try {
      setLoading(true);
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data.success) {
        showToast('Password changed successfully!', 'success');
        updateProfile({ ...user, isTempPassword: false });
        navigate('/participant-dashboard');
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Password update failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-8 shadow-2xl relative animate-[fadeIn_0.3s_ease-out_forwards]">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3.5 bg-primary-50 dark:bg-primary-950/20 text-primary-500 rounded-2xl mb-4 border border-primary-200/50 dark:border-primary-800/30">
            <KeyRound className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">Change Temporary Password</h2>
          <p className="text-xs text-slate-500 dark:text-dark-400 mt-2 max-w-xs leading-relaxed">
            Welcome, <span className="font-bold text-slate-700 dark:text-slate-200">{user?.name}</span>. Since you are logging in with a temporary password, you must configure a new personalized password before accessing the dashboard.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Current Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Temporary Password"
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Min 6 characters"
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Confirm New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-type new password"
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm border border-primary-500/20"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Open Dashboard</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChangePassword;
