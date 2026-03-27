import React, { useEffect, useState } from 'react';
import { getMyLeave, createLeave, cancelLeave, getLeaveTypes, getLeaveSuggestions } from '../../api/leaveApi';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';
import Badge from '../../components/common/Badge';

const STATUS_COLOURS = {
  pending:   'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  approved:  'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  rejected:  'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  cancelled: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${STATUS_COLOURS[status] || ''}`}>
      {status}
    </span>
  );
}

const EMPTY_FORM = { leaveTypeId: '', startDate: '', endDate: '', halfDay: false, reason: '' };

function SuggestionCard({ s, onUse, annualLeaveTypeId }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-blue-100 dark:border-blue-900 p-4 flex flex-col gap-2 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{s.title}</h3>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-0.5">{s.dates}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <span className="inline-flex items-center gap-1 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs font-semibold px-2 py-1 rounded-full">
            {s.leaveDays} day{s.leaveDays !== 1 ? 's' : ''} → {s.totalDaysOff} off
          </span>
        </div>
      </div>
      <p className="text-xs text-gray-600 dark:text-gray-400">{s.description}</p>
      {s.tip && (
        <p className="text-xs text-amber-600 dark:text-amber-400 italic">Tip: {s.tip}</p>
      )}
      {annualLeaveTypeId && (
        <button
          onClick={() => onUse(s)}
          className="self-start mt-1 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Use these dates
        </button>
      )}
    </div>
  );
}

export default function MyLeave() {
  const [requests, setRequests]         = useState([]);
  const [leaveTypes, setLeaveTypes]     = useState([]);
  const [loading, setLoading]           = useState(true);
  const [showForm, setShowForm]         = useState(false);
  const [form, setForm]                 = useState(EMPTY_FORM);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');
  const [cancelId, setCancelId]         = useState(null);
  const [suggestions, setSuggestions]   = useState(null);
  const [sugLoading, setSugLoading]     = useState(false);
  const [sugError, setSugError]         = useState('');

  const load = async () => {
    setLoading(true);
    const [reqs, types] = await Promise.all([getMyLeave(), getLeaveTypes(true)]);
    setRequests(reqs);
    setLeaveTypes(types);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createLeave({
        leaveTypeId: Number(form.leaveTypeId),
        startDate: form.startDate,
        endDate: form.endDate,
        halfDay: form.halfDay,
        reason: form.reason,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit request');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    try {
      await cancelLeave(cancelId);
      setCancelId(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to cancel');
    }
  };

  const fetchSuggestions = async () => {
    setSugLoading(true);
    setSugError('');
    setSuggestions(null);
    try {
      const data = await getLeaveSuggestions();
      setSuggestions(data.suggestions);
    } catch (err) {
      setSugError(err.response?.data?.error || 'Failed to generate suggestions. Please try again.');
    } finally {
      setSugLoading(false);
    }
  };

  // Pre-fill the request form from an AI suggestion
  const useSuggestion = (s) => {
    const annualType = leaveTypes.find(t => t.name.toLowerCase().includes('annual'));
    const parseDate = (str) => {
      // Try to extract a start date from the suggestion dates string
      // Format like "18–26 Apr 2025" or "18 Apr – 26 Apr 2025"
      return '';
    };
    setForm(f => ({
      ...f,
      leaveTypeId: annualType ? String(annualType.id) : '',
    }));
    setError('');
    setShowForm(true);
  };

  const annualLeaveType = leaveTypes.find(t => t.name.toLowerCase().includes('annual'));

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Leave</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Request and track your leave</p>
        </div>
        <Button variant="primary" onClick={() => { setShowForm(true); setError(''); }}>
          + Request Leave
        </Button>
      </div>

      {/* AI Suggestions panel */}
      <div className="mb-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-xl border border-blue-100 dark:border-blue-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <span>✨</span> Smart Leave Suggestions
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              AI-powered ideas for Annual Leave — maximise days off around public holidays
            </p>
          </div>
          <Button
            variant="secondary"
            onClick={fetchSuggestions}
            loading={sugLoading}
            disabled={sugLoading}
          >
            {suggestions ? 'Refresh' : 'Get Suggestions'}
          </Button>
        </div>

        {sugError && (
          <p className="text-sm text-red-600 dark:text-red-400">{sugError}</p>
        )}

        {sugLoading && (
          <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">
            Analysing public holidays and finding the best bridge opportunities...
          </p>
        )}

        {suggestions && !sugLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
            {suggestions.map((s, i) => (
              <SuggestionCard
                key={i}
                s={s}
                onUse={useSuggestion}
                annualLeaveTypeId={annualLeaveType?.id}
              />
            ))}
          </div>
        )}

        {!suggestions && !sugLoading && !sugError && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Click "Get Suggestions" to see smart Annual Leave recommendations based on public holidays in your country.
          </p>
        )}
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No leave requests yet.</p>
          <p className="text-sm mt-1">Click "Request Leave" to get started.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Notes</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    <span className="inline-flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.leave_type_colour }} />
                      {r.leave_type_name}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(r.start_date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(r.end_date)}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300">
                    {r.total_days}{r.half_day ? ' (½)' : ''}
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {r.status === 'rejected' && r.rejection_reason
                      ? <span className="text-red-600 dark:text-red-400">Rejected: {r.rejection_reason}</span>
                      : r.reason || '—'}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => setCancelId(r.id)}
                        className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        Cancel
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Request Leave Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Request Leave">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Leave Type *</label>
            <select
              required
              value={form.leaveTypeId}
              onChange={e => setForm(f => ({ ...f, leaveTypeId: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select leave type...</option>
              {leaveTypes.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date *</label>
              <input
                type="date"
                required
                value={form.startDate}
                onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">End Date *</label>
              <input
                type="date"
                required
                value={form.endDate}
                min={form.startDate}
                onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={form.halfDay}
              onChange={e => setForm(f => ({ ...f, halfDay: e.target.checked }))}
              className="rounded border-gray-300 text-blue-600"
            />
            Half day (deducts 0.5 from total)
          </label>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
            <textarea
              rows={3}
              value={form.reason}
              onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
              placeholder="Optional reason or notes..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={saving}>Submit Request</Button>
          </div>
        </form>
      </Modal>

      {/* Cancel confirmation */}
      <Modal open={!!cancelId} onClose={() => setCancelId(null)} title="Cancel Leave Request">
        <p className="text-gray-700 dark:text-gray-300 mb-6">Are you sure you want to cancel this leave request?</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCancelId(null)}>No, keep it</Button>
          <Button variant="danger" onClick={handleCancel}>Yes, cancel it</Button>
        </div>
      </Modal>
    </div>
  );
}
