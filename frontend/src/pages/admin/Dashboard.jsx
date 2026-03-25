import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getStats } from '../../api/adminApi';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => { getStats().then(setStats).catch(() => {}); }, []);

  if (!stats) return <div className="p-6">Loading...</div>;

  const cards = [
    { label: 'Active Users', value: stats.activeUsers, color: 'blue', link: '/admin/users' },
    { label: 'Approved Skills', value: stats.approvedSkills, color: 'green', link: '/admin/all-skills' },
    { label: 'Pending Skills', value: stats.pendingSkills, color: 'yellow', link: '/admin/all-skills' },
    { label: 'Approved Timesheets', value: stats.approvedTimesheets, color: 'green', link: '/admin/all-timesheets' },
    { label: 'Pending Timesheets', value: stats.pendingTimesheets, color: 'yellow', link: '/admin/all-timesheets' },
  ];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Admin Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Company-wide overview</p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        {cards.map(({ label, value, color, link }) => (
          <Link key={label} to={link} className={`bg-white rounded-xl border border-${color}-200 p-4 text-center shadow-sm hover:shadow-md transition-shadow`}>
            <div className={`text-3xl font-bold text-${color}-600`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {[
          { title: 'User Management', desc: 'Create, edit users and assign roles', link: '/admin/users' },
          { title: 'Skills Catalogue', desc: 'Manage the list of available skills', link: '/admin/skills' },
          { title: 'System Config', desc: 'Company logo, name, and settings', link: '/admin/config' },
        ].map(({ title, desc, link }) => (
          <Link key={title} to={link} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-gray-500">{desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
