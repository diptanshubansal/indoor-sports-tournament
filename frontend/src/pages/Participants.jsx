import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Plus, Edit2, Trash2, Search, Filter, X, Eye, User, Upload, Download, KeyRound, RefreshCw } from 'lucide-react';

const Participants = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [collegeFilter, setCollegeFilter] = useState('');
  const [gameFilter, setGameFilter] = useState('');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    participantId: '',
    name: '',
    mobileNumber: '',
    email: '',
    enrolledGames: '',
    games: ''
  });

  // Import states
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Reset password states
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [resetPasswordData, setResetPasswordData] = useState({ name: '', username: '', password: '' });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const supportedGames = ['Chess', 'Carrom', 'Table Tennis', 'Ludo', 'Skipping', 'Spoon Race', 'BGMI', 'Tug of War'];

  const fetchParticipants = async () => {
    try {
      setLoading(true);
      const params = {
        search,
        gender: genderFilter || undefined,
        status: statusFilter || undefined,
        college: collegeFilter || undefined,
        game: gameFilter || undefined
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
  }, [search, genderFilter, statusFilter, collegeFilter, gameFilter]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      participantId: '',
      name: '',
      mobileNumber: '',
      email: '',
      enrolledGames: '',
      games: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    const activeGames = item.enrolledGames || item.games || [];
    setForm({
      participantId: item.participantId,
      name: item.name,
      mobileNumber: item.mobileNumber,
      email: item.email || '',
      enrolledGames: activeGames.join(', '),
      games: activeGames.join(', ')
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const gamesArray = form.enrolledGames ? form.enrolledGames.split(',').map(g => g.trim()).filter(Boolean) : (form.games ? form.games.split(',').map(g => g.trim()).filter(Boolean) : []);
      const submissionData = {
        name: form.name,
        mobileNumber: form.mobileNumber,
        email: form.email,
        enrolledGames: gamesArray,
        games: gamesArray
      };

      if (editId) {
        const response = await api.put(`/participants/${editId}`, submissionData);
        if (response.data.success) {
          showToast('Participant updated successfully!', 'success');
        }
      } else {
        const response = await api.post('/participants', submissionData);
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

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setImportResult(null);
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      showToast('Please select an Excel file to upload', 'warning');
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      setUploading(true);
      const response = await api.post('/participants/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      if (response.data.success) {
        showToast('Excel file imported successfully!', 'success');
        setImportResult(response.data);
        fetchParticipants();
      }
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to import Excel file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      const response = await api.get('/participants/export-3sheets', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'participants_and_visitors.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      showToast('Excel report with 3 sheets exported successfully!', 'success');
    } catch (error) {
      showToast('Failed to export credentials', 'error');
    }
  };

  const handleResetPassword = async (player) => {
    if (!window.confirm(`Are you sure you want to reset the password for ${player.name}? This will invalidate their current password.`)) return;
    try {
      const response = await api.post(`/participants/${player._id}/reset-password`);
      if (response.data.success) {
        setResetPasswordData({
          name: player.name,
          username: player.participantId.toLowerCase(),
          password: response.data.data.temporaryPassword
        });
        setResetPasswordModalOpen(true);
      }
    } catch (error) {
      showToast('Failed to reset participant password', 'error');
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
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/google-sheet-sync"
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-800 dark:text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm border border-slate-200 dark:border-dark-800"
            >
              <RefreshCw className="w-4 h-4 text-slate-500" />
              <span>Google Sheet Sync</span>
            </Link>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-800 dark:text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm border border-slate-200 dark:border-dark-800"
            >
              <Upload className="w-4 h-4 text-slate-500" />
              <span>Import Excel</span>
            </button>
            <button
              onClick={handleExportExcel}
              className="flex items-center justify-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-dark-850 dark:hover:bg-dark-800 text-slate-800 dark:text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all text-sm border border-slate-200 dark:border-dark-800"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export Excel</span>
            </button>
            <button
              onClick={handleOpenCreate}
              className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm border border-primary-500/20"
            >
              <Plus className="w-5 h-5" />
              <span>Add Participant</span>
            </button>
          </div>
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
            placeholder="Search by ID, name, phone, email..."
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <select
            value={gameFilter}
            onChange={(e) => setGameFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-4 text-xs font-semibold focus:outline-none text-slate-700 dark:text-dark-300"
          >
            <option value="">All Games</option>
            {supportedGames.map(game => (
              <option key={game} value={game}>{game}</option>
            ))}
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
                  <th className="py-4 px-6">Player ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Enrolled Games</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {participants.map((player) => (
                  <tr key={player._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">{player.participantId}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white">{player.name}</td>
                    <td className="py-4 px-6 text-slate-700 dark:text-dark-300 font-medium">{player.mobileNumber}</td>
                    <td className="py-4 px-6 text-xs text-slate-600 dark:text-dark-300 font-medium">{player.email || '-'}</td>
                    <td className="py-4 px-6">
                      {((player.enrolledGames || player.games) && (player.enrolledGames || player.games).length > 0) ? (
                        <div className="flex flex-wrap gap-1">
                          {(player.enrolledGames || player.games).map((game, idx) => (
                            <span key={idx} className="bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 text-[10px] px-1.5 py-0.5 rounded font-bold border border-indigo-150 dark:border-indigo-900/30">
                              {game}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 dark:text-dark-600 text-xs italic">None</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-right">
                      {isEditable ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(player)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-primary-500 rounded-lg transition-colors border border-slate-200 dark:border-dark-800/50"
                            title="Edit profile"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(player._id)}
                            className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-rose-500 rounded-lg transition-colors border border-slate-200 dark:border-dark-800/50"
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
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Player ID</label>
                <input
                  type="text"
                  name="participantId"
                  value={editId ? form.participantId : 'Auto-generated'}
                  disabled
                  className="w-full bg-slate-100 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-500 dark:text-dark-400 font-bold focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Name</label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleFormChange}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Phone</label>
                <input
                  type="text"
                  name="mobileNumber"
                  value={form.mobileNumber}
                  onChange={handleFormChange}
                  placeholder="e.g. 9876543210"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="e.g. rahul@gmail.com (Optional)"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Game Registrations Checkboxes */}
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-2">Enrolled Games</label>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-dark-950 p-3.5 rounded-2xl border border-slate-200 dark:border-dark-800 max-h-36 overflow-y-auto">
                  {supportedGames.map(game => {
                    const selectedList = form.enrolledGames ? form.enrolledGames.split(',').map(g => g.trim()) : (form.games ? form.games.split(',').map(g => g.trim()) : []);
                    const isChecked = selectedList.includes(game);
                    return (
                      <label key={game} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-dark-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            let current = form.enrolledGames ? form.enrolledGames.split(',').map(g => g.trim()).filter(Boolean) : (form.games ? form.games.split(',').map(g => g.trim()).filter(Boolean) : []);
                            if (current.includes(game)) {
                              current = current.filter(g => g !== game);
                            } else {
                              current.push(game);
                            }
                            setForm({ ...form, enrolledGames: current.join(', '), games: current.join(', ') });
                          }}
                          className="rounded text-primary-650 focus:ring-primary-500 border-slate-350 dark:border-dark-800 w-4 h-4 cursor-pointer"
                        />
                        <span>{game}</span>
                      </label>
                    );
                  })}
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
                  Save Athlete
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-2xl bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setIsImportModalOpen(false);
                setSelectedFile(null);
                setImportResult(null);
              }}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400 hover:text-slate-655"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Import Participants from Excel</h2>
            <p className="text-xs text-slate-500 dark:text-dark-400 mb-5 leading-relaxed">
              Upload an Excel file with Sheet 1 named <code className="bg-slate-100 dark:bg-dark-850 px-1.5 py-0.5 rounded font-bold text-indigo-500">Participants Master</code> containing columns: <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Name</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Phone</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Email</code>, and the 8 game columns: <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Chess</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Carrom</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Table Tennis</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Ludo</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Skipping</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Spoon Race</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">BGMI</code>, <code className="bg-slate-100 dark:bg-dark-850 px-1 py-0.5 rounded font-bold">Tug of War</code>. 
              Values for game columns must be <strong className="text-primary-500">Yes</strong> or <strong className="text-primary-500">No</strong>.
            </p>

            <form onSubmit={handleImportSubmit} className="space-y-6">
              {!importResult && (
                <div className="border-2 border-dashed border-slate-200 dark:border-dark-800 rounded-2xl p-6 text-center hover:border-primary-500 transition-colors bg-slate-50 dark:bg-dark-950 relative">
                  <input
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <Upload className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    {selectedFile ? selectedFile.name : 'Select or drag Excel sheet here'}
                  </p>
                  <p className="text-xs text-slate-400 mt-1">Accepts Excel (.xlsx, .xls) files up to 10MB</p>
                </div>
              )}

              {importResult && (
                <div className="space-y-4 animate-[fadeIn_0.2s_ease-out_forwards]">
                  <div className="grid grid-cols-5 gap-3">
                    <div className="p-3 bg-slate-50 dark:bg-dark-950 rounded-xl border border-slate-150 dark:border-dark-850 text-center">
                      <div className="text-[10px] font-bold text-slate-400 uppercase">Total Rows</div>
                      <div className="text-xl font-extrabold text-slate-800 dark:text-white mt-0.5">{importResult.summary.totalRows}</div>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100 dark:border-emerald-800/30 text-center">
                      <div className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">Imported</div>
                      <div className="text-xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-0.5">{importResult.summary.importedCount}</div>
                    </div>
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-800/30 text-center">
                      <div className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase">Updated</div>
                      <div className="text-xl font-extrabold text-indigo-700 dark:text-indigo-400 mt-0.5">{importResult.summary.updatedCount || 0}</div>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-800/30 text-center">
                      <div className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">Duplicates</div>
                      <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400 mt-0.5">{importResult.summary.duplicateCount}</div>
                    </div>
                    <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-800/30 text-center">
                      <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase">Invalid</div>
                      <div className="text-xl font-extrabold text-rose-700 dark:text-rose-400 mt-0.5">{importResult.summary.invalidCount}</div>
                    </div>
                  </div>

                  {importResult.errors.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest">Import Error Logs</h4>
                      <div className="max-h-[20vh] overflow-y-auto border border-slate-200 dark:border-dark-800 rounded-2xl divide-y divide-slate-100 dark:divide-dark-850 p-2 bg-slate-50 dark:bg-dark-950">
                        {importResult.errors.map((err, idx) => (
                          <div key={idx} className="p-2 text-xs flex justify-between gap-4">
                            <span className="font-bold text-slate-655 dark:text-dark-400">Row {err.row} ({err.name})</span>
                            <span className="text-rose-600 dark:text-rose-400 font-medium">{err.reason}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsImportModalOpen(false);
                    setSelectedFile(null);
                    setImportResult(null);
                  }}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm"
                >
                  Close
                </button>
                {!importResult && (
                  <button
                    type="submit"
                    disabled={uploading}
                    className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-5 rounded-xl text-sm shadow-md flex items-center gap-2"
                  >
                    {uploading ? (
                      <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Process File</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Reset Modal display */}
      {resetPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-md bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setResetPasswordModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Temporary Credentials Reset</h2>
            <p className="text-xs text-slate-400 mb-5">Password generated successfully for athlete <strong className="text-slate-800 dark:text-slate-200">{resetPasswordData.name}</strong>.</p>
            
            <div className="space-y-3 bg-slate-50 dark:bg-dark-950 p-4 rounded-2xl border border-slate-200 dark:border-dark-805 text-sm">
              <div className="flex justify-between">
                <span className="font-semibold text-slate-400">Username:</span>
                <span className="font-bold text-slate-800 dark:text-white">{resetPasswordData.username}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-400">Temporary Password:</span>
                <span className="font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded font-mono text-xs border border-indigo-200/50 dark:border-indigo-800/35">{resetPasswordData.password}</span>
              </div>
            </div>
            
            <p className="text-[10px] text-slate-400 italic mt-4 text-center">
              The participant will be forced to change this temporary password on their next login session.
            </p>

            <div className="flex justify-end gap-3 pt-5 mt-4 border-t border-slate-100 dark:border-dark-800">
              <button
                type="button"
                onClick={() => setResetPasswordModalOpen(false)}
                className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-5 rounded-xl text-sm shadow-md"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Participants;
