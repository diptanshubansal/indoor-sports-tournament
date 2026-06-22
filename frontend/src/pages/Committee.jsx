import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { ShieldAlert, Plus, Edit2, Trash2, X, ShieldCheck, Mail, Key } from 'lucide-react';

const Committee = () => {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({
    userId: '',
    name: '',
    email: '',
    mobileNumber: '',
    password: '',
    role: 'viewer',
    status: 'active',
  });

  const fetchUsers = async () => {
    if (currentUser?.role !== 'super_admin') return;
    try {
      setLoading(true);
      const response = await api.get('/users');
      if (response.data.success) {
        setUsers(response.data.data);
      }
    } catch (err) {
      showToast('Failed to fetch committee accounts', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser]);

  const handleOpenCreate = () => {
    setEditId(null);
    setForm({
      userId: '',
      name: '',
      email: '',
      mobileNumber: '',
      password: '',
      role: 'viewer',
      status: 'active',
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditId(item._id);
    setForm({
      userId: item.userId,
      name: item.name,
      email: item.email,
      mobileNumber: item.mobileNumber || '',
      password: '', // blank password field unless modifying it
      role: item.role,
      status: item.status,
    });
    setIsModalOpen(true);
  };

  const handleFormChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!editId && !form.password) {
      showToast('Password is required for new accounts', 'warning');
      return;
    }

    try {
      const payload = { ...form };
      if (editId && !payload.password) {
        delete payload.password; // don't update password if empty
      }

      if (editId) {
        const response = await api.put(`/users/${editId}`, payload);
        if (response.data.success) {
          showToast('Committee account updated successfully!', 'success');
        }
      } else {
        const response = await api.post('/users', payload);
        if (response.data.success) {
          showToast('Committee user registered successfully!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit account configuration', 'error');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to permanently delete this committee account?')) return;
    try {
      const response = await api.delete(`/users/${id}`);
      if (response.data.success) {
        showToast('Committee user account deleted', 'success');
        fetchUsers();
      }
    } catch (err) {
      showToast('Failed to delete user account', 'error');
    }
  };

  if (currentUser?.role !== 'super_admin') {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-6 rounded-2xl max-w-lg mx-auto mt-12 flex flex-col items-center gap-4 text-center">
        <ShieldAlert className="w-12 h-12 text-rose-500" />
        <h3 className="text-lg font-bold">Access Restricted</h3>
        <p className="text-xs text-rose-600 leading-relaxed">
          Only Super Admins can manage committee members.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Committee Organizers</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Manage Admins and Viewers access privileges.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-primary-600/20 active:scale-[0.98] transition-all text-sm self-start sm:self-center border border-primary-500/20"
        >
          <Plus className="w-5 h-5" />
          <span>Add Committee Member</span>
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <TableSkeleton rows={4} cols={5} />
      ) : users.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <ShieldCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">No Committee Members</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Add users to delegate access privileges.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6">User ID</th>
                  <th className="py-4 px-6">Organizer Name</th>
                  <th className="py-4 px-6">Email / Mobile</th>
                  <th className="py-4 px-6">Role Privilege</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {users.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                    <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-350">{item.userId}</td>
                    <td className="py-4 px-6 font-semibold text-slate-800 dark:text-white">{item.name}</td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-medium text-slate-650 dark:text-dark-300">{item.email}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{item.mobileNumber}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        item.role === 'admin'
                          ? 'bg-primary-50 dark:bg-primary-950/20 text-primary-700 dark:text-primary-400 border-primary-200 dark:border-primary-800/50'
                          : 'bg-slate-100 dark:bg-dark-850 text-slate-600 dark:text-dark-400 border-slate-200 dark:border-dark-800'
                      }`}>
                        {item.role}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase ${
                        item.status === 'active' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-400' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/20 dark:text-rose-400'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-primary-500 rounded-lg transition-colors"
                          title="Edit role/status"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 hover:bg-slate-100 dark:hover:bg-dark-800 text-slate-500 dark:text-dark-400 hover:text-rose-500 rounded-lg transition-colors"
                          title="Delete account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 dark:hover:bg-dark-850 rounded-xl transition-colors text-slate-400"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-5">
              {editId ? 'Modify Committee Settings' : 'Add Committee Account'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4 pr-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">User ID</label>
                  <input
                    type="text"
                    name="userId"
                    value={form.userId}
                    onChange={handleFormChange}
                    disabled={!!editId}
                    placeholder="e.g. admin02"
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
                    placeholder="Jane Smith"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>Email Address</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleFormChange}
                    placeholder="jane@icai.org"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Mobile Number</label>
                  <input
                    type="text"
                    name="mobileNumber"
                    value={form.mobileNumber}
                    onChange={handleFormChange}
                    placeholder="9998887776"
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                  <Key className="w-3 h-3 text-slate-400" />
                  <span>Password {editId && '(Leave blank to keep unchanged)'}</span>
                </label>
                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleFormChange}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                  required={!editId}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Organizing Role</label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="admin">Admin (Read/Write Privileges)</option>
                    <option value="viewer">Viewer (View-Only Privileges)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Account Status</label>
                  <select
                    name="status"
                    value={form.status}
                    onChange={handleFormChange}
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3 text-sm text-slate-800 dark:text-white focus:outline-none font-medium"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
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
                  Save Organizer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Committee;
