import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axiosInstance';

// ── Shared components ──────────────────────────────────────────────────────

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

// ── Squad Dimension ────────────────────────────────────────────────────────

function MemberCard({ person }) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
      <Avatar url={person.avatarUrl} name={`${person.firstName} ${person.lastName}`} size="sm" />
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">
          {person.firstName} {person.lastName}
        </p>
        {person.jobRole && <p className="text-xs text-gray-400 truncate">{person.jobRole}</p>}
      </div>
    </div>
  );
}

function SquadCard({ squad }) {
  const [expanded, setExpanded] = useState(true);
  const members = squad.members || [];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white truncate">{squad.squad_name}</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-200">{members.length} member{members.length !== 1 ? 's' : ''}</span>
          <button onClick={() => setExpanded(e => !e)} className="text-blue-200 hover:text-white transition-colors">
            <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

      <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/20">
        <div className="flex items-center gap-3">
          <Avatar url={squad.manager_avatar} name={`${squad.manager_first} ${squad.manager_last}`} size="lg" />
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{squad.manager_first} {squad.manager_last}</p>
            {squad.manager_job_role && <p className="text-xs text-gray-500 dark:text-gray-400">{squad.manager_job_role}</p>}
            <span className="text-xs bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">Manager</span>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-2">
          {members.length === 0
            ? <p className="text-xs text-gray-400 text-center py-3 italic">No members assigned</p>
            : <div className="grid grid-cols-1 gap-0.5">{members.map(m => <MemberCard key={m.id} person={m} />)}</div>
          }
        </div>
      )}
    </div>
  );
}

// ── SME Dimension ──────────────────────────────────────────────────────────

