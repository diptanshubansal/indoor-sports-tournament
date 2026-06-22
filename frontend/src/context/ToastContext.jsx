import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext();

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      
      {/* Toast Notification Container Overlay */}
      <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start justify-between p-4 rounded-xl shadow-lg border text-sm font-medium animate-[fadeIn_0.3s_ease-out_forwards] ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/80 dark:border-emerald-800 dark:text-emerald-300'
                : toast.type === 'error'
                ? 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/80 dark:border-rose-800 dark:text-rose-300'
                : toast.type === 'warning'
                ? 'bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-950/80 dark:border-amber-800 dark:text-amber-300'
                : 'bg-slate-50 border-slate-200 text-slate-800 dark:bg-slate-900/80 dark:border-slate-800 dark:text-slate-300'
            }`}
          >
            <div className="flex gap-3">
              <span className="mt-0.5">
                {toast.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {toast.type === 'error' && <XCircle className="w-5 h-5 text-rose-500" />}
                {toast.type === 'warning' && <AlertCircle className="w-5 h-5 text-amber-500" />}
                {toast.type === 'info' && <Info className="w-5 h-5 text-blue-500" />}
              </span>
              <p className="leading-tight">{toast.message}</p>
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="ml-4 hover:opacity-75 transition-opacity"
            >
              <X className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};
