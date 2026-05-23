import React from 'react';

export const CardSkeleton = () => (
  <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
    </div>
    <div className="h-8 w-16 bg-slate-300 dark:bg-slate-700 rounded mb-2"></div>
    <div className="h-3 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
  </div>
);

export const TableSkeleton = ({ rows = 5 }) => (
  <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden animate-pulse">
    <div className="h-12 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-800 flex items-center px-6">
      <div className="h-4 w-full bg-slate-200 dark:bg-slate-700 rounded"></div>
    </div>
    {[...Array(rows)].map((_, i) => (
      <div key={i} className="h-16 border-b border-slate-100 dark:border-slate-800/50 flex items-center px-6 gap-4">
        <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-1/4 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-1/5 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded ml-auto"></div>
      </div>
    ))}
  </div>
);

export const MapSkeleton = () => (
  <div className="w-full h-[500px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center gap-3 animate-pulse">
    <div className="h-12 w-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center">
      <div className="h-6 w-6 bg-slate-300 dark:bg-slate-700 rounded-full"></div>
    </div>
    <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded"></div>
    <div className="h-3 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
  </div>
);

export const KanbanSkeleton = () => (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 animate-pulse">
    {[...Array(4)].map((_, colIdx) => (
      <div key={colIdx} className="bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200/50 dark:border-slate-800/50 h-[600px] flex flex-col gap-4">
        <div className="flex justify-between items-center mb-2">
          <div className="h-5 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-6 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </div>
        {[...Array(colIdx === 0 ? 3 : colIdx === 1 ? 2 : 1)].map((_, cardIdx) => (
          <div key={cardIdx} className="bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-3">
            <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
            <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="h-3 w-2/3 bg-slate-100 dark:bg-slate-800 rounded"></div>
            <div className="flex justify-between items-center mt-2">
              <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              <div className="h-6 w-6 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>
    ))}
  </div>
);
