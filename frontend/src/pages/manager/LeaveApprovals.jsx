import React, { useEffect, useState } from 'react';
import { getPendingLeave, approveLeave, rejectLeave } from '../../api/leaveApi';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function LeaveApprovals() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [rejectModal, setRejectModal] = useState(null); // { id, name }
  const [rejectReason, setRejectReason] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const data = await getPendingLeave();
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    try {
      await approveLeave(id);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to approve');
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setSaving(true);
    try {
      await rejectLeave(rejectModal.id, rejectReason.trim());
      setRejectModal(null);
      setRejectReason('');
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to reject');
    } finally {
      setSaving(false);
    }
  };

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Approvals</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Pending leave requests from your squad</p>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : requests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No pending leave requests.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
              <tr>
                <th className="px-4 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">From</th>
                <th className="px-4 py-3 text-left">To</th>
                <th className="px-4 py-3 text-center">Days</th>
                <th className="px-4 py-3 text-left">Reason</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {requests.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-700 dark:text-blue-300 text-xs font-bold">
                          {r.requester_name?.charAt(0)}
                        </div>
                      )}
                      <span className="font-medium text-gray-900 dark:text-white">{r.requester_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: r.leave_type_colour }} />
                      <span className="text-gray-700 dark:text-gray-300">{r.leave_type_name}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(r.start_date)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmt(r.end_date)}</td>
                  <td className="px-4 py-3 text-center text-gray-700 dark:text-gray-300 font-medium">
                    {r.total_days}{r.half_day ? ' (½)' : ''}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs truncate">
                    {r.reason || <span className="italic text-gray-400">None</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 whitespace-nowrap">
                    {new Date(r.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(r.id)}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300 dark:hover:bg-green-800"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => { setRejectModal({ id: r.id, name: r.requester_name }); setRejectReason(''); }}
                        className="px-3 py-1 rounded-lg text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      >
                        Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={!!rejectModal}
        onClose={() => setRejectModal(null)}
        title={`Reject Leave — ${rejectModal?.name}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">Please provide a reason for rejecting this request.</p>
          <textarea
            rows={3}
            autoFocus
            value={rejectReason}
            onChange={e => setRejectReason(e.target.value)}
            placeholder="Reason for rejection..."
            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRejectModal(null)}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={saving} disabled={!rejectReason.trim()}>
              Reject Request
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
