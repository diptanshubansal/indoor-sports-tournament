import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Trophy, Plus, RefreshCw, X, Check, ShieldAlert, Award, Eye } from 'lucide-react';

const Leaderboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tournaments, setTournaments] = useState([]);
  const [selectedTournament, setSelectedTournament] = useState('');
  const [standings, setStandings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Match report modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [matchForm, setMatchForm] = useState({
    teamAId: '',
    teamBId: '',
    scoreA: '',
    scoreB: '',
    winnerId: '',
    isDraw: false,
  });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const loadTournaments = async () => {
    try {
      const response = await api.get('/tournaments');
      if (response.data.success) {
        const activeT = response.data.data.filter(t => !t.isArchived);
        setTournaments(activeT);
        if (activeT.length > 0) {
          setSelectedTournament(activeT[0]._id);
        }
      }
    } catch (err) {
      showToast('Failed to load tournaments list', 'error');
    }
  };

  const loadStandings = async () => {
    if (!selectedTournament) return;
    try {
      setLoading(true);
      const response = await api.get(`/leaderboard?tournamentId=${selectedTournament}`);
      if (response.data.success) {
        setStandings(response.data.data);
      }
    } catch (err) {
      showToast('Failed to fetch leaderboard standings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTournaments();
  }, []);

  useEffect(() => {
    loadStandings();
  }, [selectedTournament]);

  const handleOpenReportMatch = async () => {
    if (!selectedTournament) return;
    try {
      // Get teams for selected tournament
      const response = await api.get(`/teams?tournamentId=${selectedTournament}`);
      if (response.data.success) {
        setTeams(response.data.data);
        setMatchForm({
          teamAId: '',
          teamBId: '',
          scoreA: '',
          scoreB: '',
          winnerId: '',
          isDraw: false,
        });
        setIsModalOpen(true);
      }
    } catch (err) {
      showToast('Failed to load tournament teams', 'error');
    }
  };

  const handleMatchFormChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setMatchForm({ ...matchForm, [e.target.name]: val });
  };

  const handlePostMatch = async (e) => {
    e.preventDefault();
    const { teamAId, teamBId, winnerId, isDraw } = matchForm;
    if (teamAId === teamBId) {
      showToast('Cannot report a match between the same team', 'warning');
      return;
    }
    if (!isDraw && !winnerId) {
      showToast('Please specify a winning team or check the draw box', 'warning');
      return;
    }

    try {
      const response = await api.post('/leaderboard/match-result', {
        tournamentId: selectedTournament,
        ...matchForm,
      });

      if (response.data.success) {
        showToast('Match outcomes recorded successfully!', 'success');
        setIsModalOpen(false);
        loadStandings();
      }
    } catch (err) {
      showToast('Failed to report match score', 'error');
    }
  };

  const handleResetStandings = async () => {
    if (!window.confirm('Are you sure you want to reset all standing metrics? Wins, losses, and point calculations will be erased back to zero.')) return;
    try {
      const response = await api.post(`/leaderboard/reset/${selectedTournament}`);
      if (response.data.success) {
        showToast('Standings reset successfully', 'success');
        loadStandings();
      }
    } catch (err) {
      showToast('Failed to reset leaderboard', 'error');
    }
  };

  const handleSyncTeams = async () => {
    try {
      const response = await api.post(`/leaderboard/initialize/${selectedTournament}`);
      if (response.data.success) {
        showToast('Leaderboard synced with teams successfully', 'success');
        loadStandings();
      }
    } catch (err) {
      showToast('Failed to sync leaderboard teams', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Leaderboards</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Standings, matches played, point tallies, and ranks.</p>
        </div>

        {isEditable && selectedTournament && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleOpenReportMatch}
              className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm border border-primary-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>Report Match Result</span>
            </button>
            <button
              onClick={handleResetStandings}
              className="flex items-center justify-center gap-2 bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 dark:border-dark-800 shadow-sm"
              title="Reset scores"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Reset</span>
            </button>
          </div>
        )}
      </div>

      {/* Select Tournament Box */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center gap-4 justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary-500" />
          <h3 className="font-extrabold text-base text-slate-800 dark:text-white">Standings for</h3>
          <select
            value={selectedTournament}
            onChange={(e) => setSelectedTournament(e.target.value)}
            className="bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3.5 text-sm font-bold focus:outline-none text-slate-700 dark:text-white"
          >
            {tournaments.map((t) => (
              <option key={t._id} value={t._id}>{t.name} ({t.gameType.replace('_', ' ')})</option>
            ))}
          </select>
        </div>

        {isEditable && selectedTournament && (
          <button
            onClick={handleSyncTeams}
            className="text-xs bg-slate-50 hover:bg-slate-100 dark:bg-dark-950 dark:hover:bg-dark-850 border border-slate-200 dark:border-dark-800 rounded-xl py-2 px-3 text-slate-700 dark:text-dark-300 font-bold"
          >
            Sync Teams to Leaderboard
          </button>
        )}
      </div>

      {/* Standings Grid Table */}
      {loading ? (
        <TableSkeleton rows={5} cols={8} />
      ) : standings.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <Award className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">Standings Empty</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">This tournament leaderboard has no active team registrations.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6 text-center">Rank</th>
                  <th className="py-4 px-6">Team Name</th>
                  <th className="py-4 px-6 text-center">Matches</th>
                  <th className="py-4 px-6 text-center text-emerald-600 dark:text-emerald-400">Wins</th>
                  <th className="py-4 px-6 text-center text-rose-600 dark:text-rose-400">Losses</th>
                  <th className="py-4 px-6 text-center text-amber-600 dark:text-amber-400">Draws</th>
                  <th className="py-4 px-6 text-center">Net Score</th>
                  <th className="py-4 px-6 text-center font-black">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {standings.map((row) => (
                  <tr key={row._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 transition-colors">
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black border ${
                        row.rank === 1 ? 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400' :
                        row.rank === 2 ? 'bg-slate-150 text-slate-700 border-slate-300 dark:bg-dark-800 dark:text-dark-300' :
                        row.rank === 3 ? 'bg-orange-100 text-orange-850 border-orange-350 dark:bg-orange-950/30 dark:text-orange-400' :
                        'bg-slate-50 text-slate-500 border-slate-200 dark:bg-dark-950 dark:text-dark-500 dark:border-dark-850'
                      }`}>
                        {row.rank}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-800 dark:text-white">{row.teamId?.name || 'Deleted Team'}</div>
                      <div className="text-[10px] text-slate-400 font-semibold">{row.teamId?.teamManager ? `Mgr: ${row.teamId?.teamManager}` : ''}</div>
                    </td>
                    <td className="py-4 px-6 text-center font-semibold text-slate-650 dark:text-dark-300">{row.matchesPlayed}</td>
                    <td className="py-4 px-6 text-center text-emerald-600 dark:text-emerald-400 font-bold">{row.wins}</td>
                    <td className="py-4 px-6 text-center text-rose-600 dark:text-rose-400 font-bold">{row.losses}</td>
                    <td className="py-4 px-6 text-center text-amber-600 dark:text-amber-400 font-bold">{row.draws}</td>
                    <td className="py-4 px-6 text-center font-medium">{row.netScore > 0 ? `+${row.netScore}` : row.netScore}</td>
                    <td className="py-4 px-6 text-center font-black text-slate-900 dark:text-white text-base">{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Report Match Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">Report Game Scores</h2>

            <form onSubmit={handlePostMatch} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Team A</label>
                  <select
                    name="teamAId"
                    value={matchForm.teamAId}
                    onChange={handleMatchFormChange}
                    className="w-full bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none"
                    required
                  >
                    <option value="">Select Team A</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Team B</label>
                  <select
                    name="teamBId"
                    value={matchForm.teamBId}
                    onChange={handleMatchFormChange}
                    className="w-full bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none"
                    required
                  >
                    <option value="">Select Team B</option>
                    {teams.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Score Team A</label>
                  <input
                    type="number"
                    name="scoreA"
                    value={matchForm.scoreA}
                    onChange={handleMatchFormChange}
                    placeholder="e.g. 21"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Score Team B</label>
                  <input
                    type="number"
                    name="scoreB"
                    value={matchForm.scoreB}
                    onChange={handleMatchFormChange}
                    placeholder="e.g. 19"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Game Outcome Winner</label>
                <select
                  name="winnerId"
                  value={matchForm.winnerId}
                  onChange={handleMatchFormChange}
                  disabled={matchForm.isDraw}
                  className="w-full bg-slate-50 border border-slate-250 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none disabled:opacity-50"
                  required={!matchForm.isDraw}
                >
                  <option value="">Select Victorious Team</option>
                  {teams
                    .filter(t => t._id === matchForm.teamAId || t._id === matchForm.teamBId)
                    .map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                </select>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isDraw"
                  name="isDraw"
                  checked={matchForm.isDraw}
                  onChange={handleMatchFormChange}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 dark:bg-dark-950 border-dark-800"
                />
                <label htmlFor="isDraw" className="text-xs font-bold text-slate-650 dark:text-dark-400 select-none cursor-pointer">
                  Match ended in a Draw
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md"
                >
                  Record Match
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
