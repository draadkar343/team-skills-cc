import React, { useEffect, useState } from 'react';
import {
  getMyTimesheets, createTimesheet, getTimesheet, addEntry,
  updateEntry, deleteEntry, submitTimesheet, deleteTimesheet
} from '../../api/timesheetApi';
import { getPublicHolidays } from '../../api/authApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().slice(0, 10);
}

function formatDate(d) {
  return d ? d.slice(0, 10) : '';
}

export default function Timesheets() {
  const [timesheets, setTimesheets] = useState([]);
  const [selected, setSelected] = useState(null);
  const [newWeek, setNewWeek] = useState(getMonday(new Date()));
  const [entryForm, setEntryForm] = useState({ workDate: '', hours: '', projectCode: '', description: '' });
  const [editEntry, setEditEntry] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);

  // Public holidays: Map of date string → holiday name
  const [holidays, setHolidays] = useState({});

  const load = async () => {
    const list = await getMyTimesheets();
    setTimesheets(list);
  };

  const loadSelected = async (id) => {
    const ts = await getTimesheet(id);
    setSelected(ts);
  };

  // Fetch holidays for current year and next year so weeks spanning year boundaries work
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    Promise.all([
      getPublicHolidays(currentYear).catch(() => []),
      getPublicHolidays(currentYear + 1).catch(() => []),
    ]).then(([thisYear, nextYear]) => {
      const map = {};
      for (const h of [...thisYear, ...nextYear]) {
        map[h.date] = h.name;
      }
      setHolidays(map);
    });
  }, []);

  useEffect(() => { load(); }, []);

  const selectedDateHoliday = entryForm.workDate ? holidays[entryForm.workDate] : null;

  const handleCreate = async () => {
    setLoading(true);
    try {
      const ts = await createTimesheet({ weekStartDate: getMonday(newWeek) });
      await load();
      await loadSelected(ts.id);
      setShowNew(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create timesheet');
    } finally { setLoading(false); }
  };

  const handleAddEntry = async (e) => {
    e.preventDefault();
    if (!selected) return;
    if (selectedDateHoliday) {
      alert(`${entryForm.workDate} is a public holiday (${selectedDateHoliday}). Time cannot be logged on this day.`);
      return;
    }
    setLoading(true);
    try {
      await addEntry(selected.id, {
        workDate: entryForm.workDate,
        hours: parseFloat(entryForm.hours),
        projectCode: entryForm.projectCode,
        description: entryForm.description,
      });
      setEntryForm({ workDate: '', hours: '', projectCode: '', description: '' });
      await loadSelected(selected.id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add entry');
    } finally { setLoading(false); }
  };

  const handleDeleteEntry = async (entryId) => {
    await deleteEntry(selected.id, entryId);
    await loadSelected(selected.id);
    await load();
  };

  const handleSubmit = async () => {
    if (!window.confirm('Submit this timesheet for approval?')) return;
    await submitTimesheet(selected.id);
    await loadSelected(selected.id);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this timesheet?')) return;
    await deleteTimesheet(id);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  const canEdit = selected && ['draft', 'rejected'].includes(selected.status);

  // Compute which days of the selected timesheet week are holidays
  const weekHolidays = selected
    ? (() => {
        const result = [];
        const start = new Date(selected.week_start_date);
        for (let i = 0; i < 7; i++) {
          const d = new Date(start);
          d.setDate(start.getDate() + i);
          const dateStr = d.toISOString().slice(0, 10);
          if (holidays[dateStr]) result.push({ date: dateStr, name: holidays[dateStr] });
        }
        return result;
      })()
    : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Timesheets</h1>
        <Button onClick={() => setShowNew(true)}>+ New Timesheet</Button>
      </div>

      <div className="flex gap-6">
        {/* List */}
        <div className="w-64 flex-shrink-0">
          <div className="space-y-2">
            {timesheets.length === 0 && (
              <p className="text-sm text-gray-400">No timesheets yet.</p>
            )}
            {timesheets.map(t => (
              <div
                key={t.id}
                onClick={() => loadSelected(t.id)}
                className={`cursor-pointer bg-white border rounded-xl p-3 shadow-sm hover:border-blue-400 transition-colors ${selected?.id === t.id ? 'border-blue-500' : 'border-gray-200'}`}
              >
                <div className="text-sm font-medium">Week of {formatDate(t.week_start_date)}</div>
                <div className="flex justify-between mt-1">
                  <span className="text-xs text-gray-400">{t.total_hours}h total</span>
                  <Badge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Detail */}
        {selected && (
          <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-semibold text-lg">Week of {formatDate(selected.week_start_date)}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge status={selected.status} />
                  <span className="text-sm text-gray-500">Total: <strong>{selected.total_hours}h</strong></span>
                </div>
              </div>
              <div className="flex gap-2">
                {canEdit && (
                  <>
                    <Button variant="success" onClick={handleSubmit}>Submit for Approval</Button>
                    <Button variant="danger" onClick={() => handleDelete(selected.id)}>Delete</Button>
                  </>
                )}
              </div>
            </div>

            {selected.status === 'rejected' && selected.rejection_reason && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                Rejected: {selected.rejection_reason}
              </div>
            )}

            {/* Public holiday banner for this week */}
            {weekHolidays.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-semibold text-amber-700 mb-1">Public holidays this week — time cannot be logged on these days:</p>
                <ul className="space-y-0.5">
                  {weekHolidays.map(h => (
                    <li key={h.date} className="text-xs text-amber-700">
                      <span className="font-medium">{h.date}</span> — {h.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Entries table */}
            <table className="w-full text-sm mb-4">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-2">Date</th>
                  <th className="pb-2">Hours</th>
                  <th className="pb-2">Project</th>
                  <th className="pb-2">Description</th>
                  {canEdit && <th className="pb-2"></th>}
                </tr>
              </thead>
              <tbody>
                {(selected.entries || []).length === 0 ? (
                  <tr><td colSpan={5} className="text-gray-400 py-4 text-center">No entries yet.</td></tr>
                ) : (
                  (selected.entries || []).map(e => {
                    const entryDateStr = formatDate(e.work_date);
                    const holidayName = holidays[entryDateStr];
                    return (
                      <tr key={e.id} className={`border-b last:border-0 ${holidayName ? 'bg-amber-50' : ''}`}>
                        <td className="py-2">
                          <span>{entryDateStr}</span>
                          {holidayName && (
                            <span className="ml-2 text-xs text-amber-600 font-medium" title={holidayName}>
                              🏖 {holidayName}
                            </span>
                          )}
                        </td>
                        <td className="py-2">{e.hours}</td>
                        <td className="py-2">{e.project_code || '-'}</td>
                        <td className="py-2">{e.description || '-'}</td>
                        {canEdit && (
                          <td className="py-2">
                            <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteEntry(e.id)}>Remove</button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Add entry form */}
            {canEdit && (
              <div className="border-t pt-4">
                <form onSubmit={handleAddEntry} className="grid grid-cols-5 gap-2 text-sm">
                  <div className="flex flex-col gap-1">
                    <input
                      type="date" required
                      className={`border rounded-lg px-2 py-1 ${selectedDateHoliday ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
                      value={entryForm.workDate}
                      onChange={e => setEntryForm(f => ({ ...f, workDate: e.target.value }))}
                    />
                  </div>
                  <input
                    type="number" step="0.5" min="0" max="24" required placeholder="Hours"
                    className="border border-gray-300 rounded-lg px-2 py-1"
                    value={entryForm.hours}
                    onChange={e => setEntryForm(f => ({ ...f, hours: e.target.value }))}
                  />
                  <input
                    type="text" placeholder="Project code"
                    className="border border-gray-300 rounded-lg px-2 py-1"
                    value={entryForm.projectCode}
                    onChange={e => setEntryForm(f => ({ ...f, projectCode: e.target.value }))}
                  />
                  <input
                    type="text" placeholder="Description"
                    className="border border-gray-300 rounded-lg px-2 py-1"
                    value={entryForm.description}
                    onChange={e => setEntryForm(f => ({ ...f, description: e.target.value }))}
                  />
                  <Button type="submit" loading={loading} disabled={!!selectedDateHoliday} className="py-1">
                    Add Row
                  </Button>
                </form>
                {selectedDateHoliday && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <span>🏖</span>
                    <span><strong>{entryForm.workDate}</strong> is a public holiday: <strong>{selectedDateHoliday}</strong>. Time cannot be logged on this day.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* New timesheet modal */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="New Timesheet">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Select any date in the week</label>
            <input
              type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={newWeek}
              onChange={e => setNewWeek(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">Week starting Monday: {getMonday(newWeek)}</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button loading={loading} onClick={handleCreate}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
