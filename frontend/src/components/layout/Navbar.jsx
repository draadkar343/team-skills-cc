import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { getConfig } from '../../api/adminApi';

function SunIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M12 3v1m0 16v1m8.66-9h-1M4.34 12h-1m15.07-6.07-.7.7M6.34 17.66l-.7.7m12.73 0-.7-.7M6.34 6.34l-.7-.7M12 8a4 4 0 100 8 4 4 0 000-8z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
    </svg>
  );
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const [config, setConfig] = useState({ company_name: { value: 'Skills Management' }, company_logo: { value: null } });

  useEffect(() => {
    getConfig().then(setConfig).catch(() => {});
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <nav className="bg-blue-700 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
        <div className="flex items-center gap-3">
          {config.company_logo?.value && (
            <img src={config.company_logo.value} alt="Logo" className="h-9 w-auto rounded" />
          )}
          <span className="text-lg font-bold tracking-wide">
            {config.company_name?.value || 'Skills Management'}
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="opacity-80">{user?.firstName} {user?.lastName}</span>
          <span className="px-2 py-0.5 bg-blue-500 rounded capitalize text-xs">{user?.role}</span>
          {user?.avatarUrl ? (
            <img src={user.avatarUrl} alt="Avatar" className="h-8 w-8 rounded-full object-cover border-2 border-blue-400" />
          ) : (
            <div className="h-8 w-8 rounded-full bg-blue-500 border-2 border-blue-400 flex items-center justify-center text-xs font-bold">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
          )}
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
          </button>
          <button onClick={handleLogout} className="hover:underline">Logout</button>
        </div>
      </div>
    </nav>
  );
}
