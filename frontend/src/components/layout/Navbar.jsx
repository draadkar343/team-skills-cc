import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getConfig } from '../../api/adminApi';

export default function Navbar() {
  const { user, logout } = useAuth();
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
          <button onClick={handleLogout} className="hover:underline">Logout</button>
        </div>
      </div>
    </nav>
  );
}
