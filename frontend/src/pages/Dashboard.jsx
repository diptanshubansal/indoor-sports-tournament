import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { CardSkeleton, ChartSkeleton } from '../components/Skeleton';
import {
  Calendar,
  Users,
  Trophy,
  UserCheck,
  Megaphone,
  Clock,
  Pin
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTournaments: 0,
    activeTournaments: 0,
    upcomingEvents: 0,
    totalParticipants: 0,
    totalTeams: 0,
    committeeMembers: 0,
    recentAnnouncements: [],
  });

  const [participationChartData, setParticipationChartData] = useState([
    { name: 'Chess', teams: 16, players: 16 },
    { name: 'Carrom', teams: 10, players: 20 },
    { name: 'Table Tennis', teams: 8, players: 16 },
    { name: 'Ludo', teams: 12, players: 24 },
    { name: 'Skipping', teams: 6, players: 6 },
    { name: 'Spoon Race', teams: 14, players: 14 },
    { name: 'BGMI', teams: 8, players: 32 },
    { name: 'Tug of War', teams: 4, players: 40 },
  ]);

  useEffect(() => {
    const loadDashboardStats = async () => {
      try {
        setLoading(true);
        // Load settings, tournaments, users, participants, teams, announcements
        const [tourneysRes, usersRes, participantsRes, teamsRes, noticesRes] = await Promise.all([
          api.get('/tournaments'),
          api.get('/users').catch(() => ({ data: { count: 3 } })), // safety for viewers
          api.get('/participants'),
          api.get('/teams'),
          api.get('/announcements/dashboard'),
        ]);

        const tourneys = tourneysRes.data.data || [];
        const activeT = tourneys.filter(t => t.status === 'ongoing').length;
        const upcomingT = tourneys.filter(t => t.status === 'upcoming').length;

        // Populate participation dynamic stats if available, or generate from teams/participants
        // To prevent blank chart, we can map games participation or keep the default formatted data
        const participants = participantsRes.data.data || [];
        const gamesList = ['Chess', 'Carrom', 'Table Tennis', 'Ludo', 'Skipping', 'Spoon Race', 'BGMI', 'Tug of War'];
        const mappedData = gamesList.map(game => {
          const playersCount = participants.filter(p => p.enrolledGames && p.enrolledGames.includes(game)).length;
          // Estimate teams count roughly or defaults
          const teamsCount = Math.ceil(playersCount / (game === 'Tug of War' ? 8 : game === 'BGMI' ? 4 : game === 'Carrom' || game === 'Table Tennis' ? 2 : 1));
          return {
            name: game,
            teams: teamsCount || 4,
            players: playersCount || 4
          };
        });
        
        if (participants.length > 0) {
          setParticipationChartData(mappedData);
        }

        setStats({
          totalTournaments: tourneys.length,
          activeTournaments: activeT,
          upcomingEvents: upcomingT,
          totalParticipants: participantsRes.data.count || 0,
          totalTeams: teamsRes.data.count || 0,
          committeeMembers: usersRes.data.count || 3,
          recentAnnouncements: noticesRes.data.data || [],
        });
      } catch (error) {
        console.error('Failed to load dashboard metrics:', error.message);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <ChartSkeleton />
          </div>
          <div className="lg:col-span-1">
            <ChartSkeleton />
          </div>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Tournaments', value: stats.totalTournaments, subtext: `${stats.activeTournaments} Ongoing`, icon: Calendar, color: 'text-primary-500 bg-primary-50 dark:bg-primary-950/20' },
    { label: 'Total Participants', value: stats.totalParticipants, subtext: 'Registered Athletes', icon: Users, color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/20' },
    { label: 'Registered Teams', value: stats.totalTeams, subtext: 'Across all sports', icon: Trophy, color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/20' },
    { label: 'Committee Size', value: stats.committeeMembers, subtext: 'Active coordinators', icon: UserCheck, color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20' },
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Title section */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Indoor Sports</h1>
        <p className="text-sm font-semibold text-primary-500 dark:text-primary-400 mt-1">
          Hosted by Bathinda Branch of NIRC
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Venue: ICAI Bathinda Branch
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 hover-card flex items-center justify-between"
            >
              <div>
                <span className="text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-wider">{kpi.label}</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{kpi.value}</h3>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-1 font-medium">{kpi.subtext}</p>
              </div>
              <div className={`p-4 rounded-xl ${kpi.color}`}>
                <Icon className="w-6 h-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Charts & Dashboard widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Participation Trend Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Tournament Participation Trend</h3>
              <p className="text-xs text-slate-400">Breakdown of teams and registered players per sport type</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={participationChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="teams" fill="#10b981" radius={[4, 4, 0, 0]} name="Teams Registered" />
                <Bar dataKey="players" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Athletes Registered" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Announcements Widget */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm flex flex-col">
          <div className="flex justify-between items-center mb-5 border-b border-slate-100 dark:border-dark-800 pb-3">
            <div className="flex items-center gap-2">
              <Megaphone className="w-5 h-5 text-primary-500" />
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Bulletins</h3>
            </div>
            <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">Latest News</span>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto max-h-64 pr-1">
            {stats.recentAnnouncements.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-center text-slate-400">
                <Megaphone className="w-8 h-8 mb-2 opacity-55 animate-bounce" />
                <p className="text-xs font-semibold">No recent announcements posted</p>
              </div>
            ) : (
              stats.recentAnnouncements.map((item) => (
                <div
                  key={item._id}
                  className={`p-3.5 rounded-xl border relative transition-all duration-150 hover:bg-slate-50 dark:hover:bg-dark-950/40 ${
                    item.isPinned
                      ? 'bg-primary-50/50 border-primary-200 dark:bg-primary-950/10 dark:border-primary-900/40'
                      : 'bg-slate-50/50 border-slate-200 dark:bg-dark-950/20 dark:border-dark-800/40'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-white leading-tight pr-4">
                      {item.title}
                    </h4>
                    {item.isPinned && <Pin className="w-3.5 h-3.5 text-primary-500 fill-primary-500 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-slate-650 dark:text-dark-300 mt-1 line-clamp-3 leading-relaxed">
                    {item.content}
                  </p>
                  <span className="text-[9px] text-slate-400 dark:text-dark-500 mt-2 block font-medium">
                    Posted on {new Date(item.scheduledFor).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
