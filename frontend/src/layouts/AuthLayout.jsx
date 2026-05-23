import React from 'react';
import { useTheme } from '../hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

const AuthLayout = ({ children }) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 relative overflow-hidden transition-colors duration-200">
      {/* Decorative background blur objects */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-500/10 dark:bg-blue-600/10 blur-[130px] pointer-events-none animate-float-slow"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-indigo-500/10 dark:bg-indigo-600/10 blur-[130px] pointer-events-none animate-float-slower"></div>

      {/* Floating Theme Switcher */}
      <button
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-full border border-slate-200 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 shadow-sm hover:scale-105 active:scale-95"
        title="Toggle Theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Content Container */}
      <div className="w-full max-w-md bg-white/70 dark:bg-slate-900/60 backdrop-blur-xl border border-slate-200/40 dark:border-slate-800/50 shadow-2xl rounded-2xl p-8 relative z-20 transition-all duration-300">
        <div className="flex flex-col items-center mb-8">
          <img 
            src="/fleetflow_logo.svg" 
            alt="FleetFlow Logo" 
            className="h-14 w-14 mb-3 hover:scale-110 transition-transform duration-300" 
          />
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent">
            FleetFlow
          </h1>
          <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1.5">
            Logistics Control Center
          </p>
        </div>

        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
