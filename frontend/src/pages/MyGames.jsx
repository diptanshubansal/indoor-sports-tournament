import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { 
  Trophy, Activity, Play, CheckCircle2,
  Crown, Target, Swords, Gamepad2, Users, Flame, Sparkles, Dice5
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

const MyGames = () => {
  const { showToast } = useToast();
  const [games, setGames] = useState([]);
  const [matchInfo, setMatchInfo] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        setLoading(true);
        const response = await api.get('/participants/my-dashboard');
        if (response.data.success) {
          setGames(response.data.data.enrolledGames || response.data.data.games || []);
          setMatchInfo(response.data.data.matchInfo || {});
        }
      } catch (error) {
        showToast('Failed to fetch registered games', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchGames();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-500 dark:text-dark-400">Loading registered games...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Gamepad2 className="w-8 h-8 text-primary-500" />
          <span>My Enrolled Games</span>
        </h1>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">View the games and sports you are officially competing in.</p>
      </div>

      {games.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl py-16 text-center shadow-sm">
          <Activity className="w-12 h-12 mx-auto text-slate-350 dark:text-dark-850 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Registered Games</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">You are not enrolled in any sports. Contact the tournament coordinators if this is an error.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {games.map((game, index) => {
            const GameIcon = getGameIcon(game);
            const match = matchInfo[game];
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
                    {match ? (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">Round</span>
                          <span className="text-slate-700 dark:text-white font-bold">Round {match.roundNumber}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-dark-850">
                          <span className="text-slate-400 font-semibold">{match.byeStatus === 'Bye - Advanced' ? 'Bye Status' : 'Opponent'}</span>
                          <span className="text-slate-700 dark:text-white font-bold truncate max-w-[130px]">
                            {match.byeStatus === 'Bye - Advanced' ? 'Bye - Advanced' : match.opponentId || 'TBD'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-dark-850">
                          <span className="text-slate-400 font-semibold">Result Status</span>
                          <span className="text-slate-500 dark:text-dark-400 font-bold">{match.resultStatus || match.matchStatus}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-semibold">Fixture status</span>
                          <span className="text-slate-500 dark:text-dark-400 font-bold italic">Not Scheduled</span>
                        </div>
                        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 dark:border-dark-850">
                          <span className="text-slate-400 font-semibold">Match Results</span>
                          <span className="text-slate-500 dark:text-dark-400 font-bold italic">Pending</span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyGames;
