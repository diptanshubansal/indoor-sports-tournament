import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useToast } from '../context/ToastContext';
import { QrCode, User, CheckCircle2, XCircle, ShieldAlert, Award } from 'lucide-react';

const AttendanceQR = () => {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [attendance, setAttendance] = useState({
    isPresent: false,
    checkedInAt: null,
    checkedBy: null,
    playerId: '',
  });
  const [loading, setLoading] = useState(true);

  // Initial load
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const response = await api.get('/participants/my-dashboard');
        if (response.data.success) {
          setData(response.data.data);
          setAttendance({
            isPresent: response.data.data.isPresent,
            checkedInAt: response.data.data.checkedInAt,
            checkedBy: response.data.data.checkedBy,
            playerId: response.data.data.playerId || response.data.data.participantId,
          });
        }
      } catch (error) {
        showToast('Failed to load attendance QR code', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, []);

  // Poll for attendance updates every 5 seconds
  useEffect(() => {
    if (!data) return;

    let intervalId = setInterval(async () => {
      try {
        const response = await api.get('/participants/attendance-status');
        if (response.data.success) {
          const newStatus = response.data.data;
          
          // Trigger a toast notification when status changes from false to true
          if (newStatus.isPresent && !attendance.isPresent) {
            showToast('Attendance recorded successfully!', 'success');
          }

          setAttendance(newStatus);
        }
      } catch (error) {
        console.error('Polling error', error);
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(intervalId);
  }, [data, attendance.isPresent]);

  const formatTime = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary-500 border-t-transparent"></div>
          <span className="text-sm font-semibold text-slate-500 dark:text-dark-400">Generating secure pass...</span>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-8 text-center max-w-lg mx-auto shadow-sm">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h3 className="text-lg font-bold text-slate-800 dark:text-white">Access Error</h3>
        <p className="text-sm text-slate-500 dark:text-dark-400 mt-2">
          Unable to generate your digital attendance pass. Please check your network connection or contact support.
        </p>
      </div>
    );
  }

  const { name } = data;
  const participantId = attendance.playerId || data.participantId;
  const isPresent = attendance.isPresent;

  return (
    <div className="max-w-md mx-auto space-y-6 fade-in py-4">
      {/* Header Info */}
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Attendance QR</h1>
        <p className="text-xs text-slate-400 dark:text-dark-500">Scan this pass at the desk to record your check-in.</p>
      </div>

      {/* Main QR Card */}
      <div className="bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-3xl p-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
        {/* Decorative corner lights */}
        <div className="absolute -right-16 -top-16 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>
        <div className="absolute -left-16 -bottom-16 w-32 h-32 bg-primary-500/10 rounded-full blur-2xl"></div>

        <div className="relative z-10 w-full flex flex-col items-center">
          {/* Header block within card */}
          <div className="flex items-center gap-2 mb-6">
            <Award className="w-5 h-5 text-primary-500" />
            <span className="text-xs font-bold text-slate-400 dark:text-dark-500 uppercase tracking-widest">Digital Entry Pass</span>
          </div>

          {/* QR Container */}
          <div className="p-4 bg-slate-50 dark:bg-dark-950 rounded-2xl border border-slate-150 dark:border-dark-850 shadow-inner flex items-center justify-center mb-6">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${participantId}`}
              alt="Attendance QR Pass"
              className="w-48 h-48 object-contain rounded-lg border border-slate-200 dark:border-dark-800"
            />
          </div>

          {/* User Info Details */}
          <div className="w-full space-y-3 mb-6 bg-slate-50 dark:bg-dark-950/50 p-4 rounded-2xl border border-slate-100 dark:border-dark-900">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-400 font-semibold">Player Name</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">{name}</span>
            </div>
            <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-dark-850">
              <span className="text-slate-400 font-semibold">Player ID</span>
              <span className="text-primary-500 font-extrabold tracking-wider uppercase">{participantId}</span>
            </div>
          </div>

          {/* Daily Status Indicator */}
          <div className="w-full pt-2">
            {isPresent ? (
              <div className="space-y-4 w-full">
                {/* Green Status Card */}
                <div className="w-full flex items-center justify-center gap-2 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-400 rounded-2xl text-sm font-bold animate-[scaleIn_0.2s_ease-out]">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  <span>✅ Attendance Marked</span>
                </div>

                {/* Detailed check-in info block */}
                <div className="w-full bg-slate-50 dark:bg-dark-950/50 p-4 rounded-2xl border border-slate-100 dark:border-dark-900 space-y-3 text-left">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400 font-semibold">Status</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span>
                      Present
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-dark-850">
                    <span className="text-slate-400 font-semibold">Checked-In Time</span>
                    <span className="text-slate-800 dark:text-slate-200 font-bold">{formatTime(attendance.checkedInAt)}</span>
                  </div>
                  {attendance.checkedBy && (
                    <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-100 dark:border-dark-850">
                      <span className="text-slate-400 font-semibold">Checked By</span>
                      <span className="text-slate-800 dark:text-slate-200 font-bold">{attendance.checkedBy}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="w-full flex items-center justify-center gap-2 p-3.5 bg-rose-50 dark:bg-rose-950/20 text-rose-705 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30 rounded-2xl text-sm font-bold">
                <XCircle className="w-5 h-5 text-rose-500 shrink-0 animate-pulse" />
                <span>❌ Not Checked In Today</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AttendanceQR;
