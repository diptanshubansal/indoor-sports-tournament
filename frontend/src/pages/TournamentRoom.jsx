import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import {
  Trophy, Award, Play, CheckCircle2, AlertTriangle, RefreshCw,
  ArrowRight, ShieldAlert, GitMerge, UserMinus, UserPlus, Trash2,
  Lock, Settings, Eye, HelpCircle, Edit3, X, Zap, Swords, Calendar, Users
} from 'lucide-react';

const TournamentRoom = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { showToast } = useToast();

  const [tournament, setTournament] = useState(null);
  const [games, setGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(searchParams.get('game') || 'Chess');
  const [gameDetail, setGameDetail] = useState(null);
  const [bracket, setBracket] = useState([]);
  const [eligiblePlayers, setEligiblePlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [enrollmentError, setEnrollmentError] = useState(false);
  const [championName, setChampionName] = useState(null);
  const [runnerUpName, setRunnerUpName] = useState(null);

  // Override Form states
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideAction, setOverrideAction] = useState(''); // swap, replace, remove, add, bye, reopenRound, disqualify, withdraw, walkover
  const [overrideForm, setOverrideForm] = useState({
    match1Id: '', match2Id: '', player1Id: '', player2Id: '',
    matchId: '', oldPlayerId: '', newPlayerId: '', playerId: '',
    roundId: '', newByePlayerId: '', winnerId: '', disqualifiedPlayerId: '',
    withdrawnPlayerId: '', score: ''
  });

  // Winner Entry states
  const [winnerModalOpen, setWinnerModalOpen] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [winnerId, setWinnerId] = useState('');
  const [matchScore, setMatchScore] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const isAdmin = user?.role === 'admin';
  const isWritable = isSuperAdmin || isAdmin;
  const isParticipant = user?.role === 'participant';

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch tournament details
      const tourneyRes = await api.get(`/tournaments/${id}`);
      if (tourneyRes.data.success) {
        setTournament(tourneyRes.data.data);
      }

      // Fetch or associate games
      const gamesRes = await api.get(`/tournament-engine/games/${id}`);
      let resolvedGame = selectedGame;
      if (gamesRes.data.success) {
        setGames(gamesRes.data.data);
        if (gamesRes.data.data.length > 0) {
          const hasSelectedGame = gamesRes.data.data.some(g => g.gameName === selectedGame);
          if (!hasSelectedGame) {
            resolvedGame = gamesRes.data.data[0].gameName;
            setSelectedGame(resolvedGame);
          }
        }
      }

      // Check enrollment if participant (using the resolved game name)
      if (isParticipant) {
        // Fetch participant detail using current user ID
        const partDashboardRes = await api.get('/participants/my-dashboard');
        if (partDashboardRes.data.success) {
          const participant = partDashboardRes.data.data;
          const isEnrolled = participant.enrolledGames.includes(resolvedGame);
          if (!isEnrolled) {
            setEnrollmentError(true);
            setLoading(false);
            return;
          }
          setEnrollmentError(false);
        }
      }

      if (gamesRes.data.success) {
        const matchedGame = gamesRes.data.data.find(g => g.gameName === resolvedGame);
        if (matchedGame) {
          setGameDetail(matchedGame);
          const eligibleUrl = resolvedGame === 'Chess'
            ? `/tournament-engine/chess/participants`
            : `/tournament-engine/games/${matchedGame._id}/eligible-players`;
          const eligibleRes = await api.get(eligibleUrl);
          if (eligibleRes.data.success) {
            setEligiblePlayers(eligibleRes.data.data);
          }
          // Fetch bracket
          const bracketUrl = resolvedGame === 'Chess'
            ? `/tournament-engine/chess/bracket/${id}`
            : `/tournament-engine/games/${matchedGame._id}/bracket`;
          const bracketRes = await api.get(bracketUrl);
          if (bracketRes.data.success) {
            const bracketData = resolvedGame === 'Chess' ? bracketRes.data.data.rounds : bracketRes.data.data;
            setBracket(bracketData);
            if (resolvedGame === 'Chess') {
              setChampionName(bracketRes.data.data.championName);
              setRunnerUpName(bracketRes.data.data.runnerUpName);
            }
          }
        } else {
          setGameDetail(null);
          setBracket([]);
          setEligiblePlayers([]);
          setChampionName(null);
          setRunnerUpName(null);
        }
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to retrieve data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id, selectedGame]);

  const handleInitializeGame = async () => {
    try {
      setActionLoading(true);
      const res = await api.post('/tournament-engine/games', {
        tournamentId: id,
        gameName: selectedGame
      });
      if (res.data.success) {
        showToast(`Initialized ${selectedGame} tournament space!`, 'success');
        fetchData();
      }
    } catch (err) {
      showToast('Initialization failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!gameDetail) return;
    try {
      setActionLoading(true);
      const res = await api.put(`/tournament-engine/games/${gameDetail._id}/status`, {
        status: newStatus
      });
      if (res.data.success) {
        showToast(`Status updated to ${newStatus}`, 'success');
        fetchData();
      }
    } catch (err) {
      showToast('Status change failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateFixtures = async () => {
    if (!gameDetail) return;
    try {
      setActionLoading(true);
      const url = selectedGame === 'Chess'
        ? `/tournament-engine/chess/generate-fixtures`
        : `/tournament-engine/games/${gameDetail._id}/generate-fixtures`;
      const payload = selectedGame === 'Chess' ? { tournamentId: id } : {};
      const res = await api.post(url, payload);
      if (res.data.success) {
        showToast('Knockout fixtures generated successfully!', 'success');
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Fixture generation failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateNextRound = async () => {
    if (!gameDetail) return;
    try {
      setActionLoading(true);
      const url = selectedGame === 'Chess'
        ? `/tournament-engine/chess/generate-next-round`
        : `/tournament-engine/games/${gameDetail._id}/next-round`;
      const payload = selectedGame === 'Chess'
        ? { tournamentId: id, currentRoundNumber: latestRound?.roundNumber || 1 }
        : {};
      const res = await api.post(url, payload);
      if (res.data.success) {
        showToast(res.data.message || 'Next round fixtures generated!', 'success');
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to progress to next round', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openWinnerModal = (match) => {
    setSelectedMatch(match);
    setWinnerId(match.player1Id);
    setMatchScore('');
    setWinnerModalOpen(true);
  };

  const submitWinner = async (e) => {
    e.preventDefault();
    if (!selectedMatch) return;
    try {
      setActionLoading(true);
      const url = selectedGame === 'Chess'
        ? `/tournament-engine/chess/match/${selectedMatch._id}/winner`
        : `/tournament-engine/matches/${selectedMatch._id}/winner`;
      const payload = selectedGame === 'Chess'
        ? { winnerParticipantId: winnerId, score: matchScore }
        : { winnerId, score: matchScore };
      const res = await api.post(url, payload);
      if (res.data.success) {
        showToast('Winner recorded successfully!', 'success');
        setWinnerModalOpen(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save match result', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Submit Override action
  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    
    // Warning validation for completed rounds edits
    if (['reopenRound', 'regenerateRound'].includes(overrideAction)) {
      const confirmWarning = window.confirm('WARNING: This action may affect tournament standings and future rounds. Do you wish to proceed?');
      if (!confirmWarning) return;
    }

    try {
      setActionLoading(true);
      let endpoint = '';
      let payload = { ...overrideForm };

      switch (overrideAction) {
        case 'swap':
          endpoint = '/tournament-engine/override/swap-players';
          break;
        case 'replace':
          endpoint = '/tournament-engine/override/replace-player';
          break;
        case 'remove':
          endpoint = '/tournament-engine/override/remove-player';
          break;
        case 'add':
          endpoint = '/tournament-engine/override/add-player';
          break;
        case 'bye':
          endpoint = '/tournament-engine/override/change-bye';
          break;
        case 'regenerateRound':
          endpoint = '/tournament-engine/override/regenerate-round';
          break;
        case 'editWinner':
          endpoint = '/tournament-engine/override/edit-winner';
          break;
        case 'reopenMatch':
          endpoint = '/tournament-engine/override/reopen-match';
          break;
        case 'reopenRound':
          endpoint = '/tournament-engine/override/reopen-round';
          break;
        case 'walkover':
          endpoint = '/tournament-engine/override/walkover';
          break;
        case 'disqualify':
          endpoint = '/tournament-engine/override/disqualify';
          break;
        case 'withdraw':
          endpoint = '/tournament-engine/override/withdraw';
          break;
        default:
          return;
      }

      const res = await api.post(endpoint, payload);
      if (res.data.success) {
        showToast(res.data.message || 'Override applied successfully!', 'success');
        setShowOverrideModal(false);
        fetchData();
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Override failed', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const openOverrideModal = (action, initialFields = {}) => {
    setOverrideAction(action);
    setOverrideForm({
      match1Id: '', match2Id: '', player1Id: '', player2Id: '',
      matchId: '', oldPlayerId: '', newPlayerId: '', playerId: '',
      roundId: '', newByePlayerId: '', winnerId: '', disqualifiedPlayerId: '',
      withdrawnPlayerId: '', score: '', ...initialFields
    });
    setShowOverrideModal(true);
  };

  const completedStatuses = ['completed', 'walkover', 'disqualified', 'withdrawn'];
  const latestRound = bracket[bracket.length - 1];
  const latestRoundComplete = latestRound?.matches?.length > 0
    && latestRound.matches.every((match) => completedStatuses.includes(match.status));
  const canGenerateNextRound = gameDetail?.status === 'Tournament Running' && latestRoundComplete;

  if (loading) {
    return <TableSkeleton rows={5} cols={5} />;
  }

  if (enrollmentError) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl shadow-sm">
        <Lock className="w-12 h-12 mx-auto text-rose-500 mb-4 animate-bounce" />
        <h3 className="text-lg font-black text-slate-800 dark:text-white">Access Restricted</h3>
        <p className="text-xs text-slate-450 dark:text-dark-500 mt-2 max-w-sm mx-auto leading-relaxed">
          Only participants registered in **{selectedGame}** can enter this tournament room. If you are enrolled in other sports, please select them.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-4 py-2 rounded-xl text-xs"
        >
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in pb-12">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase text-primary-500 tracking-wider">Tournament - {selectedGame} Engine / {selectedGame} Fixtures</span>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white mt-1">{tournament?.name}</h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Venue: {tournament?.venue} | Starts: {tournament?.startDate ? new Date(tournament.startDate).toLocaleString() : 'Not set'}
          </p>
        </div>

        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl px-4 py-3 shadow-sm">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Active Game</div>
          <div className="text-sm font-black text-slate-850 dark:text-white">{selectedGame}</div>
        </div>
      </div>

      {/* Initialize / Missing space placeholder */}
      {!gameDetail ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl py-16 text-center shadow-sm max-w-xl mx-auto space-y-4">
          <Swords className="w-12 h-12 text-slate-350 dark:text-dark-850 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-extrabold text-slate-700 dark:text-white">Tournament Engine Not Active</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
              No tournament room or bracket matches have been generated for **{selectedGame}** yet.
            </p>
          </div>
          {isWritable && (
            <button
              onClick={handleInitializeGame}
              disabled={actionLoading}
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-6 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
            >
              Initialize {selectedGame} Engine
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Status and Action bar */}
          <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-500 flex items-center justify-center shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Engine Status</div>
                <div className="text-sm font-black text-slate-800 dark:text-white flex items-center gap-2 mt-0.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    gameDetail.status === 'Tournament Completed' ? 'bg-slate-400' :
                    gameDetail.status === 'Tournament Running' ? 'bg-emerald-500 animate-pulse' :
                    'bg-blue-400'
                  }`}></span>
                  {gameDetail.status}
                </div>
              </div>
            </div>

            {/* Quick status transitions for Admins */}
            {isWritable && (
              <div className="flex flex-wrap gap-2 items-center border border-slate-100 dark:border-dark-850 bg-slate-50/50 dark:bg-dark-950/20 p-2 rounded-2xl">
                {/* Open for Room Entry */}
                {(gameDetail.status === 'Draft' || gameDetail.status === 'Registration Closed' || gameDetail.status === 'Tournament Completed') && (
                  <button
                    onClick={() => handleStatusChange('Registration Open')}
                    className="bg-indigo-650 hover:bg-indigo-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Open Game for Room Entry
                  </button>
                )}

                {/* Close Room Entry */}
                {gameDetail.status === 'Registration Open' && (
                  <button
                    onClick={() => handleStatusChange('Registration Closed')}
                    className="bg-slate-700 hover:bg-slate-800 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Close Room Entry
                  </button>
                )}

                {/* Start Game */}
                {(gameDetail.status === 'Registration Open' || gameDetail.status === 'Registration Closed') && (
                  <button
                    onClick={() => handleStatusChange('Tournament Running')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Start Game
                  </button>
                )}

                {/* Complete Game */}
                {gameDetail.status === 'Tournament Running' && (
                  <button
                    onClick={() => handleStatusChange('Tournament Completed')}
                    className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Complete Game
                  </button>
                )}

                {/* Reopen Room Entry option during active game */}
                {gameDetail.status === 'Tournament Running' && (
                  <button
                    onClick={() => handleStatusChange('Registration Open')}
                    className="bg-slate-650 hover:bg-slate-700 text-white font-bold py-2 px-3.5 rounded-xl text-xs transition-all active:scale-95 shadow-sm"
                  >
                    Reopen Room Entry
                  </button>
                )}

                {/* Game specific generation actions */}
                {selectedGame === 'Chess' && gameDetail.status === 'Registration Closed' && (
                  <button
                    onClick={handleGenerateFixtures}
                    className="bg-teal-600 hover:bg-teal-500 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Generate Chess Fixtures</span>
                  </button>
                )}
                {selectedGame === 'Chess' && canGenerateNextRound && (
                  <button
                    onClick={handleGenerateNextRound}
                    className="bg-indigo-650 hover:bg-indigo-600 text-white font-bold py-2 px-3.5 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center gap-1"
                  >
                    <GitMerge className="w-3.5 h-3.5" />
                    <span>Generate Next Round</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[240px,1fr] gap-6">
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm">
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total {selectedGame} Players</div>
              <div className="text-4xl font-black text-slate-900 dark:text-white mt-2">{eligiblePlayers.length}</div>
              {isWritable && selectedGame === 'Chess' && gameDetail.status === 'Registration Closed' && bracket.length === 0 && (
                <button
                  onClick={handleGenerateFixtures}
                  disabled={actionLoading}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-3 rounded-xl text-xs shadow-md transition-all active:scale-95 flex items-center justify-center gap-1"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Generate Round 1 Fixtures</span>
                </button>
              )}
            </div>
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-sm font-black text-slate-850 dark:text-white">Eligible {selectedGame} Players</h3>
                <span className="text-[10px] font-bold uppercase text-slate-400">enrolledGames includes {selectedGame}</span>
              </div>
              {eligiblePlayers.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center border border-dashed border-slate-200 dark:border-dark-800 rounded-2xl">
                  No active {selectedGame} participants found.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                  {eligiblePlayers.map((player) => (
                    <div key={player._id} className="flex items-center justify-between gap-3 bg-slate-50 dark:bg-dark-950 border border-slate-100 dark:border-dark-850 rounded-xl px-3 py-2 text-xs">
                      <span className="font-black text-slate-800 dark:text-white">{player.participantId}</span>
                      <span className="font-semibold text-slate-500 dark:text-dark-300 truncate">{player.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Summary if Completed */}
          {gameDetail.status === 'Tournament Completed' && (
            <div className="bg-gradient-to-r from-amber-500 to-yellow-500 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-1">
                <h3 className="text-xl font-black flex items-center gap-2">
                  <Award className="w-6 h-6 animate-bounce" />
                  <span>Tournament Completed!</span>
                </h3>
                <p className="text-xs text-white/95">Standings and final brackets have been secured.</p>
              </div>
              <div className="flex gap-6 shrink-0">
                <div className="text-center bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                  <div className="text-[10px] font-black uppercase tracking-wider text-yellow-100">Gold Champion</div>
                  <div className="text-sm font-extrabold mt-0.5">{championName || gameDetail.champion || 'TBD'}</div>
                </div>
                <div className="text-center bg-white/10 px-4 py-2 rounded-2xl border border-white/20">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-100">Silver Runner-Up</div>
                  <div className="text-sm font-extrabold mt-0.5">{runnerUpName || gameDetail.runnerUp || 'TBD'}</div>
                </div>
              </div>
            </div>
          )}

          {/* Bracket / Rounds Layout */}
          {bracket.length === 0 ? (
            <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl py-12 text-center text-slate-400">
              <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-semibold">No rounds created. Start the tournament to generate bracket rounds.</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Bracket Tree Columns */}
              <div>
                <h3 className="text-base font-black text-slate-800 dark:text-white mb-4">Complete Bracket History</h3>
                <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-thin">
                  {bracket.map((round) => (
                    <div key={round._id} className="flex-1 min-w-[240px] space-y-4">
                      {/* Round Header */}
                      <div className="bg-slate-100 dark:bg-dark-850 p-3 rounded-2xl border border-slate-200 dark:border-dark-800 text-center">
                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider">Round {round.roundNumber}</span>
                        <div className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{round.status}</div>
                        {round.byePlayerId && (
                          <div className="text-[9px] text-primary-600 dark:text-primary-400 font-bold mt-1 bg-primary-50 dark:bg-primary-950/20 py-0.5 rounded-lg border border-primary-200/20">
                            Bye: {round.byePlayerName || round.byePlayerId}
                          </div>
                        )}
                      </div>

                      {/* Round Matches */}
                      <div className="space-y-3">
                        {round.matches.map((match) => {
                          const isCompleted = match.status === 'completed' || match.status === 'walkover' || match.status === 'disqualified' || match.status === 'withdrawn';
                          return (
                            <div
                              key={match._id}
                              className={`bg-white dark:bg-dark-900 border rounded-2xl p-3.5 shadow-sm space-y-2 relative group transition-all ${
                                isCompleted ? 'border-slate-200 dark:border-dark-805 opacity-90' : 'border-slate-250 dark:border-dark-800'
                              }`}
                            >
                              {/* Override triggers for Super Admins on match hover */}
                              {isSuperAdmin && (
                                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1 bg-slate-50 dark:bg-dark-950 p-1 rounded-lg border border-slate-200 dark:border-dark-800 shadow-md">
                                  <button
                                    onClick={() => openOverrideModal('swap', { match1Id: match._id, player1Id: match.player1Id, player2Id: match.player2Id })}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-dark-850 rounded text-slate-500 hover:text-indigo-500"
                                    title="Swap Players"
                                  >
                                    <RefreshCw className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => openOverrideModal('replace', { matchId: match._id })}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-dark-850 rounded text-slate-500 hover:text-primary-500"
                                    title="Replace Player"
                                  >
                                    <UserPlus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => openOverrideModal('disqualify', { matchId: match._id })}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-dark-850 rounded text-slate-500 hover:text-rose-500"
                                    title="Disqualify player"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => openOverrideModal('editWinner', { matchId: match._id, winnerId: match.winnerId || match.player1Id })}
                                    className="p-1 hover:bg-slate-200 dark:hover:bg-dark-850 rounded text-slate-500 hover:text-emerald-500"
                                    title="Edit winner"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  {isCompleted && (
                                    <button
                                      onClick={() => openOverrideModal('reopenMatch', { matchId: match._id })}
                                      className="p-1 hover:bg-slate-200 dark:hover:bg-dark-850 rounded text-slate-500 hover:text-amber-500"
                                      title="Reopen match"
                                    >
                                      <RefreshCw className="w-3 h-3" />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Player 1 Card */}
                              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-wider text-slate-400">
                                <span>Match {match.matchNumber || '-'}</span>
                                <span>{isCompleted ? 'Completed' : 'Pending'}</span>
                              </div>
                              <div className={`flex justify-between items-center text-xs p-1.5 rounded-lg ${
                                match.winnerId && match.winnerId === match.player1Id ? 'bg-emerald-50 dark:bg-emerald-950/20 font-bold border border-emerald-200/20' : ''
                              }`}>
                                <span className="truncate pr-2">{match.player1Name}</span>
                                {match.winnerId && match.winnerId === match.player1Id && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                              </div>

                              {/* VS badge */}
                              <div className="text-[10px] text-center font-bold text-slate-400 dark:text-dark-600">VS</div>

                              {/* Player 2 Card */}
                              <div className={`flex justify-between items-center text-xs p-1.5 rounded-lg ${
                                match.winnerId && match.winnerId === match.player2Id ? 'bg-emerald-50 dark:bg-emerald-950/20 font-bold border border-emerald-200/20' : ''
                              }`}>
                                <span className="truncate pr-2">{match.player2Name}</span>
                                {match.winnerId && match.winnerId === match.player2Id && (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                )}
                              </div>

                              {/* Match details & controls footer */}
                              <div className="flex justify-between items-center pt-2 border-t border-slate-100 dark:border-dark-850 text-[10px] text-slate-400">
                                <span>{match.status === 'scheduled' ? 'Pending' : match.score || 'Completed'}</span>
                                {isWritable && match.status === 'scheduled' && (
                                  <button
                                    onClick={() => openWinnerModal(match)}
                                    className="text-primary-600 hover:text-primary-500 font-bold flex items-center gap-0.5"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                    <span>Save Result</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Super Admin Control Panel Tab */}
              {isSuperAdmin && (
                <div className="bg-white dark:bg-dark-900 border border-rose-100 dark:border-rose-950/30 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-black text-rose-600 dark:text-rose-400 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5" />
                    <span>Super Admin Override Panel</span>
                  </h3>
                  <p className="text-xs text-slate-450 dark:text-dark-500 max-w-xl leading-normal">
                    Select manual brackets overrides below to swap player matches, replace participants, assign specific walkover awards, reopen completed rounds, or disqualify entries.
                  </p>

                  <div className="flex flex-wrap gap-2 pt-2">
                    <button
                      onClick={() => openOverrideModal('swap')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Swap Match Players</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('replace')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-primary-500" />
                      <span>Replace Player</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('remove')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <UserMinus className="w-3.5 h-3.5 text-rose-500" />
                      <span>Remove Player</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('add')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <UserPlus className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Add Player to slot</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('bye')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500" />
                      <span>Edit Round Bye</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('regenerateRound', { roundId: latestRound?._id || '' })}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <GitMerge className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Regenerate Current Round</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('editWinner')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Edit Winner</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('reopenMatch')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
                      <span>Reopen Match</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('walkover')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <Award className="w-3.5 h-3.5 text-yellow-500" />
                      <span>Award Walkover</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('disqualify')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-500" />
                      <span>Disqualify Player</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('withdraw')}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-orange-500" />
                      <span>Mark Withdrawal</span>
                    </button>
                    <button
                      onClick={() => openOverrideModal('reopenRound')}
                      className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold py-2 px-3.5 rounded-xl text-xs border border-rose-250/20 flex items-center gap-1"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Reopen Completed Round</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Override Action Dialog Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowOverrideModal(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-black text-slate-900 dark:text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <Settings className="w-5 h-5 text-rose-500" />
              <span>Override: {overrideAction}</span>
            </h3>

            <form onSubmit={handleOverrideSubmit} className="space-y-4">
              {overrideAction === 'swap' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match 1 ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 660f8db..."
                      value={overrideForm.match1Id}
                      onChange={(e) => setOverrideForm({ ...overrideForm, match1Id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match 2 ID</label>
                    <input
                      type="text"
                      placeholder="e.g. 660f8df..."
                      value={overrideForm.match2Id}
                      onChange={(e) => setOverrideForm({ ...overrideForm, match2Id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Player 1 ID (to swap out)</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.player1Id}
                      onChange={(e) => setOverrideForm({ ...overrideForm, player1Id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Player 2 ID (to swap in)</label>
                    <input
                      type="text"
                      placeholder="e.g. P005"
                      value={overrideForm.player2Id}
                      onChange={(e) => setOverrideForm({ ...overrideForm, player2Id: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {(overrideAction === 'replace') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Old Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.oldPlayerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, oldPlayerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P005"
                      value={overrideForm.newPlayerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, newPlayerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {(overrideAction === 'remove' || overrideAction === 'add') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.playerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, playerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {overrideAction === 'bye' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Round ID</label>
                    <input
                      type="text"
                      value={overrideForm.roundId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, roundId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">New Bye Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.newByePlayerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, newByePlayerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {(overrideAction === 'reopenRound' || overrideAction === 'regenerateRound') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Round ID</label>
                    <input
                      type="text"
                      value={overrideForm.roundId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, roundId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {(overrideAction === 'editWinner' || overrideAction === 'reopenMatch') && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  {overrideAction === 'editWinner' && (
                    <>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Winner Player ID</label>
                        <input
                          type="text"
                          placeholder="e.g. P001"
                          value={overrideForm.winnerId}
                          onChange={(e) => setOverrideForm({ ...overrideForm, winnerId: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Score (Optional)</label>
                        <input
                          type="text"
                          value={overrideForm.score}
                          onChange={(e) => setOverrideForm({ ...overrideForm, score: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                        />
                      </div>
                    </>
                  )}
                </>
              )}

              {overrideAction === 'walkover' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Award Winner ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.winnerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, winnerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {overrideAction === 'disqualify' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Disqualify Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.disqualifiedPlayerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, disqualifiedPlayerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {overrideAction === 'withdraw' && (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match ID</label>
                    <input
                      type="text"
                      value={overrideForm.matchId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, matchId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Withdrawn Player ID</label>
                    <input
                      type="text"
                      placeholder="e.g. P001"
                      value={overrideForm.withdrawnPlayerId}
                      onChange={(e) => setOverrideForm({ ...overrideForm, withdrawnPlayerId: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                      required
                    />
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-dark-800">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="bg-slate-100 hover:bg-slate-250 dark:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md"
                >
                  Apply Override
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Match Result Entry Modal */}
      {winnerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-sm bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setWinnerModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-extrabold text-slate-850 dark:text-white mb-4 uppercase tracking-wider">Record Match Result</h3>

            <form onSubmit={submitWinner} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Select Winner</label>
                <select
                  value={winnerId}
                  onChange={(e) => setWinnerId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3.5 text-xs text-slate-800 dark:text-white font-bold focus:outline-none"
                  required
                >
                  <option value={selectedMatch?.player1Id}>{selectedMatch?.player1Name} ({selectedMatch?.player1Id})</option>
                  <option value={selectedMatch?.player2Id}>{selectedMatch?.player2Name} ({selectedMatch?.player2Id})</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Match Score (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. 2-0 or 15-9"
                  value={matchScore}
                  onChange={(e) => setMatchScore(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-dark-850">
                <button
                  type="button"
                  onClick={() => setWinnerModalOpen(false)}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 text-slate-700 dark:text-white font-bold py-2 px-4 rounded-xl text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl text-xs shadow-md animate-pulse"
                >
                  Save Result
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentRoom;
