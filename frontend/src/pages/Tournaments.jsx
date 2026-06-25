import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Plus, Edit2, Archive, Trash2, Calendar, Search, Filter, X, Eye, Trophy } from 'lucide-react';

const toDateInput = (value) => (value ? value.split('T')[0] : '');
const toDateTimeInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};
const defaultDateInput = () => new Date().toISOString().slice(0, 10);
const defaultDateTimeInput = () => {
  const date = new Date();
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

const Tournaments = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    name: 'Indoor Sports Tournament',
    description: '',
    venue: 'ICAI Bathinda Branch',
    startDate: defaultDateTimeInput(),
    endDate: defaultDateInput(),
    registrationStartDate: defaultDateInput(),
    registrationEndDate: defaultDateInput(),
    status: 'Draft',
    gameType: 'chess',
  });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchTournaments = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        status: statusFilter || undefined,
        includeArchived: showArchived ? 'true' : 'false',
      };
      const response = await api.get('/tournaments', { params });
      if (response.data.success) {
        setTournaments(response.data.data);
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to fetch tournaments', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [search, statusFilter, showArchived]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      name: 'Indoor Sports Tournament',
      description: '',
      venue: 'ICAI Bathinda Branch',
      startDate: defaultDateTimeInput(),
      endDate: defaultDateInput(),
      registrationStartDate: defaultDateInput(),
      registrationEndDate: defaultDateInput(),
      status: 'Draft',
      gameType: 'chess',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      name: item.name,
      description: item.description || '',
      venue: item.venue,
      startDate: toDateTimeInput(item.startDate),
      endDate: toDateInput(item.endDate),
      registrationStartDate: toDateInput(item.registrationStartDate),
      registrationEndDate: toDateInput(item.registrationEndDate),
      status: item.status,
      gameType: item.gameType,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        registrationStartDate: form.registrationStartDate || form.startDate || defaultDateInput(),
        registrationEndDate: form.registrationEndDate || form.endDate || form.startDate || defaultDateInput()
      };
      if (editId) {
        // Edit API
        const response = await api.put(`/tournaments/${editId}`, payload);
        if (response.data.success) {
          showToast('Tournament updated successfully!', 'success');
        }
      } else {
        // Create API
        const response = await api.post('/tournaments', payload);
        if (response.data.success) {
          showToast('Tournament created successfully!', 'success');
          // Initialize leaderboard entries for this tournament
          await api.post(`/leaderboard/initialize/${response.data.data._id}`).catch(() => {});
        }
      }
      setIsModalOpen(false);
      fetchTournaments();
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed, check inputs', 'error');
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm('Are you sure you want to archive this tournament?')) return;
    try {
      const response = await api.post(`/tournaments/${id}/archive`);
      if (response.data.success) {
        showToast('Tournament archived successfully', 'success');
        fetchTournaments();
      }
    } catch (error) {
      showToast('Failed to archive tournament', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this tournament? This will erase all connected standings!')) return;
    try {
      const response = await api.delete(`/tournaments/${id}`);
      if (response.data.success) {
        showToast('Tournament deleted successfully', 'success');
        fetchTournaments();
      }
    } catch (error) {
      showToast('Failed to delete tournament', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Tournament Roster</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Manage, update, and coordinate matches.</p>
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Tournament</span>
          </button>
        )}
      </div>

      {/* Filtering Options */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search tournament name..."
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
            >
              <option value="">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Registration Open">Registration Open</option>
              <option value="Registration Closed">Registration Closed</option>
              <option value="Tournament Running">Tournament Running</option>
              <option value="Tournament Completed">Tournament Completed</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-dark-400 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 dark:bg-dark-950 border-dark-800"
            />
            <span>Include Archived</span>
          </label>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <TableSkeleton rows={5} cols={5} />
      ) : tournaments.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <Calendar className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Tournaments Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Try adapting your search parameters or compose a new event listing.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((tourney) => (
            <div
              key={tourney._id}
              className={`bg-white dark:bg-dark-900 border rounded-2xl p-5 shadow-sm hover-card flex flex-col justify-between relative overflow-hidden ${
                tourney.isArchived
                  ? 'border-dashed border-slate-300 dark:border-dark-800 opacity-75'
                  : 'border-slate-200 dark:border-dark-800'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className="text-[10px] font-extrabold uppercase bg-slate-100 dark:bg-dark-850 px-2 py-0.5 rounded-full text-slate-500 dark:text-dark-400 tracking-wider">
                    {tourney.gameType.replace('_', ' ')}
                  </span>
                  
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    tourney.status === 'Tournament Running' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-400' :
                    tourney.status === 'Registration Open' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-400' :
                    tourney.status === 'Tournament Completed' ? 'bg-slate-100 text-slate-800 dark:bg-dark-800 dark:text-dark-400' :
                    'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-400'
                  }`}>
                    {tourney.status}
                  </span>
                </div>

                <h3 className="font-extrabold text-lg text-slate-850 dark:text-white leading-snug line-clamp-1">{tourney.name}</h3>
                <p className="text-xs text-slate-500 dark:text-dark-400 mt-2 line-clamp-2 min-h-[2rem] leading-relaxed">
                  {tourney.description || 'No description provided.'}
                </p>

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-dark-800/60 space-y-2 text-xs text-slate-600 dark:text-dark-300">
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Venue:</span>
                    <span className="font-medium text-slate-800 dark:text-white truncate max-w-[150px]">{tourney.venue}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold text-slate-400">Rounds:</span>
                    <span>{new Date(tourney.startDate).toLocaleDateString()} - {new Date(tourney.endDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-800/60 flex items-center justify-between gap-2">
                <button
                  onClick={() => navigate(`/tournament-room/${tourney._id}`)}
                  className="flex items-center gap-1.5 text-xs font-black text-primary-600 hover:text-primary-500 transition-colors uppercase tracking-wider bg-primary-50 dark:bg-primary-950/20 px-3 py-1.5 rounded-xl border border-primary-250/30"
                >
                  <Trophy className="w-4 h-4" />
                  <span>Enter Room</span>
                </button>

                <div className="flex items-center gap-1">
                  {isEditable ? (
                    <>
                      <button
                        onClick={() => handleOpenEdit(tourney)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-dark-850 text-slate-500 dark:text-dark-400 hover:text-primary-500 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {!tourney.isArchived && (
                        <button
                          onClick={() => handleArchive(tourney._id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-dark-850 text-slate-500 dark:text-dark-400 hover:text-amber-500 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(tourney._id)}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-dark-850 text-slate-500 dark:text-dark-400 hover:text-rose-500 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-dark-600 flex items-center gap-1.5 py-2">
                      <Eye className="w-3.5 h-3.5" /> View Only
                    </span>
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
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">
              {editId ? 'Modify Tournament' : 'Add New Tournament'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Tournament Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="Indoor Sports Tournament"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Description</label>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleFormChange}
                  placeholder="Brief synopsis of rules or guidelines"
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Venue</label>
                  <input
                    type="text"
                    name="venue"
                    value={form.venue}
                    onChange={handleFormChange}
                    placeholder="e.g. Multi-Purpose Hall"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Game Category</label>
                  <select
                    name="gameType"
                    value={form.gameType}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                  >
                    <option value="generic">Generic / Mixed</option>
                    <option value="badminton">Badminton</option>
                    <option value="table_tennis">Table Tennis</option>
                    <option value="chess">Chess</option>
                    <option value="carrom">Carrom</option>
                    <option value="pool">Pool</option>
                    <option value="snooker">Snooker</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Start Date</label>
                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">End Date</label>
                  <input
                    type="date"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Current Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                >
                  <option value="Draft">Draft</option>
                  <option value="Registration Open">Registration Open</option>
                  <option value="Registration Closed">Registration Closed</option>
                  <option value="Tournament Running">Tournament Running</option>
                  <option value="Tournament Completed">Tournament Completed</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
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
                  Save Tournament
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tournaments;
