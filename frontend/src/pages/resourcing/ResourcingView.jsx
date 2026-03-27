import React, { useEffect, useState } from 'react';
import { getResourcingOverview } from '../../api/resourcingApi';

function AllocationBar({ pct }) {
  const colour =
    pct > 100 ? 'bg-red-500' :
    pct === 100 ? 'bg-green-500' :
    pct >= 80 ? 'bg-yellow-400' : 'bg-blue-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-2 rounded-full ${colour}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-semibold w-9 text-right ${pct > 100 ? 'text-red-600' : pct === 100 ? 'text-green-600' : 'text-gray-600'}`}>
        {pct}%
      </span>
    </div>
  );
}

export default function ResourcingView() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [squadFilter, setSquadFilter] = useState('');
  const [jobRoleFilter, setJobRoleFilter] = useState('');
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    getResourcingOverview()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  const squads = [...new Set(data.map(e => e.squadName).filter(Boolean))].sort();
  const jobRoles = [...new Set(data.map(e => e.jobRoleName).filter(Boolean))].sort();

  const filtered = data.filter(e => {
    const matchSearch = !search || e.name.toLowerCase().includes(search.toLowerCase()) || (e.email || '').toLowerCase().includes(search.toLowerCase());
    const matchSquad = !squadFilter || e.squadName === squadFilter;
    const matchRole = !jobRoleFilter || e.jobRoleName === jobRoleFilter;
    return matchSearch && matchSquad && matchRole;
  });

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Resourcing Overview</h1>
        <span className="text-sm text-gray-400">{filtered.length} of {data.length} employees</span>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <input
          type="text"
          placeholder="Search name or email..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-56"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={squadFilter}
          onChange={e => setSquadFilter(e.target.value)}
        >
          <option value="">All Squads</option>
          {squads.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={jobRoleFilter}
          onChange={e => setJobRoleFilter(e.target.value)}
        >
          <option value="">All Job Roles</option>
          {jobRoles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        {(search || squadFilter || jobRoleFilter) && (
          <button
            className="text-xs text-blue-600 hover:underline"
            onClick={() => { setSearch(''); setSquadFilter(''); setJobRoleFilter(''); }}
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Employee</th>
              <th className="text-left p-4 font-medium text-gray-600">Squad</th>
              <th className="text-left p-4 font-medium text-gray-600">Job Role</th>
              <th className="text-left p-4 font-medium text-gray-600">Main Skills</th>
              <th className="text-left p-4 font-medium text-gray-600 w-44">Allocation</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="text-center py-10 text-gray-400">No employees found.</td></tr>
            )}
            {filtered.map(e => (
              <>
                <tr
                  key={e.id}
                  className={`border-b last:border-0 cursor-pointer hover:bg-gray-50 transition-colors ${expanded === e.id ? 'bg-blue-50' : ''}`}
                  onClick={() => setExpanded(expanded === e.id ? null : e.id)}
                >
                  <td className="p-4">
                    <div className="font-medium">{e.name}</div>
                    <div className="text-xs text-gray-400">{e.email}</div>
                  </td>
                  <td className="p-4 text-gray-500">{e.squadName || <span className="text-gray-300">—</span>}</td>
                  <td className="p-4 text-gray-500">{e.jobRoleName || <span className="text-gray-300">—</span>}</td>
                  <td className="p-4">
                    {e.mainSkills.length === 0
                      ? <span className="text-gray-300 text-xs">No approved skills</span>
                      : <div className="flex flex-wrap gap-1">
                          {e.mainSkills.map(ms => (
                            <span key={ms.name} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                              {ms.name}
                            </span>
                          ))}
                        </div>
                    }
                  </td>
                  <td className="p-4">
                    <AllocationBar pct={e.totalAllocation} />
                  </td>
                </tr>

                {/* Expanded detail row */}
                {expanded === e.id && (
                  <tr key={`${e.id}-detail`} className="bg-blue-50 border-b">
                    <td colSpan={5} className="px-6 py-4">
                      <div className="grid grid-cols-2 gap-6">

                        {/* Skills breakdown */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Skills</h3>
                          {e.mainSkills.length === 0
                            ? <p className="text-xs text-gray-400">No approved skills recorded.</p>
                            : e.mainSkills.map(ms => (
                                <div key={ms.name} className="mb-3">
                                  <div className="text-sm font-medium text-gray-700 mb-1">{ms.name}</div>
                                  <div className="flex flex-wrap gap-1">
                                    {ms.subSkills.map(ss => (
                                      <div key={ss.name} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-gray-200 rounded-full text-xs">
                                        <span>{ss.name}</span>
                                        {ss.weighting != null && (
                                          <span className="text-gray-400">· {ss.weighting}%</span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                          }
                        </div>

                        {/* Allocation breakdown */}
                        <div>
                          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Client Allocations</h3>
                          {e.allocations.length === 0
                            ? <p className="text-xs text-gray-400">Not allocated to any client.</p>
                            : <div className="space-y-2">
                                {e.allocations.map((a, i) => (
                                  <div key={i} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm font-medium">{a.clientName}</span>
                                      {a.grade && (
                                        <span className={`text-xs font-bold border rounded px-1.5 py-0.5 ${
                                          a.grade === 'A' ? 'bg-green-100 text-green-700 border-green-300' :
                                          a.grade === 'B' ? 'bg-blue-100 text-blue-700 border-blue-300' :
                                                           'bg-amber-100 text-amber-700 border-amber-300'
                                        }`}>{a.grade}</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                      {(a.startDate || a.endDate) && (
                                        <span>{a.startDate?.slice(0, 10) || '?'} → {a.endDate?.slice(0, 10) || 'ongoing'}</span>
                                      )}
                                      <span className="font-semibold text-gray-700">{a.percentage}%</span>
                                    </div>
                                  </div>
                                ))}
                                <div className="text-xs text-right text-gray-500 font-medium pt-1">
                                  Total: {e.totalAllocation}%
                                </div>
                              </div>
                          }
                        </div>

                      </div>
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
