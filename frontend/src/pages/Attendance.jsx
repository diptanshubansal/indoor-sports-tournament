import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { ClipboardCheck, QrCode, Save, FileSpreadsheet, Eye, UserCheck, RefreshCw } from 'lucide-react';

const Attendance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [userType, setUserType] = useState('participant'); // 'participant' or 'committee'
  const [people, setPeople] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // id -> status ('present' / 'absent')
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // QR emulation states
  const [qrActive, setQrActive] = useState(false);
  const [qrInput, setQrInput] = useState('');
  const [qrMessage, setQrMessage] = useState(null);

  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  const loadAttendance = async () => {
    try {
      setLoading(true);
      // Fetch target group lists
      let list = [];
      if (userType === 'participant') {
        const response = await api.get('/participants');
        list = response.data.data.filter(p => p.status === 'active');
      } else {
        const response = await api.get('/users').catch(() => ({ data: { data: [] } }));
        list = response.data.data || [];
      }

      // Fetch saved logs for selected date
      const logsRes = await api.get(`/attendance`, { params: { date, userType } });
      const logs = logsRes.data.data || [];

      // Map existing records
      const initialMap = {};
      list.forEach(p => {
        const logged = logs.find(log => 
          userType === 'participant' 
            ? log.participantId?._id === p._id 
            : log.userId?._id === p._id
        );
        initialMap[p._id] = logged ? logged.status : 'absent';
      });

      setPeople(list);
      setAttendanceMap(initialMap);
    } catch (error) {
      showToast('Failed to fetch attendance logs', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [date, userType]);

  const handleToggleStatus = (id) => {
    if (!isEditable) return;
    setAttendanceMap(prev => ({
      ...prev,
      [id]: prev[id] === 'present' ? 'absent' : 'present'
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const records = Object.keys(attendanceMap).map(id => ({
        id,
        userType,
        status: attendanceMap[id]
      }));

      const response = await api.post('/attendance', { date, records });
      if (response.data.success) {
        showToast(`Attendance logs saved successfully for ${people.length} items!`, 'success');
        loadAttendance();
      }
    } catch (err) {
      showToast('Failed to save attendance logs', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQrEmulation = async (e) => {
    e.preventDefault();
    if (!qrInput) return;

    try {
      const response = await api.post('/attendance/qr', { scanData: qrInput, date });
      if (response.data.success) {
        showToast(response.data.message, 'success');
        setQrMessage({ text: response.data.message, type: 'success' });
        setQrInput('');
        loadAttendance();
      }
    } catch (err) {
      const errMsg = err.response?.data?.message || 'Invalid scanning input';
      showToast(errMsg, 'error');
      setQrMessage({ text: errMsg, type: 'error' });
    }
  };

  const handleExportCSV = () => {
    if (people.length === 0) {
      showToast('No roster data to export', 'warning');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Name,ID,Category,Status,Date\r\n';

    people.forEach(p => {
      const idStr = userType === 'participant' ? p.participantId : p.userId;
      const status = attendanceMap[p._id] || 'absent';
      csvContent += `"${p.name}","${idStr}","${userType}","${status}","${date}"\r\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${userType}_${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported to CSV successfully', 'success');
  };

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Attendance Logs</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Track presence check-ins for tournament matches.</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={() => setQrActive(!qrActive)}
            className={`flex items-center gap-2 font-bold py-2.5 px-4 rounded-xl text-sm transition-all shadow-md ${
              qrActive
                ? 'bg-slate-800 text-white dark:bg-dark-800'
                : 'bg-primary-600 hover:bg-primary-500 text-white shadow-primary-600/10'
            }`}
          >
            <QrCode className="w-5 h-5" />
            <span>QR Scan Simulation</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 dark:border-dark-800 shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span className="hidden md:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {/* Date select header */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Roster Category</label>
          <div className="grid grid-cols-2 gap-2 bg-slate-50 dark:bg-dark-950 p-1.5 rounded-xl border border-slate-200/50 dark:border-dark-850">
            <button
              onClick={() => setUserType('participant')}
              className={`py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                userType === 'participant'
                  ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-dark-400 hover:text-slate-700'
              }`}
            >
              Participants
            </button>
            <button
              onClick={() => setUserType('committee')}
              className={`py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                userType === 'committee'
                  ? 'bg-white dark:bg-dark-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 dark:text-dark-400 hover:text-slate-700'
              }`}
            >
              Committee
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Attendance Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 px-3.5 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-semibold"
          />
        </div>

        <div className="flex items-end justify-between md:justify-end gap-3">
          <button
            onClick={loadAttendance}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 dark:text-dark-400 border border-slate-200 dark:border-dark-800 rounded-xl hover:text-primary-500 transition-colors bg-white dark:bg-dark-900"
            title="Refresh logs"
          >
            <RefreshCw className="w-5 h-5 animate-[spin_4s_linear_infinite]" />
          </button>

          {isEditable && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all border border-primary-500/20"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Logs'}</span>
            </button>
          )}
        </div>
      </div>

      {/* QR Simulation Section */}
      {qrActive && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-2xl p-5 shadow-2xl animate-[fadeIn_0.2s_ease-out_forwards] relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary-500/10 rounded-full blur-3xl"></div>
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-500/10 border border-primary-500/25 rounded-xl text-primary-400">
              <QrCode className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-sm">QR Code Simulation Ready Portal</h3>
              <p className="text-[11px] text-slate-400">Simulate reading physical ID barcodes to trigger instant check-in status.</p>
            </div>
          </div>

          <form onSubmit={handleQrEmulation} className="flex gap-3 max-w-md">
            <input
              type="text"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="Enter User ID or Participant ID (e.g. superadmin)"
              className="flex-1 bg-white/5 border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-primary-500 font-medium placeholder-slate-500"
              required
            />
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-1.5 shrink-0"
            >
              <UserCheck className="w-4 h-4" />
              <span>Submit Check-in</span>
            </button>
          </form>

          {qrMessage && (
            <div className={`mt-3 p-3 rounded-lg border text-xs font-semibold max-w-md ${
              qrMessage.type === 'success'
                ? 'bg-emerald-950/30 border-emerald-900 text-emerald-400'
                : 'bg-rose-950/30 border-rose-900 text-rose-400'
            }`}>
              {qrMessage.text}
            </div>
          )}
        </div>
      )}

      {/* Main Roster list table */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : people.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">Roster List Empty</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">No active members registered in this category.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Profile Info</th>
                  <th className="py-4 px-6">Unique ID</th>
                  <th className="py-4 px-6">College / Role</th>
                  <th className="py-4 px-6 text-right">Presence Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {people.map((person) => {
                  const status = attendanceMap[person._id] || 'absent';
                  const pId = userType === 'participant' ? person.participantId : person.userId;
                  return (
                    <tr
                      key={person._id}
                      onClick={() => handleToggleStatus(person._id)}
                      className={`transition-colors duration-100 ${
                        isEditable ? 'cursor-pointer hover:bg-slate-50/50 dark:hover:bg-dark-950/20' : ''
                      }`}
                    >
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{person.name}</td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">{pId}</td>
                      <td className="py-4 px-6 text-slate-650 dark:text-dark-350 font-medium">
                        {userType === 'participant' ? person.collegeOrInstitute : <span className="capitalize">{person.role}</span>}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end">
                          <span
                            className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-150 ${
                              status === 'present'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/50 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-850'
                                : 'bg-rose-100 text-rose-800 border border-rose-300/50 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-850'
                            }`}
                          >
                            {status === 'present' ? 'Present' : 'Absent'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
