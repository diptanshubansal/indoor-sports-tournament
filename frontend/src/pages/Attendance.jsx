import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { ClipboardCheck, FileSpreadsheet, UserCheck, RefreshCw, Search } from 'lucide-react';

const Attendance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Single-day event uses today's date automatically
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [userType, setUserType] = useState('participant'); // 'participant' or 'committee'
  const [people, setPeople] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // id -> status ('present' / 'absent')
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
  }, [userType]);

  const handleToggleStatus = (id) => {
    if (!isEditable) {
      showToast('You do not have permissions to modify attendance.', 'warning');
      return;
    }
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
        showToast(`Attendance logs saved successfully for ${people.length} members!`, 'success');
        loadAttendance();
      }
    } catch (err) {
      showToast('Failed to save attendance logs', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleExportCSV = () => {
    if (people.length === 0) {
      showToast('No roster data to export', 'warning');
      return;
    }
    
    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (userType === 'participant') {
      csvContent += 'Participant Name,Player ID,Phone,Attendance Status\r\n';
      people.forEach(p => {
        const status = attendanceMap[p._id] || 'absent';
        csvContent += `"${p.name}","${p.participantId || ''}","${p.mobileNumber || ''}","${status === 'present' ? 'Present' : 'Absent'}"\r\n`;
      });
    } else {
      csvContent += 'Name,Role,Attendance Status\r\n';
      people.forEach(p => {
        const status = attendanceMap[p._id] || 'absent';
        csvContent += `"${p.name}","${p.role || ''}","${status === 'present' ? 'Present' : 'Absent'}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_Report_${userType}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported to CSV successfully', 'success');
  };

  // Filter people list based on search query
  const filteredPeople = people.filter(p => {
    const term = searchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(term);
    const idVal = userType === 'participant' ? p.participantId : p.userId;
    const idMatch = idVal?.toLowerCase().includes(term);
    const phoneMatch = p.mobileNumber?.toLowerCase().includes(term);
    return nameMatch || idMatch || phoneMatch;
  });

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Attendance Registry</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">
            Single-Day Tournament Check-in: <strong className="text-primary-500">{new Date(date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 dark:border-dark-800 shadow-sm"
          >
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <span>Export Attendance Report</span>
          </button>
        </div>
      </div>

      {/* Roster Type Selector and Save controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
        <div>
          <label className="block text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest mb-1.5">Select Roster Group</label>
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

        <div className="relative flex items-end">
          <div className="relative w-full">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, ID or mobile..."
              className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-semibold"
            />
          </div>
        </div>

        <div className="flex items-end justify-between md:justify-end gap-3">
          <button
            onClick={loadAttendance}
            className="p-2.5 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-500 dark:text-dark-400 border border-slate-200 dark:border-dark-800 rounded-xl hover:text-primary-500 transition-colors bg-white dark:bg-dark-900"
            title="Refresh list"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {isEditable && (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-650 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all border border-primary-500/20"
            >
              <UserCheck className="w-4 h-4" />
              <span>{saving ? 'Saving...' : 'Save Logs'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Main simplified list */}
      {loading ? (
        <TableSkeleton rows={5} cols={4} />
      ) : filteredPeople.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <ClipboardCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">Roster List Empty</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">No active members match your search criteria.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm animate-[fadeIn_0.2s_ease-out_forwards]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-500 dark:text-dark-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">{userType === 'participant' ? 'Player ID' : 'User ID'}</th>
                  <th className="py-4 px-6">{userType === 'participant' ? 'Phone' : 'Role'}</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                {filteredPeople.map((person) => {
                  const status = attendanceMap[person._id] || 'absent';
                  const pId = userType === 'participant' ? person.participantId : person.userId;
                  return (
                    <tr
                      key={person._id}
                      className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 transition-colors"
                    >
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{person.name}</td>
                      <td className="py-4 px-6 text-slate-500 font-semibold">{pId || 'N/A'}</td>
                      <td className="py-4 px-6 text-slate-650 dark:text-dark-350 font-medium">
                        {userType === 'participant' ? person.mobileNumber : <span className="capitalize">{person.role}</span>}
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-full transition-all duration-150 border ${
                            status === 'present'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300/30 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-850'
                              : 'bg-rose-100 text-rose-800 border-rose-300/30 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-850'
                          }`}
                        >
                          {status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        {isEditable ? (
                          <button
                            onClick={() => handleToggleStatus(person._id)}
                            className={`font-bold py-1.5 px-4 rounded-xl text-xs shadow-sm transition-all border ${
                              status === 'present'
                                ? 'bg-slate-150 hover:bg-slate-200 dark:bg-dark-800 dark:hover:bg-dark-750 text-slate-700 dark:text-dark-300 border-slate-250 dark:border-dark-800'
                                : 'bg-primary-650 hover:bg-primary-700 text-white border-primary-500/20'
                            }`}
                          >
                            {status === 'present' ? 'Mark Absent' : 'Mark Present'}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Read Only</span>
                        )}
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
