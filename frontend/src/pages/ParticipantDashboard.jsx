import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  User, Mail, Phone, Trophy, Calendar, 
  MapPin, ShieldAlert, Clock, Star, 
  Activity, Play, CheckCircle2,
  Crown, Target, Swords, Gamepad2, Users, Dice5, Flame, Sparkles
} from 'lucide-react';

const getGameIcon = (gameName) => {
  switch (gameName) {
    case 'Chess': return Crown;
    case 'Carrom': return Target;
    case 'Table Tennis': return Swords;
    case 'Ludo': return Dice5;
    case 'Skipping': return Flame;
    case 'Spoon Race': return Sparkles;
    case 'BGMI': return Gamepad2;
    case 'Tug of War': return Users;
    default: return Activity;
  }
};

const ParticipantDashboard = () => {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/participants/my-dashboard');
        if (response.data.success) {
          setData(response.data.data);
        }
      } catch (error) {
        showToast('Failed to fetch dashboard records', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-500 dark:text-dark-400">Loading your profile data...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Profile Access Error</h3>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-2">
          We couldn't retrieve your athlete records. Please contact the tournament administrator if this persists.
        </p>
      </div>
    );
  }

  const { participantId, name, phone, email, games, tournamentDetails, fixturesPlaceholder, resultsPlaceholder } = data;

  return (
    <div className="space-y-8 fade-in">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-slate-900 dark:bg-dark-900 rounded-3xl p-6 md:p-8 text-white border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-primary-500/20 rounded-full blur-3xl"></div>
        <div className="absolute -left-16 -bottom-16 w-48 h-48 bg-primary-500/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 space-y-2">
          <span className="bg-primary-500/20 border border-primary-500/30 text-primary-400 text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Player Dashboard
          </span>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Welcome, {name}!</h1>
          <p className="text-sm text-slate-350 max-w-xl">
            You are officially registered for the {tournamentDetails}. Check your enrolled games, fixtures, and standings below.
          </p>
        </div>

        <div className="bg-white/10 dark:bg-dark-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg relative z-10 self-start md:self-center">
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Player ID</div>
          <div className="text-2xl font-extrabold tracking-widest text-primary-400 mt-0.5">{participantId}</div>
        </div>
      </div>

      {/* Profile & Tournament Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
              <User className="w-5 h-5 text-primary-500" />
              <span>Contact Profile</span>
            </h3>
            
            <div className="space-y-3.5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Name</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{name}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-slate-500 shrink-0">
                  <Phone className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Phone</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200">{phone}</div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 dark:bg-dark-950 flex items-center justify-center text-slate-500 shrink-0">
                  <Mail className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Email</div>
                  <div className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]">{email || 'Not Provided'}</div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-800 text-[11px] text-slate-400 font-medium">
            Contact admin to modify registration details.
          </div>
        </div>

        {/* Tournament Card */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-500 animate-pulse" />
            <span>Tournament Details</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-dark-900 flex items-start gap-3">
              <Calendar className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">Tournament Name</h4>
                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">{tournamentDetails}</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-100 dark:border-dark-900 flex items-start gap-3">
              <MapPin className="w-5 h-5 text-primary-500 mt-0.5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">Venue Location</h4>
                <p className="text-sm font-semibold text-slate-800 dark:text-white mt-1">ICAI Bathinda Branch Auditorium</p>
              </div>
            </div>
          </div>

          <div className="p-4 bg-primary-500/5 border border-primary-500/10 rounded-2xl flex items-center gap-3">
            <Clock className="w-5 h-5 text-primary-500 shrink-0" />
            <span className="text-xs text-primary-800 dark:text-primary-400 font-bold">
              Check in daily via scan stations to verify attendance!
            </span>
          </div>
        </div>
      </div>

      {/* Enrolled Games (Cards) */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Star className="w-5 h-5 text-primary-500" />
            <span>Enrolled Games</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">Individual game enrollments and statuses.</p>
        </div>

        {games.length === 0 ? (
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl py-12 text-center shadow-sm">
            <Activity className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-850 mb-3" />
            <h3 className="text-base font-bold text-slate-700 dark:text-white">No Registered Games</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Contact the administrator to enroll in your tournaments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {games.map((game, index) => {
              const GameIcon = getGameIcon(game);
              return (
                <div 
                  key={index} 
                  className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                >
                  <div className="absolute right-0 top-0 w-14 h-14 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-bl-3xl flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                    <GameIcon className="w-5 h-5 opacity-60 group-hover:scale-110 transition-transform" />
                  </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <h3 className="font-extrabold text-slate-800 dark:text-white text-lg truncate pr-4">{game}</h3>
                    <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200/50 dark:border-emerald-800/30 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3" /> Enrolled
                    </span>
                  </div>

                  <div className="space-y-2 bg-slate-50 dark:bg-dark-950 p-3 rounded-2xl border border-slate-100 dark:border-dark-900">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold">Fixture status</span>
                      <span className="text-slate-500 dark:text-dark-400 font-bold italic">Not Scheduled</span>
                    </div>
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-dark-850">
                      <span className="text-slate-400 font-semibold">Match Results</span>
                      <span className="text-slate-500 dark:text-dark-400 font-bold italic">Pending</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>

      {/* Fixtures & Results grid placeholders */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fixtures Section */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-500" />
            <span>My Match Fixtures</span>
          </h3>
          <div className="h-32 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-dashed border-slate-200 dark:border-dark-850 flex items-center justify-center p-6 text-center text-slate-400 text-sm font-semibold">
            {fixturesPlaceholder}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-500" />
            <span>My Match Results</span>
          </h3>
          <div className="h-32 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-dashed border-slate-200 dark:border-dark-850 flex items-center justify-center p-6 text-center text-slate-400 text-sm font-semibold">
            {resultsPlaceholder}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
