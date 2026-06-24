import React, { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { ClipboardCheck, FileSpreadsheet, UserCheck, RefreshCw, Search, Scan, Camera, AlertCircle, CheckCircle } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

const Attendance = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // Single-day event uses today's date automatically
  const [date] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState('participant'); // 'participant', 'committee', 'scanner'
  const [people, setPeople] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({}); // id -> status ('present' / 'absent')
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Scanner states
  const [manualInput, setManualInput] = useState('');
  const [scannerActive, setScannerActive] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { status: 'success'|'error'|'info', message: '', code: '' }

  const scannerRef = useRef(null);
  const isEditable = user?.role === 'super_admin' || user?.role === 'admin';

  // Web Audio feedback beeps
  const playSuccessSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(1000, ctx.currentTime); // 1000Hz beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.15); // 150ms beep
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const playErrorSound = () => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(300, ctx.currentTime); // 300Hz beep
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      osc.start();
      osc.stop(ctx.currentTime + 0.3); // 300ms beep
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  const loadAttendance = async () => {
    if (activeTab === 'scanner') return;
    try {
      setLoading(true);
      // Fetch target group lists
      let list = [];
      if (activeTab === 'participant') {
        const response = await api.get('/participants');
        list = response.data.data.filter(p => p.status === 'active');
      } else {
        const response = await api.get('/users').catch(() => ({ data: { data: [] } }));
        // Filter users to show only Committee members (admins/viewers)
        list = (response.data.data || []).filter(u => ['super_admin', 'admin', 'viewer'].includes(u.role));
      }

      // Fetch saved logs for selected date
      const logsRes = await api.get(`/attendance`, { params: { date, userType: activeTab } });
      const logs = logsRes.data.data || [];

      // Map existing records
      const initialMap = {};
      list.forEach(p => {
        const logged = logs.find(log => 
          activeTab === 'participant' 
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
    // Reset scanner state when navigating away
    if (activeTab !== 'scanner') {
      setScannerActive(false);
    }
  }, [activeTab]);

  // Live camera QR code scanner hook
  useEffect(() => {
    let qrScanner = null;
    if (activeTab === 'scanner' && scannerActive) {
      qrScanner = new Html5Qrcode('qr-reader-target');
      
      const config = { fps: 10, qrbox: { width: 250, height: 250 } };
      
      qrScanner.start(
        { facingMode: 'environment' },
        config,
        async (decodedText) => {
          if (decodedText) {
            // Stop scanning temporarily on hit to prevent concurrent calls
            setScannerActive(false);
            await handleCheckIn(decodedText);
            // Resume scanning after delay
            setTimeout(() => {
              setScannerActive(true);
            }, 2500);
          }
        },
        () => {
          // Silent scan frame errors
        }
      ).catch((err) => {
        showToast('Camera access permission error: ' + err.message, 'error');
        setScannerActive(false);
      });
    }

    return () => {
      if (qrScanner && qrScanner.isScanning) {
        qrScanner.stop().catch(e => console.warn('Failed to stop camera scanner:', e));
      }
    };
  }, [activeTab, scannerActive]);

  const handleCheckIn = async (scanCode) => {
    if (!scanCode || !scanCode.trim()) return;
    const code = scanCode.trim();
    
    try {
      setScanLoading(true);
      const response = await api.post('/attendance/qr', { scanData: code, date });
      if (response.data.success) {
        if (response.data.alreadyPresent) {
          playSuccessSound(); // friendly confirmation
          setScanResult({
            status: 'info',
            message: response.data.message,
            code
          });
        } else {
          playSuccessSound();
          setScanResult({
            status: 'success',
            message: response.data.message,
            code
          });
        }
      }
    } catch (err) {
      playErrorSound();
      const errMessage = err.response?.data?.message || 'Verification failed. Member not registered.';
      setScanResult({
        status: 'error',
        message: errMessage,
        code
      });
    } finally {
      setScanLoading(false);
    }
  };

  const handleManualScanSubmit = (e) => {
    e.preventDefault();
    if (!manualInput) return;
    handleCheckIn(manualInput);
    setManualInput('');
  };

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
        userType: activeTab,
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
    
    if (activeTab === 'participant') {
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
    link.setAttribute('download', `Attendance_Report_${activeTab}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Attendance report exported to CSV successfully', 'success');
  };

  const filteredPeople = people.filter(p => {
    const term = searchQuery.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(term);
    const idVal = activeTab === 'participant' ? p.participantId : p.userId;
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

        {activeTab !== 'scanner' && (
          <div className="flex items-center gap-2 self-start sm:self-center">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 dark:border-dark-800 shadow-sm"
            >
              <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
              <span>Export Attendance Report</span>
            </button>
          </div>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-slate-200 dark:border-dark-800 pb-px gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('participant')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'participant'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-450 hover:text-slate-750 dark:text-dark-400'
          }`}
        >
          Participants
        </button>
        <button
          onClick={() => setActiveTab('committee')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
            activeTab === 'committee'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-450 hover:text-slate-750 dark:text-dark-400'
          }`}
        >
          Committee
        </button>
        <button
          onClick={() => setActiveTab('scanner')}
          className={`py-3 px-4 font-bold text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'scanner'
              ? 'border-primary-500 text-primary-600 dark:text-primary-400'
              : 'border-transparent text-slate-450 hover:text-slate-750 dark:text-dark-400'
          }`}
        >
          <Scan className="w-4 h-4" />
          <span>Attendance Scanner</span>
        </button>
      </div>

      {/* Registry Lists Tabs content */}
      {activeTab !== 'scanner' ? (
        <div className="space-y-6">
          {/* Search and Action Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl p-5 shadow-sm">
            <div className="relative flex items-center md:col-span-2">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Search className="w-4.5 h-4.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, ID or mobile..."
                className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white focus:outline-none focus:border-primary-500 font-semibold"
              />
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3">
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
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-primary-650 hover:bg-primary-700 text-white font-bold py-2.5 px-6 rounded-xl text-sm shadow-md transition-all border border-primary-500/20 whitespace-nowrap"
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
                    <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                      <th className="py-4 px-6">Name</th>
                      <th className="py-4 px-6">{activeTab === 'participant' ? 'Player ID' : 'Committee ID'}</th>
                      {activeTab === 'participant' && <th className="py-4 px-6">Phone</th>}
                      <th className="py-4 px-6">Status</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 text-sm">
                    {filteredPeople.map((person) => {
                      const status = attendanceMap[person._id] || 'absent';
                      const pId = activeTab === 'participant' ? person.participantId : person.userId;
                      return (
                        <tr
                          key={person._id}
                          className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20 transition-colors"
                        >
                          <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{person.name}</td>
                          <td className="py-4 px-6 text-slate-500 font-semibold">{pId || 'N/A'}</td>
                          {activeTab === 'participant' && (
                            <td className="py-4 px-6 text-slate-650 dark:text-dark-350 font-medium">
                              {person.mobileNumber || 'Not Specified'}
                            </td>
                          )}
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
      ) : (
        /* SCANNER INTERFACE */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-[fadeIn_0.2s_ease-out_forwards]">
          {/* Scanner Controls & Manual Input */}
          <div className="lg:col-span-1 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Scan className="w-5 h-5 text-primary-500" />
                <span>Verification Terminal</span>
              </h3>
              <p className="text-xs text-slate-400 leading-normal">
                Scan participant dynamic QR passes or committee coordinator IDs to automatically check them in.
              </p>

              {/* Manual Input form */}
              <form onSubmit={handleManualScanSubmit} className="space-y-3 pt-2">
                <label className="block text-[10px] font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest">Manual Entry / Barcode gun</label>
                <div className="relative">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Scan barcode or type ID (e.g. P001)..."
                    className="w-full bg-slate-50 border border-slate-200 dark:bg-dark-950 dark:border-dark-800 rounded-xl py-2.5 px-4 text-xs font-semibold text-slate-800 dark:text-white focus:outline-none focus:border-primary-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  disabled={scanLoading || !manualInput}
                  className="w-full bg-slate-850 hover:bg-slate-950 text-white font-bold py-2.5 px-4 rounded-xl text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  Verify ID Pass
                </button>
              </form>
            </div>

            {/* Camera trigger */}
            <div className="pt-6 border-t border-slate-100 dark:border-dark-850">
              <button
                onClick={() => setScannerActive(!scannerActive)}
                className={`w-full flex items-center justify-center gap-2 font-bold py-3 px-4 rounded-xl text-xs shadow-md border active:scale-[0.98] transition-all ${
                  scannerActive
                    ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500/20'
                    : 'bg-primary-600 hover:bg-primary-500 text-white border-primary-500/20'
                }`}
              >
                <Camera className="w-4 h-4" />
                <span>{scannerActive ? 'Turn Off Camera Scanner' : 'Activate Camera Scanner'}</span>
              </button>
            </div>
          </div>

          {/* Scanner Screen / Live View */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[400px]">
            {/* Header info */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-dark-800 pb-3">
              <h3 className="font-extrabold text-slate-850 dark:text-white text-base">Terminal Screen</h3>
              <span className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold uppercase">
                <span className={`w-2 h-2 rounded-full ${scannerActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                {scannerActive ? 'Live Camera Feed' : 'Standby Mode'}
              </span>
            </div>

            {/* Video View or Standby State */}
            <div className="flex-1 flex items-center justify-center py-6">
              {scannerActive ? (
                <div className="relative w-full max-w-sm rounded-2xl overflow-hidden border border-slate-250 dark:border-dark-800 aspect-square bg-slate-950 flex items-center justify-center shadow-inner">
                  {/* QR Target Window */}
                  <div id="qr-reader-target" className="w-full h-full object-cover"></div>
                  {/* Target bounding helper overlay */}
                  <div className="absolute inset-0 border-[40px] border-black/50 pointer-events-none flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary-500/80 rounded-xl relative">
                      <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-primary-400 rounded-tl"></div>
                      <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-primary-400 rounded-tr"></div>
                      <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-primary-400 rounded-bl"></div>
                      <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-primary-400 rounded-br"></div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 space-y-3 max-w-sm">
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-dark-950 flex items-center justify-center mx-auto text-slate-350 dark:text-dark-800">
                    <Scan className="w-8 h-8" />
                  </div>
                  <h4 className="font-extrabold text-slate-700 dark:text-white text-sm">Scanner Ready</h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Activate camera scanning to scan QR pass cards using the device camera, or trigger scans automatically with hardware scanner guns.
                  </p>
                </div>
              )}
            </div>

            {/* Scan Status Response alerts */}
            {scanResult && (
              <div className={`p-4 rounded-2xl border flex gap-3.5 items-start animate-[fadeIn_0.15s_ease-out_forwards] ${
                scanResult.status === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/50 dark:text-emerald-400'
                  : scanResult.status === 'info'
                  ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/20 dark:border-blue-900/50 dark:text-blue-400'
                  : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/20 dark:border-rose-900/50 dark:text-rose-400'
              }`}>
                {scanResult.status === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" />
                ) : scanResult.status === 'info' ? (
                  <CheckCircle className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                )}

                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-sm leading-tight">
                    {scanResult.status === 'success' ? 'Verified Check-in!' : scanResult.status === 'info' ? 'Already Checked-in' : 'Pass Verification Failed'}
                  </h4>
                  <p className="text-xs font-semibold opacity-95">{scanResult.message}</p>
                  <span className="text-[10px] opacity-60 font-mono font-bold block pt-1">Code: {scanResult.code}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
