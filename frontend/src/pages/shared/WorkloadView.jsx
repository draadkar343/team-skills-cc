import React, { useEffect, useState } from 'react';
import { getWorkload } from '../../api/workloadApi';

const STATUS_COLORS = {
  approved: 'bg-green-500',
  pending: 'bg-yellow-400',
  rejected: 'bg-red-400',
  draft: 'bg-gray-300',
};

export default function WorkloadView() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [weekFilter, setWeekFilter] = useState('');

  useEffect(() => {
    getWorkload()
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading workload data...</div>;

  // Get all unique weeks, sorted desc
  const weeks = [...new Set(rows.map(r => r.week_start_date?.slice(0, 10)))].sort((a, b) => b.localeCompare(a));
  const displayedWeeks = weekFilter ? [weekFilter] : weeks.slice(0, 12);

  // Get all unique employees
  const employees = [...new Map(rows.map(r => [r.user_id, r.user_name])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  // Build lookup: { userId_week: { total_hours, status } }
  const lookup = {};
  for (const r of rows) {
    lookup[`${r.user_id}_${r.week_start_date?.slice(0, 10)}`] = { hours: Number(r.total_hours), status: r.status };
  }

  const maxHours = Math.max(...rows.map(r => Number(r.total_hours)), 40);

  if (!employees.length) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Workload View</h1>
        <p className="text-gray-500">No timesheet data available.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Workload View</h1>
      <p className="text-gray-500 text-sm mb-4">Hours submitted per team member per week.</p>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={weekFilter}
          onChange={e => setWeekFilter(e.target.value)}
        >
          <option value="">Last 12 weeks</option>
          {weeks.map(w => <option key={w} value={w}>{w}</option>)}
        </select>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-500 inline-block" /> Approved</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-400 inline-block" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-400 inline-block" /> Rejected</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-300 inline-block" /> Draft</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600 min-w-[160px]">Employee</th>
              {displayedWeeks.map(w => (
                <th key={w} className="text-center p-3 font-medium text-gray-600 min-w-[90px] text-xs">{w}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(([userId, userName]) => (
              <tr key={userId} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-700">{userName}</td>
                {displayedWeeks.map(week => {
                  const cell = lookup[`${userId}_${week}`];
                  return (
                    <td key={week} className="p-2 text-center">
                      {cell ? (
                        <div className="flex flex-col items-center gap-1">
                          <div className="w-full bg-gray-100 rounded-full h-2 mx-2" style={{ minWidth: '60px' }}>
                            <div
                              className={`h-2 rounded-full ${STATUS_COLORS[cell.status] || 'bg-gray-300'}`}
                              style={{ width: `${Math.min(100, (cell.hours / maxHours) * 100)}%` }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${cell.status === 'approved' ? 'text-green-700' : cell.status === 'pending' ? 'text-yellow-700' : cell.status === 'rejected' ? 'text-red-600' : 'text-gray-500'}`}>
                            {cell.hours}h
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-200">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
