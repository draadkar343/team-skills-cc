import React, { useEffect, useState } from 'react';
import { getPendingTimesheets, approveTimesheet, rejectTimesheet, getTimesheet } from '../../api/timesheetApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function TimesheetApprovals() {
  const [timesheets, setTimesheets] = useState([]);
  const [detail, setDetail] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => getPendingTimesheets().then(setTimesheets).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setLoading(true);
    try { await approveTimesheet(id); await load(); if (detail?.id === id) setDetail(null); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return alert('Please provide a rejection reason');
    setLoading(true);
    try {
      await rejectTimesheet(rejectTarget, reason);
      setRejectTarget(null);
      setReason('');
      await load();
      if (detail?.id === rejectTarget) setDetail(null);
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const openDetail = async (id) => {
    const ts = await getTimesheet(id);
    setDetail(ts);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Timesheet Approvals</h1>

      {timesheets.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">No timesheets awaiting approval.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Employee</th>
                <th className="text-left p-4 font-medium text-gray-600">Week</th>
                <th className="text-left p-4 font-medium text-gray-600">Total Hours</th>
                <th className="text-left p-4 font-medium text-gray-600">Submitted</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {timesheets.map(t => (
                <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{t.first_name} {t.last_name}</div>
                    <div className="text-gray-400 text-xs">{t.email}</div>
                  </td>
                  <td className="p-4">{t.week_start_date?.slice(0, 10)}</td>
                  <td className="p-4 font-semibold">{t.total_hours}h</td>
                  <td className="p-4 text-gray-400">{t.submitted_at?.slice(0, 10)}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openDetail(t.id)}>View</Button>
                      <Button variant="success" className="py-1 px-2 text-xs" onClick={() => handleApprove(t.id)} loading={loading}>Approve</Button>
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => { setRejectTarget(t.id); setReason(''); }}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail view */}
      {detail && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex justify-between items-start mb-4">
            <h2 className="font-semibold">Timesheet Detail — Week of {detail.week_start_date?.slice(0, 10)}</h2>
            <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Date</th><th className="pb-2">Hours</th>
                <th className="pb-2">Project</th><th className="pb-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {(detail.entries || []).map(e => (
                <tr key={e.id} className="border-b last:border-0">
                  <td className="py-2">{e.work_date?.slice(0, 10)}</td>
                  <td className="py-2">{e.hours}</td>
                  <td className="py-2">{e.project_code || '-'}</td>
                  <td className="py-2">{e.description || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm font-semibold mt-3 text-right">Total: {detail.total_hours}h</p>
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Timesheet">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Reason for rejection</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Explain why this timesheet is being rejected..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={handleReject}>Reject</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
