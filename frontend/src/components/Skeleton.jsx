import React from 'react';

export const CardSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl p-5">
    <div className="flex justify-between items-start mb-4">
      <div className="h-4 bg-slate-200 dark:bg-dark-800 rounded w-1/3"></div>
      <div className="h-8 w-8 bg-slate-200 dark:bg-dark-800 rounded-lg"></div>
    </div>
    <div className="h-7 bg-slate-200 dark:bg-dark-800 rounded w-1/2 mb-2"></div>
    <div className="h-3 bg-slate-200 dark:bg-dark-800 rounded w-2/3"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5, cols = 4 }) => (
  <div className="animate-pulse w-full">
    <div className="h-10 bg-slate-200 dark:bg-dark-800 rounded-t-xl mb-1"></div>
    {[...Array(rows)].map((_, i) => (
      <div
        key={i}
        className="flex gap-4 border-b border-slate-100 dark:border-dark-800/50 py-4 px-4 items-center"
      >
        {[...Array(cols)].map((_, j) => (
          <div key={j} className="h-4 bg-slate-200 dark:bg-dark-800 rounded flex-1"></div>
        ))}
      </div>
    ))}
  </div>
);

export const ChartSkeleton = () => (
  <div className="animate-pulse bg-white dark:bg-dark-900 border border-slate-200 dark:border-dark-800 rounded-xl p-5 h-80 flex flex-col justify-end gap-3">
    <div className="h-4 bg-slate-200 dark:bg-dark-800 rounded w-1/4 self-start mb-auto"></div>
    <div className="flex items-end justify-between gap-4 h-48 px-2">
      <div className="h-12 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
      <div className="h-28 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
      <div className="h-20 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
      <div className="h-36 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
      <div className="h-24 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
      <div className="h-44 bg-slate-200 dark:bg-dark-800 rounded w-full"></div>
    </div>
  </div>
);
