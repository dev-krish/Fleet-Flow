import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { Shield, Key, Mail, AlertTriangle } from 'lucide-react';

const Login = () => {
  const { login, googleLogin } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const demoAccounts = [
    { label: 'Admin', email: 'admin@fleetflow.com', desc: 'Full logistics management & delete access' },
    { label: 'Dispatcher', email: 'dispatcher@fleetflow.com', desc: 'Driver & truck route assignments' },
    { label: 'Warehouse Mgr', email: 'warehouse@fleetflow.com', desc: 'Create shipments & receive PODs' },
    { label: 'Driver', email: 'driver@fleetflow.com', desc: 'Mobile portals, status & POD uploads' },
  ];

  const handleDemoClick = async (demEmail) => {
    setEmail(demEmail);
    setPassword('password123');
    setError('');
    setIsSubmitting(true);
    try {
      const user = await login({ email: demEmail, password: 'password123' });
      if (user.role === 'Driver') {
        navigate('/driver-portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Demo Login error:', err);
      setError(err.response?.data?.message || 'Demo credentials failed or backend connection error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLoginSuccess = async (response) => {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await googleLogin(response.credential);
      
      // Navigate based on user roles
      if (user.role === 'Driver') {
        navigate('/driver-portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError(err.response?.data?.message || 'Google Sign-In failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulatedGoogleLogin = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const user = await googleLogin('mock_google_token_bypass');
      
      // Navigate based on user roles
      if (user.role === 'Driver') {
        navigate('/driver-portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Simulated Google login error:', err);
      setError(err.response?.data?.message || 'Simulated Google Sign-In failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    let interval;
    const initializeGoogle = () => {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1047714885871-mockclientid123456789.apps.googleusercontent.com',
          callback: handleGoogleLoginSuccess,
        });
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
          window.google.accounts.id.renderButton(
            btnContainer,
            { 
              theme: theme === 'dark' ? 'filled_black' : 'outline', 
              size: 'large', 
              width: 384,
              shape: 'rectangular'
            }
          );
        }
        clearInterval(interval);
      }
    };

    interval = setInterval(initializeGoogle, 200);
    initializeGoogle();

    return () => clearInterval(interval);
  }, [theme]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const user = await login({ email, password });
      
      // Navigate based on user roles
      if (user.role === 'Driver') {
        navigate('/driver-portal');
      } else {
        navigate('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.response?.data?.message || 'Invalid credentials or database connection failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-center text-slate-800 dark:text-slate-200 mb-1">
          Access Control Panel
        </h2>
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          Enter credentials or use sandbox shortcuts
        </p>
      </div>

      {/* Production Backend Configuration Warning */}
      {!window.location.hostname.includes('localhost') && (!import.meta.env.VITE_API_URL || import.meta.env.VITE_API_URL.includes('localhost')) && (
        <div className="flex flex-col gap-1.5 p-3.5 mb-2 text-xs font-medium text-amber-850 dark:text-amber-400 bg-amber-50/90 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/50 rounded-xl animate-scale-in">
          <div className="flex gap-2 font-bold items-center text-amber-600 dark:text-amber-500">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Backend Connection Warning</span>
          </div>
          <p className="text-[11px] leading-relaxed opacity-95 text-amber-800 dark:text-amber-400/90">
            This deployment is running on Vercel, but trying to connect to a local backend (localhost). 
            Please configure the <strong>VITE_API_URL</strong> and <strong>VITE_SOCKET_URL</strong> project environment variables on Vercel to point to your Render backend URL.
          </p>
        </div>
      )}

      {error && (
        <div className="flex gap-2 p-3.5 mb-2 text-xs font-semibold text-rose-600 bg-rose-50/80 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50 rounded-xl animate-scale-in">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            Email Address
          </label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. admin@fleetflow.com"
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Password Input */}
        <div>
          <label className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
            Security Password
          </label>
          <div className="relative">
            <Key className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full pl-11 pr-4 py-2.5 text-sm bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 dark:text-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Login Action Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold transition-all duration-200 flex justify-center items-center gap-2 shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <span className="h-4 w-4 border-2 border-t-white border-blue-300 rounded-full animate-spin"></span>
          ) : (
            'Access Dashboard'
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="relative flex py-2 items-center">
        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/60"></div>
        <span className="flex-shrink mx-4 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">or auth using</span>
        <div className="flex-grow border-t border-slate-200/80 dark:border-slate-800/60"></div>
      </div>

      {/* Google SSO Section */}
      <div className="flex flex-col items-center justify-center w-full space-y-3">
        {/* Real GIS Button */}
        <div id="google-signin-btn" className="w-full flex justify-center overflow-hidden rounded-xl"></div>
        
        {/* Customized Premium Simulation Button */}
        <button
          type="button"
          onClick={handleSimulatedGoogleLogin}
          className="w-full py-2.5 bg-slate-50/80 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-900/60 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 transition-all duration-200 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99]"
          title="Bypasses Client ID requirement for quick testing"
        >
          {/* Google SVG G logo */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span>Demo Google SSO Simulation</span>
          <span className="h-2 w-2 bg-emerald-500 rounded-full animate-pulse ml-0.5"></span>
        </button>
      </div>

      {/* Demo Accounts Quick-Select Card */}
      <div className="mt-8 border-t border-slate-200/80 dark:border-slate-800/60 pt-6">
        <div className="flex items-center gap-1.5 mb-4">
          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
            Quick Sandbox Access
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-500 dark:text-blue-400 font-bold uppercase tracking-wider">
            No PW Req
          </span>
        </div>
        
        <div className="grid grid-cols-2 gap-2.5">
          {demoAccounts.map((account) => {
            // Pick a dynamic theme color based on role
            let badgeStyle = "";
            if (account.label === 'Admin') {
              badgeStyle = "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40";
            } else if (account.label === 'Dispatcher') {
              badgeStyle = "bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-100 dark:border-purple-900/40";
            } else if (account.label === 'Warehouse Mgr') {
              badgeStyle = "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40";
            } else {
              badgeStyle = "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40";
            }

            return (
              <button
                key={account.label}
                type="button"
                onClick={() => handleDemoClick(account.email)}
                className="flex flex-col items-start p-3 text-left bg-slate-50/50 dark:bg-slate-950/30 hover:bg-white dark:hover:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700/80 rounded-xl transition-all duration-200 group hover:scale-[1.02] shadow-sm hover:shadow-md active:scale-[0.98]"
              >
                <span className={`inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md border uppercase tracking-wider ${badgeStyle} mb-1.5`}>
                  {account.label}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate w-full group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors">
                  {account.email}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Login;
