import React, { useEffect, useState } from 'react';
import api from '../../api/axiosInstance';

function Avatar({ url, name, size = 'md' }) {
  const sz = size === 'lg' ? 'w-14 h-14 text-base' : size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  if (url) return <img src={url} alt={name} className={`${sz} rounded-full object-cover border-2 border-white dark:border-gray-700 shadow`} />;
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold border-2 border-white dark:border-gray-700 shadow`}>
      {initials}
    </div>
  );
}

function MemberCard({ person }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <Avatar url={person.avatarUrl} name={`${person.firstName} ${person.lastName}`} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
          {person.firstName} {person.lastName}
        </p>
        {person.jobRole && (
          <p className="text-xs text-gray-400 truncate">{person.jobRole}</p>
        )}
      </div>
    </div>
  );
}

function SquadCard({ squad }) {
  const [expanded, setExpanded] = useState(true);
  const members = squad.members || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Squad header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate">{squad.squad_name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-200">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          <button
            onClick={() => setExpanded(e => !e)}
            className="text-blue-200 hover:text-white transition-colors"
          >
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Manager */}
      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Avatar url={squad.manager_avatar} name={`${squad.manager_first} ${squad.manager_last}`} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {squad.manager_first} {squad.manager_last}
            </p>
            {squad.manager_job_role && (
              <p className="text-xs text-gray-500 dark:text-gray-400">{squad.manager_job_role}</p>
            )}
            <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">
              Manager
            </span>
          </div>
        </div>
      </div>

      {/* Members */}
      {expanded && (
        <div className="p-2">
          {members.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3 italic">No members assigned</p>
          ) : (
            <div className="grid grid-cols-1 gap-0.5">
              {members.map(m => <MemberCard key={m.id} person={m} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrgChart() {
  const [data, setData]     = useState(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    api.get('/org/chart').then(r => setData(r.data)).catch(() => setData({ squads: [], unassigned: [] }));
  }, []);

  if (!data) {
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

  const q = search.toLowerCase();
  const filteredSquads = !q ? data.squads : data.squads.map(s => ({
    ...s,
    members: (s.members || []).filter(m =>
      `${m.firstName} ${m.lastName}`.toLowerCase().includes(q) ||
      (m.jobRole || '').toLowerCase().includes(q)
    ),
  })).filter(s =>
    s.squad_name.toLowerCase().includes(q) ||
    `${s.manager_first} ${s.manager_last}`.toLowerCase().includes(q) ||
    s.members.length > 0
  );

  const filteredUnassigned = !q ? data.unassigned : (data.unassigned || []).filter(u =>
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(q)
  );

  const totalPeople = data.squads.reduce((n, s) => n + 1 + (s.members?.length || 0), 0) + (data.unassigned?.length || 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Org Chart</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.squads.length} squad{data.squads.length !== 1 ? 's' : ''} · {totalPeople} people
            </p>
          </div>
          <input
            type="search"
            placeholder="Search people or squads…"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-64 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Squads grid */}
        {filteredSquads.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
            {filteredSquads.map(s => <SquadCard key={s.squad_id} squad={s} />)}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic text-center py-10">No results found</p>
        )}

        {/* Unassigned */}
        {filteredUnassigned.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4">
            <h3 className="text-sm font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-3">
              Not assigned to a squad ({filteredUnassigned.length})
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1">
              {filteredUnassigned.map(u => <MemberCard key={u.id} person={u} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
