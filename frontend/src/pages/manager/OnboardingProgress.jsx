import React, { useEffect, useState } from 'react';
import { getSquadProgress } from '../../api/onboardingApi';

function pct(a) {
  return a.total_tasks ? Math.round((a.completed_tasks / a.total_tasks) * 100) : 0;
}

function barColor(p) {
  if (p === 100) return 'bg-green-500';
  if (p >= 50)   return 'bg-blue-500';
  if (p >= 25)   return 'bg-yellow-400';
  return 'bg-red-400';
}

function initials(name) {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
}

export default function OnboardingProgress() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    getSquadProgress()
      .then(setAssignments)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = assignments.filter(a =>
    a.employee_name.toLowerCase().includes(search.toLowerCase()) ||
    a.template_name.toLowerCase().includes(search.toLowerCase())
  );

  const complete = assignments.filter(a => pct(a) === 100).length;
  const inProgress = assignments.filter(a => { const p = pct(a); return p > 0 && p < 100; }).length;
  const notStarted = assignments.filter(a => pct(a) === 0).length;

  if (loading) return <div className="p-6 text-gray-400">Loading…</div>;

  return (
    <div className="p-6">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Onboarding Progress</h1>
          <p className="text-sm text-gray-500 mt-1">
            {assignments.length} employee{assignments.length !== 1 ? 's' : ''} assigned
          </p>
        </div>
        {assignments.length > 0 && (
          <input
            type="text"
            placeholder="Search name or template…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-52 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        )}
      </div>

      {assignments.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Complete',    value: complete,    color: 'text-green-600 bg-green-50 border-green-200' },
            { label: 'In Progress', value: inProgress,  color: 'text-blue-600 bg-blue-50 border-blue-200'   },
            { label: 'Not Started', value: notStarted,  color: 'text-gray-600 bg-gray-50 border-gray-200'   },
          ].map(({ label, value, color }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${color}`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {assignments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
          <p className="font-medium mb-1">No onboarding assignments yet</p>
          <p className="text-xs">Assign templates to employees in the admin onboarding panel.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(a => {
            const p = pct(a);
            return (
              <div key={a.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 flex-shrink-0">
                    {initials(a.employee_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{a.employee_name}</p>
                    <p className="text-xs text-gray-400 truncate">{a.template_name}</p>
                  </div>
                  <span className={`text-xs font-bold flex-shrink-0 ${p === 100 ? 'text-green-600' : 'text-gray-500'}`}>
                    {p}%
                  </span>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
                  <div
                    className={`h-2 rounded-full transition-all ${barColor(p)}`}
                    style={{ width: `${p}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-gray-400">
                  <span>{a.completed_tasks}/{a.total_tasks} tasks</span>
                  <span>{new Date(a.assigned_at).toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <p className="col-span-full text-center text-sm text-gray-400 py-8">
              No results for "{search}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}
