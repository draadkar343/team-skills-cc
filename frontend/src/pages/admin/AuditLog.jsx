import React, { useEffect, useState, useCallback } from 'react';
import { getAuditLog, getAuditTables, getRetentionPolicies, saveRetentionPolicies, purgeByRetention } from '../../api/auditApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const OP_COLOURS = {
  INSERT: 'bg-green-100 text-green-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
};

function JsonDiff({ oldData, newData, op }) {
  const [open, setOpen] = useState(false);

  if (op === 'INSERT') {
    return (
      <button className="text-xs text-blue-600 hover:underline" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Show data'}
        {open && (
          <pre className="mt-1 text-left text-xs bg-gray-50 border border-gray-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(newData, null, 2)}
          </pre>
        )}
      </button>
    );
  }

  if (op === 'DELETE') {
    return (
      <button className="text-xs text-red-600 hover:underline" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : 'Show deleted data'}
        {open && (
          <pre className="mt-1 text-left text-xs bg-red-50 border border-red-200 rounded p-2 max-h-48 overflow-auto whitespace-pre-wrap">
            {JSON.stringify(oldData, null, 2)}
          </pre>
        )}
      </button>
    );
  }

  // UPDATE — show only changed fields
  const changes = oldData && newData
    ? Object.keys(newData).filter(k => JSON.stringify(newData[k]) !== JSON.stringify(oldData[k]))
    : [];

  if (changes.length === 0) return <span className="text-xs text-gray-400">no visible change</span>;

  return (
    <div>
      <button className="text-xs text-blue-600 hover:underline" onClick={() => setOpen(o => !o)}>
        {open ? 'Hide' : `${changes.length} field${changes.length !== 1 ? 's' : ''} changed`}
      </button>
      {open && (
        <table className="mt-1 text-xs border border-gray-200 rounded overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-2 py-1 text-left font-medium text-gray-600">Field</th>
              <th className="px-2 py-1 text-left font-medium text-gray-600">Before</th>
              <th className="px-2 py-1 text-left font-medium text-gray-600">After</th>
            </tr>
          </thead>
          <tbody>
            {changes.map(k => (
              <tr key={k} className="border-t">
                <td className="px-2 py-1 font-mono text-gray-700">{k}</td>
                <td className="px-2 py-1 text-red-600 max-w-xs truncate">{JSON.stringify(oldData[k])}</td>
                <td className="px-2 py-1 text-green-700 max-w-xs truncate">{JSON.stringify(newData[k])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [tables, setTables] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState({ table: '', operation: '', rowId: '', from: '', to: '' });
  const [applied, setApplied] = useState({});

  // Retention state
  const [retentionModal, setRetentionModal] = useState(false);
  const [policies, setPolicies] = useState([]); // [{ table_name, retention_days }]
  const [retentionDraft, setRetentionDraft] = useState({}); // { table_name: days_string }
  const [savingRetention, setSavingRetention] = useState(false);
  const [purging, setPurging] = useState(false);
  const [purgeResult, setPurgeResult] = useState(null);

  useEffect(() => { getAuditTables().then(setTables); }, []);

  const openRetention = async () => {
    setPurgeResult(null);
    const data = await getRetentionPolicies();
    setPolicies(data);
    const draft = {};
    data.forEach(p => { draft[p.table_name] = p.retention_days != null ? String(p.retention_days) : ''; });
    setRetentionDraft(draft);
    setRetentionModal(true);
  };

  const handleSaveRetention = async () => {
    setSavingRetention(true);
    try {
      const payload = Object.entries(retentionDraft).map(([table_name, val]) => ({
        table_name,
        retention_days: val === '' ? null : parseInt(val),
      }));
      await saveRetentionPolicies(payload);
      const updated = await getRetentionPolicies();
      setPolicies(updated);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally { setSavingRetention(false); }
  };

  const handlePurge = async () => {
    if (!window.confirm('Delete all audit log entries that exceed their retention period? This cannot be undone.')) return;
    setPurging(true);
    setPurgeResult(null);
    try {
      const result = await purgeByRetention();
      setPurgeResult(result);
      load(applied, page);
    } catch (err) {
      alert(err.response?.data?.error || 'Purge failed');
    } finally { setPurging(false); }
  };

  const load = useCallback(async (f, p) => {
    setLoading(true);
    try {
      const params = { page: p, limit: PAGE_SIZE };
      if (f.table) params.table = f.table;
      if (f.operation) params.operation = f.operation;
      if (f.rowId) params.rowId = f.rowId;
      if (f.from) params.from = f.from;
      if (f.to) params.to = f.to;
      const data = await getAuditLog(params);
      setEntries(data.entries);
      setTotal(data.total);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { load(applied, page); }, [applied, page, load]);

  const applyFilters = (e) => {
    e.preventDefault();
    setPage(1);
    setApplied({ ...filters });
  };

  const clearFilters = () => {
    const empty = { table: '', operation: '', rowId: '', from: '', to: '' };
    setFilters(empty);
    setApplied({});
    setPage(1);
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Audit Log</h1>
        <Button variant="secondary" onClick={openRetention}>Retention &amp; Purge</Button>
      </div>

      {/* Filters */}
      <form onSubmit={applyFilters} className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Table</label>
            <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filters.table} onChange={e => setFilters(f => ({ ...f, table: e.target.value }))}>
              <option value="">All tables</option>
              {tables.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Operation</label>
            <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filters.operation} onChange={e => setFilters(f => ({ ...f, operation: e.target.value }))}>
              <option value="">All</option>
              <option value="INSERT">INSERT</option>
              <option value="UPDATE">UPDATE</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Row ID</label>
            <input type="number" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              placeholder="e.g. 42"
              value={filters.rowId} onChange={e => setFilters(f => ({ ...f, rowId: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From</label>
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To</label>
            <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
              value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 mt-3 justify-end">
          <Button variant="secondary" type="button" onClick={clearFilters}>Clear</Button>
          <Button type="submit">Apply Filters</Button>
        </div>
      </form>

      {/* Results */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <span className="text-sm text-gray-500">{total.toLocaleString()} entries</span>
          {loading && <span className="text-xs text-gray-400">Loading…</span>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-3 font-medium text-gray-600 w-16">#</th>
                <th className="text-left p-3 font-medium text-gray-600">Timestamp</th>
                <th className="text-left p-3 font-medium text-gray-600">Table</th>
                <th className="text-left p-3 font-medium text-gray-600">Operation</th>
                <th className="text-left p-3 font-medium text-gray-600">Row ID</th>
                <th className="text-left p-3 font-medium text-gray-600">Changes</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 ? (
                <tr><td colSpan={6} className="p-6 text-center text-gray-400">No entries found.</td></tr>
              ) : entries.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-3 text-gray-400 font-mono text-xs">{e.id}</td>
                  <td className="p-3 text-gray-500 whitespace-nowrap text-xs">
                    {new Date(e.changed_at).toLocaleString()}
                  </td>
                  <td className="p-3 font-mono text-xs text-gray-700">{e.table_name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${OP_COLOURS[e.operation] || ''}`}>
                      {e.operation}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 font-mono text-xs">{e.row_id ?? '—'}</td>
                  <td className="p-3">
                    <JsonDiff oldData={e.old_data} newData={e.new_data} op={e.operation} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
            <span className="text-gray-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" className="py-1 px-3 text-xs" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="secondary" className="py-1 px-3 text-xs" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>

      {/* Retention & Purge Modal */}
      <Modal open={retentionModal} onClose={() => setRetentionModal(false)} title="Retention Policies & Purge">
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Set how many days to retain audit entries per table. Leave blank to keep indefinitely.
          </p>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-3 py-2 font-medium text-gray-600">Table</th>
                  <th className="text-left px-3 py-2 font-medium text-gray-600 w-36">Retain for (days)</th>
                </tr>
              </thead>
              <tbody>
                {policies.map(p => (
                  <tr key={p.table_name} className="border-b last:border-0">
                    <td className="px-3 py-2 font-mono text-xs text-gray-700">{p.table_name}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min="1"
                        placeholder="∞ forever"
                        className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
                        value={retentionDraft[p.table_name] ?? ''}
                        onChange={e => setRetentionDraft(d => ({ ...d, [p.table_name]: e.target.value }))}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center pt-1">
            <Button
              variant="danger"
              onClick={handlePurge}
              loading={purging}
              disabled={policies.every(p => retentionDraft[p.table_name] === '')}
            >
              Purge Expired Logs Now
            </Button>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setRetentionModal(false)}>Close</Button>
              <Button onClick={handleSaveRetention} loading={savingRetention}>Save Policies</Button>
            </div>
          </div>

          {purgeResult && (
            <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg text-sm">
              <p className="font-semibold text-gray-700 mb-2">
                Purge complete — {purgeResult.totalDeleted.toLocaleString()} entries deleted
              </p>
              {purgeResult.purged.length === 0 ? (
                <p className="text-gray-400 text-xs">Nothing to purge — all entries are within retention windows.</p>
              ) : (
                <ul className="space-y-1">
                  {purgeResult.purged.map(r => (
                    <li key={r.table_name} className="flex justify-between text-xs">
                      <span className="font-mono text-gray-600">{r.table_name}</span>
                      <span className="text-red-600 font-medium">{r.deleted.toLocaleString()} deleted</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
