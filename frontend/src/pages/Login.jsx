import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Trophy, User, Lock, ArrowRight } from 'lucide-react';

const Login = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!userId || !password) {
      showToast('Please enter both User ID and Password', 'warning');
      return;
    }

    setLoading(true);
    const result = await login(userId, password);
    setLoading(false);

    if (result.success) {
      showToast('Login successful! Welcome back.', 'success');
      navigate('/');
    } else {
      showToast(result.message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] dark:bg-dark-950 px-4">
      <div className="w-full max-w-md bg-white/10 dark:bg-dark-900/50 backdrop-blur-md border border-white/10 dark:border-dark-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        {/* Decorative corner glows */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-primary-500/20 rounded-full blur-2xl"></div>
        <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-primary-500/10 rounded-full blur-2xl"></div>

        <div className="flex flex-col items-center mb-8 relative z-10">
          <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/25 rounded-2xl flex items-center justify-center text-primary-400 mb-4 shadow-lg">
            <Trophy className="w-8 h-8 text-primary-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-extrabold text-white text-center">SPORTS MANAGEMENT</h2>
          <p className="text-xs text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">ICAI Bathinda Branch</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
          {/* User ID Field */}
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">User ID</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <User className="w-5 h-5" />
              </span>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="e.g. admin01"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest">Password</label>
              <Link
                to="/forgot-password"
                className="text-xs text-primary-400 hover:text-primary-300 font-semibold"
              >
                Forgot Password?
              </Link>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Lock className="w-5 h-5" />
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
                required
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-primary-600 hover:bg-primary-500 active:scale-[0.98] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center gap-2 shadow-lg shadow-primary-600/30 text-sm mt-8 border border-primary-500/20"
          >
            {loading ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
