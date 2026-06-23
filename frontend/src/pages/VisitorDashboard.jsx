import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import api from '../services/api';
import { Trophy, HelpCircle, Megaphone, Calendar, ShieldCheck, MapPin, Compass } from 'lucide-react';

const VisitorDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [details, setDetails] = useState({
    title: 'Indoor Sports Tournament',
    tournamentDetails: 'ICAI Bathinda Branch Indoor Sports Meet 2026',
    message: 'Welcome! Explore tournament fixtures, results, leaderboards, rules, and announcements.'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await api.get('/visitors/dashboard');
        if (response.data.success) {
          setDetails(response.data.data);
        }
      } catch (error) {
        showToast('Welcome to the Tournament Board', 'info');
      } finally {
        setLoading(false);
      }
    };
    fetchDashboard();
  }, []);

  const quickLinks = [
    { title: 'Leaderboard', desc: 'Real-time standing and score tally', icon: Trophy, path: '/leaderboard', color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
    { title: 'Fixtures & Brackets', desc: 'Schedule list and game timings', icon: Calendar, path: '/tournaments', color: 'text-sky-500 bg-sky-50 dark:bg-sky-950/20' },
    { title: 'Rulebooks & Policies', desc: 'Official codes and scoring guidelines', icon: HelpCircle, path: '/rules', color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/20' },
    { title: 'Announcements', desc: 'Important bulletins and schedules updates', icon: Megaphone, path: '/announcements', color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/20' },
  ];

  return (
    <div className="space-y-6 fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 p-6 md:p-8 shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_60%)]"></div>
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border border-indigo-500/25">
            <Compass className="w-3.5 h-3.5" />
            <span>Visitor Portal</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {details.title}
          </h1>
          <p className="text-sm text-slate-350 max-w-xl font-medium leading-relaxed">
            {details.tournamentDetails}
          </p>
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> Bathinda, Punjab</span>
            <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Authorized Read-Only Session</span>
          </div>
        </div>
      </div>

      {/* Access Message Card */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm">
        <h3 className="font-extrabold text-slate-800 dark:text-white text-base">Visitor Session Details</h3>
        <p className="text-xs text-slate-500 dark:text-dark-400 mt-1 leading-relaxed">
          {details.message} Feel free to navigate across the tournament hub. You have observer rights, allowing you to track schedules and results in real time. Administration access is restricted.
        </p>
      </div>

      {/* Grid of Navigation Boards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {quickLinks.map((link, idx) => {
          const Icon = link.icon;
          return (
            <div
              key={idx}
              onClick={() => navigate(link.path)}
              className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 dark:hover:border-dark-750 transition-all cursor-pointer flex items-start gap-4 group"
            >
              <div className={`p-3 rounded-2xl shrink-0 group-hover:scale-105 transition-transform ${link.color}`}>
                <Icon className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-850 dark:text-white text-base leading-snug group-hover:text-primary-500 transition-colors">
                  {link.title}
                </h4>
                <p className="text-xs text-slate-500 dark:text-dark-400 leading-relaxed font-medium">
                  {link.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VisitorDashboard;
