import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Trophy, Mail, ArrowLeft, ArrowRight } from 'lucide-react';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      showToast('Please enter your email address', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setLoading(false);
      if (response.data.success) {
        showToast(response.data.message, 'success', 8000);
        // Navigate to password reset page
        navigate('/reset-password', { state: { email } });
      }
    } catch (error) {
      setLoading(false);
      showToast(error.response?.data?.message || 'Error occurred, check details', 'error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(16,185,129,0.15),rgba(255,255,255,0))] dark:bg-dark-950 px-4">
      <div className="w-full max-w-md bg-white/10 dark:bg-dark-900/50 backdrop-blur-md border border-white/10 dark:border-dark-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        
        <div className="flex items-center gap-1.5 mb-6">
          <Link to="/login" className="text-slate-400 hover:text-white flex items-center gap-1 text-xs font-semibold">
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>
        </div>

        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-primary-500/10 border border-primary-500/25 rounded-2xl flex items-center justify-center text-primary-400 mb-4">
            <Mail className="w-8 h-8 text-primary-500" />
          </div>
          <h2 className="text-2xl font-extrabold text-white text-center">Forgot Password</h2>
          <p className="text-xs text-slate-400 mt-2 text-center max-w-xs leading-relaxed">
            Enter your email below. We'll send a password recovery token.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-widest mb-2">Email Address</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400">
                <Mail className="w-5 h-5" />
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white placeholder-slate-500 focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 transition-all text-sm font-medium"
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
                <span>Send Code</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
