import React, { useEffect, useState, useMemo } from 'react';
import api from '../../api/axiosInstance';

const ROLE_COLORS = {
  employee:           'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  manager:            'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  functional_manager: 'bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300',
  resourcing:         'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  administrator:      'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
};

const ROLE_LABELS = {
  employee:           'Employee',
  manager:            'Manager',
  functional_manager: 'Functional Manager',
  resourcing:         'Resourcing',
  administrator:      'Administrator',
};

function Avatar({ url, name, size = 16 }) {
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (url) return <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover`} />;
  return (
    <div className={`w-${size} h-${size} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg`}>
      {initials}
    </div>
  );
}

function PersonCard({ person, onClick }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <div
      onClick={() => onClick(person)}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-150"
    >
      <div className="flex flex-col items-center text-center">
        <Avatar url={person.avatarUrl} name={name} />
        <h3 className="mt-3 font-semibold text-gray-900 dark:text-white text-sm">{name}</h3>
        <span className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[person.role] || ROLE_COLORS.employee}`}>
          {ROLE_LABELS[person.role] || person.role}
        </span>
        {person.jobRole && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 truncate max-w-full">{person.jobRole}</p>
        )}
        {person.squad && (
          <p className="mt-1 text-xs text-gray-400">{person.squad}</p>
        )}
        <div className="mt-3 flex gap-4 text-xs text-gray-400">
          <span title="Approved skills">🎯 {person.approvedSkills ?? 0}</span>
          <span title="Certifications">📜 {person.certifications ?? 0}</span>
        </div>
      </div>
    </div>
  );
}

function PersonDrawer({ person, onClose }) {
  if (!person) return null;
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-2xl z-40 overflow-y-auto">
        <div className="p-6">
          <button onClick={onClose} className="mb-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex flex-col items-center text-center mb-6">
            <Avatar url={person.avatarUrl} name={name} size={20} />
            <h2 className="mt-3 text-xl font-bold text-gray-900 dark:text-white">{name}</h2>
            <span className={`mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${ROLE_COLORS[person.role] || ROLE_COLORS.employee}`}>
              {ROLE_LABELS[person.role] || person.role}
            </span>
          </div>

          <div className="space-y-3">
            {person.email && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <a href={`mailto:${person.email}`} className="text-sm text-blue-600 hover:underline truncate">{person.email}</a>
              </div>
            )}
            {person.jobRole && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{person.jobRole}</span>
              </div>
            )}
            {person.squad && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">{person.squad}</span>
              </div>
            )}
            {person.manager && (
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span className="text-sm text-gray-700 dark:text-gray-300">Reports to {person.manager}</span>
              </div>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <div className="bg-blue-50 dark:bg-blue-900/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{person.approvedSkills ?? 0}</p>
              <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">Skills</p>
            </div>
            <div className="bg-green-50 dark:bg-green-900/30 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-700 dark:text-green-300">{person.certifications ?? 0}</p>
              <p className="text-xs text-green-500 dark:text-green-400 mt-1">Certifications</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function EmployeeDirectory() {
  const [people, setPeople]   = useState(null);
  const [search, setSearch]   = useState('');
  const [roleFilter, setRole] = useState('all');
  const [squadFilter, setSquad] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/directory').then(r => setPeople(r.data)).catch(() => setPeople([]));
  }, []);

  const squads = useMemo(() => {
    if (!people) return [];
    return [...new Set(people.map(p => p.squad).filter(Boolean))].sort();
  }, [people]);

  const filtered = useMemo(() => {
    if (!people) return [];
    const q = search.toLowerCase();
    return people.filter(p => {
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      if (q && !name.includes(q) && !(p.jobRole || '').toLowerCase().includes(q) && !(p.email || '').toLowerCase().includes(q)) return false;
      if (roleFilter !== 'all' && p.role !== roleFilter) return false;
      if (squadFilter !== 'all' && p.squad !== squadFilter) return false;
      return true;
    });
  }, [people, search, roleFilter, squadFilter]);

  const roles = ['employee', 'manager', 'functional_manager', 'resourcing', 'administrator'];

  if (!people) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin-fast mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        Loading…
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Employee Directory</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{filtered.length} of {people.length} people</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="search"
            placeholder="Search by name, role, or email…"
            className="border rounded-lg px-3 py-2 text-sm flex-1 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={roleFilter}
            onChange={e => setRole(e.target.value)}
          >
            <option value="all">All roles</option>
            {roles.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
          </select>
          {squads.length > 0 && (
            <select
              className="border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={squadFilter}
              onChange={e => setSquad(e.target.value)}
            >
              <option value="all">All squads</option>
              {squads.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-gray-400 italic py-16">No results found</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map(p => (
              <PersonCard key={p.id} person={p} onClick={setSelected} />
            ))}
          </div>
        )}
      </div>

      <PersonDrawer person={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
