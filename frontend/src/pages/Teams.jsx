import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Plus, Edit2, Trash2, UsersRound, X, Check, Search, Eye } from 'lucide-react';

const Teams = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [teams, setTeams] = useState([]);
  const [tournaments, setTournaments] = useState([]);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTournament, setSelectedTournament] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: '',
    tournamentId: '',
    members: [],
    captainId: '',
    teamManager: '',
  });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchData = async () => {
    try {
      setLoading(true);
      const [teamsRes, tourneysRes, playersRes] = await Promise.all([
        api.get('/teams', { params: { search, tournamentId: selectedTournament || undefined } }),
        api.get('/tournaments'),
        api.get('/participants')
      ]);

      if (teamsRes.data.success) setTeams(teamsRes.data.data);
      if (tourneysRes.data.success) setTournaments(tourneysRes.data.data.filter(t => !t.isArchived));
      if (playersRes.data.success) setParticipants(playersRes.data.data.filter(p => p.status === 'active'));
    } catch (error) {
      showToast('Failed to load roster data logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedTournament]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      name: '',
      tournamentId: tournaments[0]?._id || '',
      members: [],
      captainId: '',
      teamManager: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      name: item.name,
      tournamentId: item.tournamentId?._id || '',
      members: item.members.map(m => m._id) || [],
      captainId: item.captainId?._id || '',
      teamManager: item.teamManager || '',
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleToggleMember = (playerId) => {
    const members = [...form.members];
    const idx = members.indexOf(playerId);
    if (idx > -1) {
      members.splice(idx, 1);
      // If captain was removed, clear captain
      const captainId = form.captainId === playerId ? '' : form.captainId;
      setForm({ ...form, members, captainId });
    } else {
      members.push(playerId);
      setForm({ ...form, members });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.tournamentId) {
      showToast('Please select a tournament first', 'warning');
      return;
    }

    try {
      if (editId) {
        const response = await api.put(`/teams/${editId}`, form);
        if (response.data.success) {
          showToast('Team modifications saved successfully!', 'success');
        }
      } else {
        const response = await api.post('/teams', form);
        if (response.data.success) {
          showToast('Team created successfully!', 'success');
          // Automatically register team to the tournament leaderboard
          await api.post(`/leaderboard/initialize/${form.tournamentId}`).catch(() => {});
        }
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit team details', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this team? This will unassign its members.')) return;
    try {
      const response = await api.delete(`/teams/${id}`);
      if (response.data.success) {
        showToast('Team deleted successfully', 'success');
        fetchData();
      }
    } catch (error) {
      showToast('Failed to delete team', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Teams</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Configure competition teams, captains, managers and rosters.</p>
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Team</span>
          </button>
        )}
      </div>

      {/* Filter Header controls */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by team name..."
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <select
          value={selectedTournament}
          onChange={(e) => setSelectedTournament(e.target.value)}
          className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
        >
          <option value="">All Tournaments</option>
          {tournaments.map((t) => (
            <option key={t._id} value={t._id}>{t.name}</option>
          ))}
        </select>
      </div>

      {/* Grid view */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : teams.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <UsersRound className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Teams Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Try adapting your search parameters or register a new team.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {teams.map((team) => (
            <div
              key={team._id}
              className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm hover-card flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start gap-2 mb-3">
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-850 dark:text-white leading-snug">{team.name}</h3>
                    <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 font-bold border border-emerald-200/50 dark:border-emerald-800/30 px-2 py-0.5 rounded-full inline-block mt-1">
                      {team.tournamentId?.name || 'Unknown Tournament'}
                    </span>
                  </div>

                  {isEditable ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(team)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-primary-500 rounded-lg transition-colors"
                        title="Edit team"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(team._id)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                        title="Delete team"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-dark-600 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> Read
                    </span>
                  )}
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-650 dark:text-dark-350">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Team Manager:</span>
                    <span className="font-medium text-slate-800 dark:text-white">{team.teamManager || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Team Captain:</span>
                    <span className="font-bold text-primary-500">{team.captainId?.name || 'Unassigned'}</span>
                  </div>
                </div>

                {/* Team Members List */}
                <div className="mt-5">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Members ({team.members?.length || 0})</h4>
                  {team.members?.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No members assigned to this team.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                      {team.members.map((member) => (
                        <span
                          key={member._id}
                          className="bg-slate-100 dark:bg-dark-800 text-slate-700 dark:text-dark-300 text-xs px-2.5 py-1 rounded-lg border border-slate-200/50 dark:border-dark-700/40"
                        >
                          {member.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-4">
              {editId ? 'Modify Team Configuration' : 'Register New Team'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Team Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="e.g. Bathinda Strikers"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Associated Tournament</label>
                  <select
                    name="tournamentId"
                    value={form.tournamentId}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                    required
                  >
                    <option value="" disabled>Select Tournament</option>
                    {tournaments.map((t) => (
                      <option key={t._id} value={t._id}>{t.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Team Manager</label>
                  <input
                    type="text"
                    name="teamManager"
                    value={form.teamManager}
                    onChange={handleFormChange}
                    placeholder="Manager Full Name"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Designated Captain</label>
                  <select
                    name="captainId"
                    value={form.captainId}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                  >
                    <option value="">No Captain Designated</option>
                    {participants
                      .filter(p => form.members.includes(p._id))
                      .map((p) => (
                        <option key={p._id} value={p._id}>{p.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Player Allocation Roster Grid */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Assign Team Members</label>
                <div className="bg-slate-50 dark:bg-dark-950 border border-slate-250 dark:border-dark-800 rounded-xl p-3 max-h-48 overflow-y-auto space-y-1.5">
                  {participants.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-4">No active participants available to assign.</p>
                  ) : (
                    participants.map((player) => {
                      const isAssigned = form.members.includes(player._id);
                      return (
                        <div
                          key={player._id}
                          onClick={() => handleToggleMember(player._id)}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs font-medium border ${
                            isAssigned
                              ? 'bg-primary-500/10 border-primary-500 text-primary-700 dark:text-primary-400'
                              : 'bg-white dark:bg-dark-900 border-slate-200 dark:border-dark-800 hover:bg-slate-50 text-slate-700 dark:text-dark-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold">{player.name}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{player.collegeOrInstitute}</div>
                          </div>
                          {isAssigned ? (
                            <Check className="w-4 h-4 text-primary-500 stroke-[3]" />
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Click to assign</span>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
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
                  Save Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Teams;
