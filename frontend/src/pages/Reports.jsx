import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { TableSkeleton } from '../components/Skeleton';
import { FileText, Download, Printer, Filter, ShieldCheck, RefreshCw } from 'lucide-react';

const Reports = () => {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('tournaments'); // tournaments, attendance, participation, committee, leaderboard
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadReportData = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/reports/${activeTab}`);
      if (response.data.success) {
        setData(response.data.data);
      }
    } catch (err) {
      showToast(`Failed to load ${activeTab} report metrics`, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [activeTab]);

  const handleExportCSV = () => {
    if (data.length === 0) {
      showToast('No data available to export', 'warning');
      return;
    }

    let csvContent = 'data:text/csv;charset=utf-8,';
    
    if (activeTab === 'tournaments') {
      csvContent += 'Tournament Name,Venue,Start Date,End Date,Status,Game Type,Teams Registered\r\n';
      data.forEach(item => {
        csvContent += `"${item.name}","${item.venue}","${new Date(item.startDate).toLocaleDateString()}","${new Date(item.endDate).toLocaleDateString()}","${item.status}","${item.gameType}","${item.teamCount}"\r\n`;
      });
    } else if (activeTab === 'attendance') {
      csvContent += 'Date,Category,Status,Record Count\r\n';
      data.forEach(item => {
        item.stats.forEach(s => {
          csvContent += `"${item._id}","${s.userType}","${s.status}","${s.count}"\r\n`;
        });
      });
    } else if (activeTab === 'participation') {
      csvContent += 'College / Institute,Athlete Registrations,Active Registrations\r\n';
      data.forEach(item => {
        csvContent += `"${item._id}","${item.count}","${item.activeCount}"\r\n`;
      });
    } else if (activeTab === 'committee') {
      csvContent += 'Committee Name,Assigned Role,Performed Action,Audit Count\r\n';
      data.forEach(item => {
        csvContent += `"${item.userLabel}","${item.role}","${item.action}","${item.count}"\r\n`;
      });
    } else if (activeTab === 'leaderboard') {
      csvContent += 'Tournament,Team,Rank,Points,Wins,Losses,Draws,Matches Played,Net Score\r\n';
      data.forEach(item => {
        csvContent += `"${item.tournamentId?.name || 'Unknown'}","${item.teamId?.name || 'Deleted'}","${item.rank}","${item.points}","${item.wins}","${item.losses}","${item.draws}","${item.matchesPlayed}","${item.netScore}"\r\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `ICAI_Sports_${activeTab}_Report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`${activeTab} report downloaded successfully!`, 'success');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 fade-in print:bg-white print:text-black">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white">Analytical Reports</h1>
          <p className="text-sm text-slate-500 dark:text-dark-400 mt-1">Audit standings, attendance metrics, registrations, and logs.</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-500 text-white font-bold py-2.5 px-4 rounded-xl text-sm shadow-md transition-all border border-primary-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Download CSV / Excel</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-white dark:bg-dark-900 hover:bg-slate-50 dark:hover:bg-dark-850 text-slate-700 dark:text-dark-300 font-bold py-2.5 px-4 rounded-xl text-sm border border-slate-200 dark:border-dark-800 shadow-sm"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Print PDF</span>
          </button>
        </div>
      </div>

      {/* Tabs list print:hidden */}
      <div className="border-b border-slate-200 dark:border-dark-800 pb-px flex gap-2 overflow-x-auto print:hidden">
        {[
          { key: 'tournaments', label: 'Tourneys Summary' },
          { key: 'attendance', label: 'Attendance logs' },
          { key: 'participation', label: 'Participation breakdown' },
          { key: 'committee', label: 'Committee activity' },
          { key: 'leaderboard', label: 'Leaderboard tallies' }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`py-3 px-4 font-bold text-xs uppercase tracking-widest whitespace-nowrap border-b-2 transition-all ${
              activeTab === tab.key
                ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                : 'border-transparent text-slate-450 hover:text-slate-750 dark:text-dark-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Report grid view */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : data.length === 0 ? (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl py-16 text-center shadow-sm">
          <FileText className="w-12 h-12 mx-auto text-slate-300 dark:text-dark-800 mb-3" />
          <h3 className="text-base font-bold text-slate-700 dark:text-white">Report data unavailable</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">There are no matching data logs available to build this summary.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Printable Report Header */}
          <div className="hidden print:block p-6 text-center border-b border-slate-200">
            <h2 className="text-2xl font-bold uppercase tracking-wider">ICAI Bathinda Sports Tournament</h2>
            <h3 className="text-sm font-semibold text-slate-500 capitalize mt-1">{activeTab} Analytical Report</h3>
            <span className="text-[10px] text-slate-400 mt-2 block">Generated on {new Date().toLocaleString()}</span>
          </div>

          <div className="overflow-x-auto">
            {activeTab === 'tournaments' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Tournament Name</th>
                    <th className="py-4 px-6">Venue</th>
                    <th className="py-4 px-6">Timeline</th>
                    <th className="py-4 px-6 text-center">Status</th>
                    <th className="py-4 px-6 text-center">Teams Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-medium">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{item.name}</td>
                      <td className="py-4 px-6">{item.venue}</td>
                      <td className="py-4 px-6 text-xs text-slate-500">{new Date(item.startDate).toLocaleDateString()} - {new Date(item.endDate).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-slate-100 dark:bg-dark-850">
                          {item.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold">{item.teamCount} Teams</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'attendance' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Logged Date</th>
                    <th className="py-4 px-6">Category Type</th>
                    <th className="py-4 px-6">Status Log</th>
                    <th className="py-4 px-6 text-center">Records Check-in</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-medium">
                  {data.map((item, idx) => (
                    <React.Fragment key={idx}>
                      {item.stats.map((s, sIdx) => (
                        <tr key={`${idx}-${sIdx}`} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                          <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-300">{item._id}</td>
                          <td className="py-4 px-6 text-slate-500 capitalize">{s.userType}</td>
                          <td className="py-4 px-6 capitalize">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.status === 'present' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30' : 'bg-rose-100 text-rose-800 dark:bg-rose-950/30'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-center font-extrabold">{s.count} Items</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'participation' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-4 px-6">College / Institute Name</th>
                    <th className="py-4 px-6 text-center">Registered Competitors Count</th>
                    <th className="py-4 px-6 text-center">Active Competitors Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-medium">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{item._id || 'Unknown / General'}</td>
                      <td className="py-4 px-6 text-center font-semibold text-slate-700 dark:text-slate-300">{item.count} players</td>
                      <td className="py-4 px-6 text-center text-emerald-500 font-extrabold">{item.activeCount} active</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'committee' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Committee Organizer</th>
                    <th className="py-4 px-6">Assigned Role</th>
                    <th className="py-4 px-6">Executed Operation</th>
                    <th className="py-4 px-6 text-center">Total Actions Recorded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-medium">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-primary-500" />
                        <span>{item.userLabel}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-550 capitalize">{item.role?.replace('_', ' ')}</td>
                      <td className="py-4 px-6 capitalize">
                        <span className="bg-slate-100 dark:bg-dark-850 px-2 py-0.5 rounded-lg text-xs font-semibold">
                          {item.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-extrabold text-primary-500">{item.count} audits</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {activeTab === 'leaderboard' && (
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-dark-950/50 border-b border-slate-100 dark:border-dark-800 text-xs font-bold text-slate-505 dark:text-dark-400 uppercase tracking-wider">
                    <th className="py-4 px-6">Tournament</th>
                    <th className="py-4 px-6">Team Name</th>
                    <th className="py-4 px-6 text-center">Rank</th>
                    <th className="py-4 px-6 text-center">Wins</th>
                    <th className="py-4 px-6 text-center">Losses</th>
                    <th className="py-4 px-6 text-center font-black">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-dark-800/60 font-medium">
                  {data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-dark-950/20">
                      <td className="py-4 px-6 text-xs text-slate-500">{item.tournamentId?.name || 'Deleted Tournament'}</td>
                      <td className="py-4 px-6 font-bold text-slate-800 dark:text-white">{item.teamId?.name || 'Deleted Team'}</td>
                      <td className="py-4 px-6 text-center font-bold">#{item.rank}</td>
                      <td className="py-4 px-6 text-center text-emerald-500">{item.wins} W</td>
                      <td className="py-4 px-6 text-center text-rose-500">{item.losses} L</td>
                      <td className="py-4 px-6 text-center font-extrabold text-base text-primary-500">{item.points} pts</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
