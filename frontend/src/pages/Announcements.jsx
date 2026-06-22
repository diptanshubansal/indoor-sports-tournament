import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { Megaphone, Plus, Edit2, Trash2, Pin, Calendar, X, Eye } from 'lucide-react';

const Announcements = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    title: '',
    content: '',
    scheduledFor: '',
    isPinned: false,
    status: 'published',
  });

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      if (response.data.success) {
        setAnnouncements(response.data.data);
      }
    } catch (err) {
      showToast('Failed to load announcements bulletins', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      title: '',
      content: '',
      scheduledFor: new Date().toISOString().slice(0, 16), // current datetime local string
      isPinned: false,
      status: 'published',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      title: item.title,
      content: item.content,
      scheduledFor: new Date(item.scheduledFor).toISOString().slice(0, 16),
      isPinned: item.isPinned || false,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setForm({ ...form, [e.target.name]: val });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        const response = await api.put(`/announcements/${editId}`, form);
        if (response.data.success) {
          showToast('Announcement updated successfully!', 'success');
        }
      } else {
        const response = await api.post('/announcements', form);
        if (response.data.success) {
          showToast('Announcement posted successfully!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      showToast('Action failed, check inputs', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this bulletin notice?')) return;
    try {
      const response = await api.delete(`/announcements/${id}`);
      if (response.data.success) {
        showToast('Announcement deleted successfully', 'success');
        fetchAnnouncements();
      }
    } catch (err) {
      showToast('Failed to delete announcement', 'error');
    }
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Compose news flashes, schedule postings, and pin alerts.</p>
        </div>
        {isEditable && (
          <button
            onClick={handleOpenCreate}
            className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span>Create Notice</span>
          </button>
        )}
      </div>

      {/* Roster lists */}
      {loading ? (
        <TableSkeleton rows={3} cols={4} />
      ) : announcements.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <Megaphone className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Bulletins</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">There are no active alerts or news items posted.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {announcements.map((item) => (
            <div
              key={item._id}
              className={`bg-white dark:bg-dark-900 border rounded-2xl p-5 shadow-sm hover-card flex flex-col justify-between relative overflow-hidden ${
                item.isPinned
                  ? 'border-primary-500/30 dark:border-primary-500/20 bg-primary-500/[0.01]'
                  : 'border-slate-250 dark:border-dark-800'
              }`}
            >
              {/* Pin banner background */}
              {item.isPinned && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white p-1 rounded-bl-xl">
                  <Pin className="w-3.5 h-3.5 fill-white" />
                </div>
              )}

              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    item.status === 'published' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-amber-100 text-amber-800 dark:bg-amber-950/20 dark:text-amber-400'
                  }`}>
                    {item.status}
                  </span>
                  
                  {new Date(item.scheduledFor) > new Date() && (
                    <span className="text-[10px] bg-slate-100 dark:bg-dark-800 text-slate-500 dark:text-dark-400 font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Scheduled
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-base text-slate-800 dark:text-white leading-snug line-clamp-1">{item.title}</h3>
                <p className="text-xs text-slate-650 dark:text-dark-350 mt-2 whitespace-pre-wrap leading-relaxed">
                  {item.content}
                </p>
              </div>

              {/* Actions footer */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-dark-800/60 flex items-center justify-between text-[11px] text-slate-450 dark:text-dark-500">
                <span>
                  Posted by {item.createdBy?.name || 'Admin'} • {new Date(item.scheduledFor).toLocaleDateString()}
                </span>

                <div className="flex items-center gap-1">
                  {isEditable ? (
                    <>
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-primary-500 rounded-lg transition-colors"
                        title="Edit notice"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="p-1.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 hover:text-rose-500 rounded-lg transition-colors"
                        title="Delete notice"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <span className="text-[10px] text-slate-400 dark:text-dark-600 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" /> View
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
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-850 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">
              {editId ? 'Edit Announcement' : 'Compose Bulletin Notice'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Title / Headline</label>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="e.g. Schedule Changes for Badminton Match"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Content Details</label>
                <textarea
                  name="content"
                  value={form.content}
                  onChange={handleFormChange}
                  placeholder="Draft your bulletin body here..."
                  rows={4}
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Schedule Publish Time</label>
                  <input
                    type="datetime-local"
                    name="scheduledFor"
                    value={form.scheduledFor}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-xs text-slate-800 dark:text-white focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Visibility Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="isPinned"
                  name="isPinned"
                  checked={form.isPinned}
                  onChange={handleFormChange}
                  className="rounded text-primary-600 focus:ring-primary-500 h-4 w-4 dark:bg-dark-950 border-dark-800"
                />
                <label htmlFor="isPinned" className="text-xs font-bold text-slate-650 dark:text-dark-400 select-none cursor-pointer">
                  Pin announcement to top of the dashboard feed
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
                  Save Announcement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Announcements;
