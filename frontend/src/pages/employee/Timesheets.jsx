import React, { useEffect, useState } from 'react';
import {
  getMyTimesheets, createTimesheet, getTimesheet, addEntry,
  updateEntry, deleteEntry, submitTimesheet, deleteTimesheet
} from '../../api/timesheetApi';
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

  const load = async () => {
    const list = await getMyTimesheets();
    setTimesheets(list);
  };

  const loadSelected = async (id) => {
    const ts = await getTimesheet(id);
    setSelected(ts);
  };

  useEffect(() => { load(); }, []);

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
                  (selected.entries || []).map(e => (
                    <tr key={e.id} className="border-b last:border-0">
                      <td className="py-2">{formatDate(e.work_date)}</td>
                      <td className="py-2">{e.hours}</td>
                      <td className="py-2">{e.project_code || '-'}</td>
                      <td className="py-2">{e.description || '-'}</td>
                      {canEdit && (
                        <td className="py-2">
                          <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => handleDeleteEntry(e.id)}>Remove</button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Add entry form */}
            {canEdit && (
              <form onSubmit={handleAddEntry} className="border-t pt-4 grid grid-cols-5 gap-2 text-sm">
                <input
                  type="date" required
                  className="border border-gray-300 rounded-lg px-2 py-1"
                  value={entryForm.workDate}
                  onChange={e => setEntryForm(f => ({ ...f, workDate: e.target.value }))}
                />
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
                <Button type="submit" loading={loading} className="py-1">Add Row</Button>
              </form>
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
