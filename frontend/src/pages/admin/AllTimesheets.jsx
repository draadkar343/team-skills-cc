import React, { useEffect, useState } from 'react';
import { getAllTimesheets } from '../../api/timesheetApi';
import Badge from '../../components/common/Badge';
import { exportToCsv } from '../../utils/exportCsv';

export default function AllTimesheets() {
  const [timesheets, setTimesheets] = useState([]);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    getAllTimesheets().then(setTimesheets).catch(() => {});
  }, []);

  const filtered = timesheets.filter(t =>
    !filter || `${t.first_name} ${t.last_name} ${t.email}`.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">All Timesheets</h1>
      <div className="flex items-center gap-3 mb-4">
        <input type="text" placeholder="Filter by employee..."
          className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={filter} onChange={e => setFilter(e.target.value)} />
        <button
          onClick={() => exportToCsv('timesheets.csv',
            ['Employee', 'Email', 'Week', 'Total Hours', 'Status', 'Submitted'],
            filtered.map(t => [
              `${t.first_name} ${t.last_name}`, t.email,
              t.week_start_date?.slice(0, 10), t.total_hours,
              t.status, t.submitted_at?.slice(0, 10) || ''
            ])
          )}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 bg-white hover:bg-gray-50"
        >
          Export CSV
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Employee</th>
              <th className="text-left p-4 font-medium text-gray-600">Week</th>
              <th className="text-left p-4 font-medium text-gray-600">Total Hours</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="text-left p-4 font-medium text-gray-600">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={5} className="p-4 text-center text-gray-400">No timesheets found.</td></tr>
            ) : (
              filtered.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{t.first_name} {t.last_name}</div>
                    <div className="text-xs text-gray-400">{t.email}</div>
                  </td>
                  <td className="p-4">{t.week_start_date?.slice(0, 10)}</td>
                  <td className="p-4 font-semibold">{t.total_hours}h</td>
                  <td className="p-4"><Badge status={t.status} /></td>
                  <td className="p-4 text-gray-400">{t.submitted_at?.slice(0, 10) || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
