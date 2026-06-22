import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Plus, Edit2, Trash2, Search, Filter, X, Eye, User } from 'lucide-react';

const Participants = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    participantId: '',
    name: '',
    mobileNumber: '',
    email: '',
    gender: 'male',
    collegeOrInstitute: '',
    teamName: '',
    status: 'active'
  });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        gender: genderFilter || undefined,
        status: statusFilter || undefined,
        college: collegeFilter || undefined
      };
      const response = await api.get('/participants', { params });
      if (response.data.success) {
        setParticipants(response.data.data);
      }
    } catch (error) {
      showToast('Failed to fetch participants list', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchParticipants();
  }, [search, genderFilter, statusFilter, collegeFilter]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      participantId: '',
      name: '',
      mobileNumber: '',
      email: '',
      gender: 'male',
      collegeOrInstitute: '',
      teamName: '',
      status: 'active'
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      participantId: item.participantId,
      name: item.name,
      mobileNumber: item.mobileNumber,
      email: item.email,
      gender: item.gender,
      collegeOrInstitute: item.collegeOrInstitute,
      teamName: item.teamName || '',
      status: item.status
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const response = await api.put(`/participants/${editId}`, form);
        if (response.data.success) {
          showToast('Participant updated successfully!', 'success');
        }
      } else {
        const response = await api.post('/participants', form);
        if (response.data.success) {
          showToast('Participant registered successfully!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchParticipants();
    } catch (error) {
      showToast(error.response?.data?.message || 'Action failed, verify parameters', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this participant?')) return;
    try {
      const response = await api.delete(`/participants/${id}`);
      if (response.data.success) {
        showToast('Participant profile deleted', 'success');
        fetchParticipants();
      }
    } catch (error) {
      showToast('Failed to delete profile', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Participants</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Registry of athletes competing in all tournament divisions.</p>
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Add Participant</span>
          </button>
        )}
      </div>

      {/* Filter and Search inputs */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-4 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-5 h-5" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by ID, name, email..."
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <input
            type="text"
            value={collegeFilter}
            onChange={(e) => setCollegeFilter(e.target.value)}
            placeholder="Filter college..."
            className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs focus:outline-none text-slate-700 dark:text-dark-300"
          />

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={genderFilter}
              onChange={(e) => setGenderFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
            >
              <option value="">All Genders</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <TableSkeleton rows={5} cols={6} />
      ) : participants.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <User className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Participants Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Try adapting your search parameters or register a new athlete.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Athlete Name</th>
                  <th className="py-4 px-6">Contact details</th>
                  <th className="py-4 px-6">College / Institute</th>
                  <th className="py-4 px-6">Assigned Team</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {participants.map((player) => (
                  <tr key={player._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">{player.participantId}</td>
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 dark:text-white">{player.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{player.gender}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs text-slate-600 dark:text-dark-300 font-medium">{player.email}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{player.mobileNumber}</div>
                    </td>
                    <td className="py-4 px-6 text-slate-650 dark:text-dark-200 font-medium">{player.collegeOrInstitute}</td>
                    <td className="py-4 px-6">
                      {player.teamName ? (
                        <span className="bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 text-xs px-2.5 py-1 rounded-full font-bold border border-primary-200/50 dark:border-primary-800/30">
                          {player.teamName}
                        </span>
                      ) : (
                        <span className="text-slate-400 dark:text-dark-600 text-xs italic">Unassigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        player.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' : 'bg-slate-100 text-slate-750 dark:bg-dark-850 dark:text-dark-400'
                      }`}>
                        {player.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isEditable ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(player)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-primary-500 rounded-lg transition-colors"
                            title="Edit profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(player._id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-rose-500 rounded-lg transition-colors"
                            title="Delete profile"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-dark-600 flex items-center gap-1 justify-end">
                          <Eye className="w-3.5 h-3.5" /> Read
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Editor Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400 hover:text-slate-650"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">
              {editId ? 'Modify Athlete Record' : 'Register Participant'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Participant ID</label>
                  <input
                    type="text"
                    name="participantId"
                    value={form.participantId}
                    onChange={handleFormChange}
                    disabled={!!editId}
                    placeholder="e.g. ATHLETE_001"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 disabled:opacity-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Full Name</label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleFormChange}
                    placeholder="John Doe"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    value={form.mobileNumber}
                    onChange={handleFormChange}
                    placeholder="9876543210"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="john@icai.org"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Gender</label>
                  <select
                    name="gender"
                    value={form.gender}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">College / Institute</label>
                  <input
                    type="text"
                    name="collegeOrInstitute"
                    value={form.collegeOrInstitute}
                    onChange={handleFormChange}
                    placeholder="ICAI Bathinda Branch"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Team Name</label>
                  <input
                    type="text"
                    name="teamName"
                    value={form.teamName}
                    onChange={handleFormChange}
                    placeholder="e.g. Bathinda Warriors (Optional)"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Registration Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
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
                  Save Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Participants;
