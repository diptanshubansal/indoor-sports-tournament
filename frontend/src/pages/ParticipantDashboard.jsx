import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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

  const { participantId, name, phone, email, games, tournamentDetails, fixturesPlaceholder, resultsPlaceholder, tournament } = data;

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
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Indoor Sports Tournament</h1>
          <p className="text-sm text-slate-350 max-w-xl font-bold uppercase tracking-wider">
            Bathinda Branch of NIRC of ICAI
          </p>
        </div>

        <div className="bg-white/10 dark:bg-dark-800/40 backdrop-blur-md border border-white/10 rounded-2xl p-4 shrink-0 shadow-lg relative z-10 self-start md:self-center">
          <div className="text-[10px] text-slate-300 font-bold uppercase tracking-wider">Player ID</div>
          <div className="text-2xl font-extrabold tracking-widest text-primary-400 mt-0.5">{participantId}</div>
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
              const match = data.matchInfo && data.matchInfo[game];
              return (
                <div 
                  key={index} 
                  className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group flex flex-col justify-between"
                >
                  <div className="absolute right-0 top-0 w-14 h-14 bg-indigo-500/5 dark:bg-indigo-950/20 rounded-bl-3xl flex items-center justify-center text-indigo-500 dark:text-indigo-400">
                    <GameIcon className="w-5 h-5 opacity-60 group-hover:scale-110 transition-transform" />
                  </div>
                
                  <div className="space-y-4 flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-extrabold text-slate-800 dark:text-white text-lg truncate pr-4">{game}</h3>
                      <span className="bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-emerald-200/50 dark:border-emerald-800/30 flex items-center gap-1 shrink-0">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Enrolled
                      </span>
                    </div>

                    <div className="space-y-2 bg-slate-50 dark:bg-dark-950 p-3 rounded-2xl border border-slate-100 dark:border-dark-900 text-xs">
                      {tournament && (
                        <div className="pb-2 mb-2 border-b border-slate-200 dark:border-dark-850 space-y-1 text-slate-500 dark:text-dark-400">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span className="font-semibold text-[10px] uppercase tracking-wider">Schedule:</span>
                            <span className="text-slate-800 dark:text-white font-bold">
                              {new Date(tournament.startDate).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3.5 h-3.5 text-primary-500 shrink-0" />
                            <span className="font-semibold text-[10px] uppercase tracking-wider">Venue:</span>
                            <span className="text-slate-800 dark:text-white font-bold truncate max-w-[170px]">{tournament.venue}</span>
                          </div>
                        </div>
                      )}

                      {match ? (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 font-semibold">Current Round:</span>
                            <span className="text-slate-800 dark:text-white font-bold">Round {match.roundNumber}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-dark-850">
                            <span className="text-slate-400 font-semibold">{match.byeStatus === 'Bye - Advanced' ? 'Bye Status:' : 'Opponent:'}</span>
                            <span className="text-slate-850 dark:text-slate-200 font-bold truncate max-w-[120px]">
                              {match.byeStatus === 'Bye - Advanced' ? 'Bye - Advanced' : `${match.opponentId || 'TBD'}${match.opponentName ? ` (${match.opponentName})` : ''}`}
                            </span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-dark-850">
                            <span className="text-slate-400 font-semibold">Match Status:</span>
                            <span className={`font-bold uppercase ${
                              ['Won', 'Champion', 'Runner-Up', 'Bye - Advanced'].includes(match.matchStatus) ? 'text-emerald-600 dark:text-emerald-400' :
                              match.matchStatus === 'Lost' ? 'text-rose-600 dark:text-rose-400' :
                              'text-indigo-605 dark:text-indigo-400'
                            }`}>{match.matchStatus}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-dark-850">
                            <span className="text-slate-400 font-semibold">Result Status:</span>
                            <span className="text-slate-550 dark:text-dark-400 font-bold">{match.resultStatus || match.matchStatus}</span>
                          </div>
                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-100 dark:border-dark-850">
                            <span className="text-slate-400 font-semibold">Tournament:</span>
                            <span className="text-slate-550 dark:text-dark-400 font-bold">{match.tournamentStatus}</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-semibold">Fixture status:</span>
                            <span className="text-slate-550 dark:text-dark-400 font-bold italic">Not Scheduled</span>
                          </div>
                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-dark-850">
                            <span className="text-slate-400 font-semibold">Match Results:</span>
                            <span className="text-slate-550 dark:text-dark-400 font-bold italic">Pending</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 pt-2">
                    <button
                      onClick={() => {
                        if (data.tournamentId) {
                          navigate(`/tournament-room/${data.tournamentId}`);
                        } else {
                          showToast('No active tournament event found.', 'info');
                        }
                      }}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-slate-50 dark:bg-dark-950 border border-slate-250 dark:border-dark-850 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                    >
                      <Trophy className="w-3.5 h-3.5 text-primary-500" />
                      <span>Enter Game Bracket Room</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixtures & Results grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Fixtures Section */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
            <Play className="w-5 h-5 text-primary-500" />
            <span>My Match Fixtures</span>
          </h3>
          <div className="flex items-center justify-center min-h-[8rem]">
            {data.nextFixture ? (
              <div className="space-y-3 w-full text-left text-xs">
                <div className="flex justify-between items-center bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-100 dark:border-dark-850">
                  <div>
                    <div className="font-extrabold text-sm text-slate-800 dark:text-white flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-primary-500" />
                      <span>{data.nextFixture.gameName}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase mt-1">Round {data.nextFixture.roundNumber}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] text-slate-400 font-bold uppercase">Opponent</div>
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {data.nextFixture.isBye ? 'Bye - Advanced' : data.nextFixture.opponentId ? `${data.nextFixture.opponentName || data.nextFixture.opponentId} (${data.nextFixture.opponentId})` : 'TBD'}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[10px] text-slate-450 dark:text-dark-500 px-1 font-bold">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary-500" />
                    Status: {data.nextFixture.status}
                  </span>
                  {tournament && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-primary-500" />
                      {tournament.venue}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full h-32 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-dashed border-slate-200 dark:border-dark-850 flex items-center justify-center p-6 text-center text-slate-400 text-sm font-semibold">
                {fixturesPlaceholder}
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white pb-3 border-b border-slate-100 dark:border-dark-800 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary-500" />
            <span>My Match Results</span>
          </h3>
          <div className="flex items-center justify-center min-h-[8rem]">
            {data.completedMatches && data.completedMatches.length > 0 ? (
              <div className="space-y-2.5 w-full text-left text-xs max-h-48 overflow-y-auto pr-1">
                {data.completedMatches.map((match, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-dark-950 p-3 rounded-2xl border border-slate-100 dark:border-dark-850">
                    <div>
                      <div className="font-extrabold text-slate-800 dark:text-white flex items-center gap-1">
                        <span>{match.gameName}</span>
                        <span className="text-[9px] text-slate-400 font-bold uppercase">(Rd {match.roundNumber})</span>
                      </div>
                      <div className="text-[9px] text-slate-450 mt-0.5">
                        {match.isBye ? 'Bye - Advanced' : `VS ${match.opponentName || match.opponentId} (${match.opponentId})`}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        match.resultStatus.startsWith('Won') || match.resultStatus === 'Bye - Advanced'
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' 
                          : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-400'
                      }`}>
                        {match.resultStatus}
                      </span>
                      {match.score && <div className="text-[9px] text-slate-400 font-bold mt-1">Score: {match.score}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="w-full h-32 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-dashed border-slate-200 dark:border-dark-850 flex items-center justify-center p-6 text-center text-slate-400 text-sm font-semibold">
                {resultsPlaceholder}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParticipantDashboard;
