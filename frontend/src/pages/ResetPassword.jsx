import React, { useState } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Lock, Mail, KeyRound, ArrowLeft, Check } from 'lucide-react';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [email, setEmail] = useState(location.state?.email || '');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !resetToken || !newPassword) {
      showToast('All fields are required', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        resetToken,
        newPassword,
      });
      setLoading(false);
      if (response.data.success) {
        showToast('Password reset successful! You can now log in.', 'success');
        navigate('/login');
      }
    } catch (error) {
      setLoading(false);
      showToast(error.response?.data?.message || 'Verification token failed', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] dark:bg-dark-950 px-4">
      <div className="w-full max-w-md bg-white/10 dark:bg-dark-900/50 backdrop-blur-md border border-white/10 dark:border-dark-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <div className="flex items-center gap-1.5 mb-6">
          <Link to="/forgot-password" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to email entry
          </Link>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/25 rounded-2xl flex items-center justify-center text-primary-400 mb-4">
            <KeyRound className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-white text-center">Reset Password</h2>
          <p className="text-xs text-slate-400 mt-2 text-center max-w-xs leading-relaxed">
            Enter the recovery code sent to your inbox and define your new password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5">Email</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="w-4.5 h-4.5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Token field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5">Reset Token Code</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <KeyRound className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={resetToken}
                onChange={(e) => setResetToken(e.target.value)}
                placeholder="RESET_123456"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Password field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-1.5">New Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-4.5 h-4.5" />
              </span>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 text-sm mt-8 border border-primary-500/20"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <span>Save Password</span>
                <Check className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
