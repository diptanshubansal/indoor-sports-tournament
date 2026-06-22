import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { BookOpen, Plus, Edit2, Trash2, Globe, History, X, Check, Eye } from 'lucide-react';

const Rules = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    status: 'draft',
  });

  // Version history modal states
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [historyTitle, setHistoryTitle] = useState('');

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/rules');
      if (response.data.success) {
        setRules(response.data.data);
      }
    } catch (err) {
      showToast('Failed to load rulebooks', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      title: '',
      content: '',
      status: 'draft',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      title: item.title,
      content: item.content,
      status: item.status,
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
        const response = await api.put(`/rules/${editId}`, form);
        if (response.data.success) {
          showToast('Rule guidelines modified successfully!', 'success');
        }
      } else {
        const response = await api.post('/rules', form);
        if (response.data.success) {
          showToast('Rule created successfully!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchRules();
    } catch (err) {
      showToast(err.response?.data?.message || 'Action failed', 'error');
    }
  };

  const handlePublish = async (id) => {
    try {
      const response = await api.post(`/rules/${id}/publish`);
      if (response.data.success) {
        showToast('Rule published to bulletin successfully!', 'success');
        fetchRules();
      }
    } catch (err) {
      showToast('Failed to publish rule', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule document?')) return;
    try {
      const response = await api.delete(`/rules/${id}`);
      if (response.data.success) {
        showToast('Rule document deleted', 'success');
        fetchRules();
      }
    } catch (err) {
      showToast('Failed to delete rule', 'error');
    }
  };

  const handleViewHistory = (item) => {
    setHistoryTitle(item.title);
    setHistoryList(item.versionHistory || []);
    setHistoryModalOpen(true);
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Rules & Regulations</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Official event codebooks, match scoring rules and policies.</p>
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Rule Entry</span>
          </button>
        )}
      </div>

      {/* Rules list grid */}
      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : rules.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <BookOpen className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Rules Found</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1"> Official guidelines have not been published yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {rules.map((rule) => (
            <div
              key={rule._id}
              className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-dark-800/80 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-extrabold text-lg text-slate-850 dark:text-white leading-tight">{rule.title}</h3>
                    <span className="text-[10px] bg-slate-100 dark:bg-dark-850 text-slate-500 dark:text-dark-400 font-bold px-2 py-0.5 rounded-full">
                      v{rule.version}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                      rule.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                    }`}>
                      {rule.status}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-650 dark:text-dark-300 leading-relaxed whitespace-pre-wrap">
                  {rule.content}
                </p>
              </div>

              {/* Action buttons footer */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-dark-800/60 flex flex-wrap items-center justify-between gap-4">
                <span className="text-[10px] text-slate-400 dark:text-dark-500 font-semibold">
                  Last updated by {rule.updatedBy?.name || 'System'} on {new Date(rule.updatedAt).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleViewHistory(rule)}
                    className="flex items-center gap-1.5 py-1.5 px-3 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-slate-700 dark:hover:text-dark-350 text-xs font-bold rounded-lg border border-slate-200 dark:border-dark-800 transition-colors"
                  >
                    <History className="w-3.5 h-3.5" />
                    <span>Version Logs</span>
                  </button>

                  {isEditable && (
                    <>
                      {rule.status === 'draft' && (
                        <button
                          onClick={() => handlePublish(rule._id)}
                          className="flex items-center gap-1 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          <Globe className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleOpenEdit(rule)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-primary-500 rounded-lg transition-colors border border-slate-200 dark:border-dark-800"
                        title="Edit rule content"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(rule._id)}
                        className="p-2 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-rose-500 rounded-lg transition-colors border border-slate-200 dark:border-dark-800"
                        title="Delete rule document"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
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
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-850 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">
              {editId ? 'Edit Rule and Create Version' : 'Create Rulebook Entry'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Rule Title</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Badminton Service Guidelines"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Rule Content Details</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  placeholder="Write complete guidelines here..."
                  rows={6}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 whitespace-pre-wrap font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Status</label>
                <select
                  name="status"
                  value={form.status}
                  onChange={handleFormChange}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                >
                  <option value="draft">Draft (Committee View Only)</option>
                  <option value="published">Published (Public Viewer View)</option>
                </select>
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
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Log Modal */}
      {historyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="w-full max-w-lg bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setHistoryModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-850 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Version history logs</h2>
            <p className="text-xs text-slate-400 mb-5">{historyTitle}</p>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1">
              {historyList.map((hist, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-dark-800 bg-slate-50 dark:bg-dark-950/20 text-xs text-slate-750 dark:text-dark-300 space-y-1.5"
                >
                  <div className="flex justify-between items-center font-bold">
                    <span className="text-primary-500">Version {hist.version}</span>
                    <span className="text-slate-400 font-medium">{new Date(hist.updatedAt).toLocaleString()}</span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[11px] font-medium">{hist.content}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rules;
