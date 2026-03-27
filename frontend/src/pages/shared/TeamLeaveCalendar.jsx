import React, { useEffect, useState } from 'react';
import { getTeamCalendar } from '../../api/leaveApi';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  // 0=Sun, adjust to Mon=0
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

function dateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function isWeekend(year, month, day) {
  const dow = new Date(year, month, day).getDay();
  return dow === 0 || dow === 6;
}

export default function TeamLeaveCalendar() {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-indexed
  const [entries, setEntries]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tooltip, setTooltip]     = useState(null); // { day, entries, x, y }

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;

  const load = async () => {
    setLoading(true);
    try {
      const data = await getTeamCalendar(monthStr);
      setEntries(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [monthStr]);

  const prev = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const next = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Build a map: date -> list of leave entries
  const leaveByDate = {};
  entries.forEach(e => {
    const start = new Date(e.start_date);
    const end   = new Date(e.end_date);
    const cur   = new Date(start);
    while (cur <= end) {
      const key = cur.toISOString().slice(0, 10);
      if (!leaveByDate[key]) leaveByDate[key] = [];
      leaveByDate[key].push(e);
      cur.setDate(cur.getDate() + 1);
    }
  });

  const daysInMonth  = getDaysInMonth(viewYear, viewMonth);
  const firstDayOffset = getFirstDayOfMonth(viewYear, viewMonth);
  const totalCells   = Math.ceil((firstDayOffset + daysInMonth) / 7) * 7;
  const DAY_HEADERS  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const MONTH_NAMES = ['January','February','March','April','May','June',
                       'July','August','September','October','November','December'];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Team Leave Calendar</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Approved and pending leave for your team</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={prev}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            ←
          </button>
          <span className="text-lg font-semibold text-gray-900 dark:text-white w-44 text-center">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <button
            onClick={next}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
          >
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      {entries.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-4">
          {[...new Map(entries.map(e => [e.leave_type_name, e.leave_type_colour])).entries()].map(([name, colour]) => (
            <span key={name} className="inline-flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: colour }} />
              {name}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500">
            <span className="w-3 h-3 rounded-sm flex-shrink-0 border-2 border-dashed border-gray-400" />
            Pending
          </span>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-700">
            {DAY_HEADERS.map(d => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7">
            {Array.from({ length: totalCells }).map((_, idx) => {
              const dayNum = idx - firstDayOffset + 1;
              const isValid = dayNum >= 1 && dayNum <= daysInMonth;
              const ds = isValid ? dateStr(viewYear, viewMonth, dayNum) : null;
              const dayLeave = ds ? (leaveByDate[ds] || []) : [];
              const isToday = ds === today.toISOString().slice(0, 10);
              const weekend = isValid && isWeekend(viewYear, viewMonth, dayNum);

              return (
                <div
                  key={idx}
                  className={`min-h-[80px] border-b border-r border-gray-100 dark:border-gray-700 p-1 relative
                    ${!isValid ? 'bg-gray-50 dark:bg-gray-900/30' : ''}
                    ${weekend ? 'bg-gray-50 dark:bg-gray-900/20' : ''}`}
                >
                  {isValid && (
                    <>
                      <div className={`text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full
                        ${isToday ? 'bg-blue-600 text-white' : 'text-gray-600 dark:text-gray-400'}`}>
                        {dayNum}
                      </div>
                      <div className="space-y-0.5">
                        {dayLeave.slice(0, 3).map((e, i) => (
                          <div
                            key={`${e.id}-${i}`}
                            title={`${e.employee_name} — ${e.leave_type_name}${e.status === 'pending' ? ' (pending)' : ''}`}
                            className={`text-xs px-1 py-0.5 rounded truncate cursor-default
                              ${e.status === 'pending' ? 'border border-dashed' : ''}`}
                            style={{
                              backgroundColor: e.status === 'pending' ? 'transparent' : e.leave_type_colour + '33',
                              borderColor: e.leave_type_colour,
                              color: e.leave_type_colour,
                            }}
                          >
                            {e.employee_name.split(' ')[0]}
                          </div>
                        ))}
                        {dayLeave.length > 3 && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 pl-1">
                            +{dayLeave.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Summary list below calendar */}
      {!loading && entries.length > 0 && (
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
          <div className="px-4 py-3 text-sm font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-t-xl">
            {MONTH_NAMES[viewMonth]} {viewYear} — All Leave
          </div>
          {entries.map(e => (
            <div key={e.id} className="flex items-center gap-4 px-4 py-2.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: e.leave_type_colour }} />
              <span className="font-medium text-gray-900 dark:text-white w-36 truncate">{e.employee_name}</span>
              <span className="text-gray-600 dark:text-gray-400 w-28">{e.leave_type_name}</span>
              <span className="text-gray-500 dark:text-gray-400">
                {new Date(e.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                {' – '}
                {new Date(e.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
              </span>
              <span className="text-gray-500 dark:text-gray-400">{e.total_days} day(s)</span>
              <span className={`ml-auto text-xs px-2 py-0.5 rounded-full capitalize font-medium
                ${e.status === 'approved'
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'}`}>
                {e.status}
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && entries.length === 0 && (
        <div className="text-center py-12 text-gray-400 dark:text-gray-500">
          No leave recorded for {MONTH_NAMES[viewMonth]} {viewYear}.
        </div>
      )}
    </div>
  );
}
