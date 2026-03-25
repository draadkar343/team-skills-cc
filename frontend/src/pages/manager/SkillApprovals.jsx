import React, { useEffect, useState } from 'react';
import { getPendingSkills, approveSkill, rejectSkill } from '../../api/skillsApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function SkillApprovals() {
  const [skills, setSkills] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => getPendingSkills().then(setSkills).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setLoading(true);
    try { await approveSkill(id); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return alert('Please provide a rejection reason');
    setLoading(true);
    try {
      await rejectSkill(rejectTarget, reason);
      setRejectTarget(null);
      setReason('');
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Skill Approvals</h1>

      {skills.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">All caught up!</p>
          <p className="text-sm">No skills awaiting approval.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Employee</th>
                <th className="text-left p-4 font-medium text-gray-600">Skill</th>
                <th className="text-left p-4 font-medium text-gray-600">Category</th>
                <th className="text-left p-4 font-medium text-gray-600">Weighting</th>
                <th className="text-left p-4 font-medium text-gray-600">Submitted</th>
                <th className="text-left p-4 font-medium text-gray-600">Notes</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {skills.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{s.first_name} {s.last_name}</div>
                    <div className="text-gray-400 text-xs">{s.email}</div>
                  </td>
                  <td className="p-4 font-medium">{s.skill_name}</td>
                  <td className="p-4 text-gray-500">{s.category_name || '-'}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-200 rounded-full h-2 w-20">
                        <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${s.weighting}%` }} />
                      </div>
                      <span>{s.weighting}%</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-400">{s.submitted_at?.slice(0, 10)}</td>
                  <td className="p-4 text-gray-500 max-w-xs truncate">{s.notes || '-'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <Button variant="success" className="py-1 px-2 text-xs" onClick={() => handleApprove(s.id)} loading={loading}>Approve</Button>
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => { setRejectTarget(s.id); setReason(''); }}>Reject</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Skill">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Reason for rejection</label>
            <textarea
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Please explain why this skill is being rejected..."
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={handleReject}>Reject Skill</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