function SmeCard({ person, canEdit, onRemove }) {
  const name = `${person.firstName} ${person.lastName}`;
  return (
    <div className="flex items-center gap-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-lg px-3 py-2 group">
      <Avatar url={person.avatarUrl} name={name} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{name}</p>
      </div>
      {canEdit && (
        <button
          onClick={() => onRemove(person.smeId)}
          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0"
          title="Remove SME"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
}

function JobRoleCard({ jobRole, canEdit, allUsers, onAddSme, onRemoveSme }) {
  const [showPicker, setShowPicker] = useState(false);
  const [pickerSearch, setPickerSearch] = useState('');

  const smes = jobRole.smes || [];
  const smeUserIds = new Set(smes.map(s => s.userId));

  const eligible = allUsers.filter(u =>
    !smeUserIds.has(u.id) &&
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(pickerSearch.toLowerCase())
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-3 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white truncate">{jobRole.job_role_name}</h3>
          <p className="text-xs text-amber-100">{smes.length} SME{smes.length !== 1 ? 's' : ''}</p>
        </div>
        {canEdit && !showPicker && (
          <button
            onClick={() => { setShowPicker(true); setPickerSearch(''); }}
            className="text-amber-100 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add SME
          </button>
        )}
      </div>

      {/* SME list */}
      <div className="p-3 space-y-2">
        {smes.length === 0 && !showPicker && (
          <p className="text-xs text-gray-400 italic text-center py-2">No SME assigned</p>
        )}
        {smes.map(sme => (
          <SmeCard
            key={sme.smeId}
            person={sme}
            canEdit={canEdit}
            onRemove={onRemoveSme}
          />
        ))}

        {/* Add SME picker */}
        {canEdit && showPicker && (
          <div className="border border-amber-200 dark:border-amber-700 rounded-lg overflow-hidden mt-2">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-amber-50 dark:bg-amber-900/20">
              <svg className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
              </svg>
              <input
                autoFocus
                className="flex-1 text-xs bg-transparent outline-none text-gray-700 dark:text-gray-200 placeholder-gray-400"
                placeholder="Search people…"
                value={pickerSearch}
                onChange={e => setPickerSearch(e.target.value)}
              />
              <button onClick={() => setShowPicker(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="max-h-40 overflow-y-auto divide-y divide-gray-50 dark:divide-gray-700">
              {eligible.length === 0
                ? <p className="text-xs text-gray-400 italic text-center py-3">No people found</p>
                : eligible.slice(0, 10).map(u => (
                    <button
                      key={u.id}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-left transition-colors"
                      onClick={() => { onAddSme(jobRole.job_role_id, u.id); setShowPicker(false); setPickerSearch(''); }}
                    >
                      <Avatar url={u.avatarUrl} name={`${u.firstName} ${u.lastName}`} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-gray-800 dark:text-gray-200 truncate">{u.firstName} {u.lastName}</p>
                        {u.jobRole && <p className="text-xs text-gray-400 truncate">{u.jobRole}</p>}
                      </div>
                    </button>
                  ))
              }
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

const VIEWS = ['Squads', 'SMEs by Job Role'];

export default function OrgChart() {
  const { user } = useAuth();
  const isAdmin  = user?.role === 'administrator';

  const [data, setData]     = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [view, setView]     = useState('Squads');

  const load = useCallback(() => {
    api.get('/org/chart').then(r => {
      setData(r.data);
      // Flatten all people for the SME picker
      const people = [];
      for (const sq of r.data.squads || []) {
        people.push({ id: sq.manager_id, firstName: sq.manager_first, lastName: sq.manager_last, avatarUrl: sq.manager_avatar, jobRole: sq.manager_job_role });
        for (const m of sq.members || []) people.push(m);
      }
      for (const u of r.data.unassigned || []) people.push(u);
      // Deduplicate by id
      const seen = new Set();
      setAllUsers(people.filter(p => { if (seen.has(p.id)) return false; seen.add(p.id); return true; }));
    }).catch(() => setData({ squads: [], unassigned: [], jobRoles: [] }));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleAddSme = async (jobRoleId, userId) => {
    await api.post('/org/smes', { jobRoleId, userId }).catch(() => {});
    load();
  };

  const handleRemoveSme = async (smeId) => {
    await api.delete(`/org/smes/${smeId}`).catch(() => {});
    load();
  };

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

  // ── Squads dimension ──
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

  // ── SME dimension ──
  const filteredJobRoles = !q ? data.jobRoles : (data.jobRoles || []).filter(jr =>
    jr.job_role_name.toLowerCase().includes(q) ||
    (jr.smes || []).some(s => `${s.firstName} ${s.lastName}`.toLowerCase().includes(q))
  );

  const totalPeople = data.squads.reduce((n, s) => n + 1 + (s.members?.length || 0), 0) + (data.unassigned?.length || 0);
  const totalSmes = (data.jobRoles || []).reduce((n, jr) => n + (jr.smes?.length || 0), 0);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Org Chart</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {data.squads.length} squad{data.squads.length !== 1 ? 's' : ''} · {totalPeople} people · {totalSmes} SME assignment{totalSmes !== 1 ? 's' : ''}
            </p>
          </div>
          <input
            type="search"
            placeholder="Search people, squads or job roles…"
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-72 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* View toggle */}
        <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
          {VIEWS.map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
                view === v
                  ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-white dark:border-gray-600 dark:border-b-gray-800 -mb-px'
                  : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              {v === 'Squads' ? `Squads (${data.squads.length})` : `SMEs by Job Role (${(data.jobRoles || []).length})`}
            </button>
          ))}
        </div>

        {/* ── Squads view ── */}
        {view === 'Squads' && (
          <>
            {filteredSquads.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 mb-8">
                {filteredSquads.map(s => <SquadCard key={s.squad_id} squad={s} />)}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-10">No results</p>
            )}
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
          </>
        )}

        {/* ── SME view ── */}
        {view === 'SMEs by Job Role' && (
          <div>
            {isAdmin && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                Click <strong>Add SME</strong> on any job role card to assign a Subject Matter Expert. Hover over an SME chip to remove them.
              </p>
            )}
            {filteredJobRoles.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                {filteredJobRoles.map(jr => (
                  <JobRoleCard
                    key={jr.job_role_id}
                    jobRole={jr}
                    canEdit={isAdmin}
                    allUsers={allUsers}
                    onAddSme={handleAddSme}
                    onRemoveSme={handleRemoveSme}
                  />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic text-center py-10">No results</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
