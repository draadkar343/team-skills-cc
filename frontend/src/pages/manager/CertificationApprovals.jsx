import React, { useEffect, useState } from 'react';
import { getPendingCerts, approveCert, rejectCert } from '../../api/certsApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function CertificationApprovals() {
  const [certs, setCerts] = useState([]);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const load = () => getPendingCerts().then(setCerts).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleApprove = async (id) => {
    setLoading(true);
    try { await approveCert(id); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleReject = async () => {
    if (!reason.trim()) return alert('Please provide a rejection reason');
    setLoading(true);
    try {
      await rejectCert(rejectTarget, reason);
      setRejectTarget(null);
      setReason('');
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Certification Approvals</h1>

      {certs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-1">All caught up!</p>
          <p className="text-sm">No certifications awaiting approval.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {certs.map(cert => (
            <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-semibold">{cert.name}</span>
                    {cert.provider && (
                      <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{cert.provider}</span>
                    )}
                    <Badge status={cert.status} />
                  </div>
                  <div className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">{cert.first_name} {cert.last_name}</span>
                    <span className="text-gray-400 ml-2">{cert.email}</span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                    <span>Obtained: <strong className="text-gray-800">{cert.date_obtained?.slice(0, 10)}</strong></span>
                    {cert.expiration_date && (
                      <span>Expires: <strong className="text-gray-800">{cert.expiration_date?.slice(0, 10)}</strong></span>
                    )}
                    <span>Submitted: <strong className="text-gray-800">{cert.submitted_at?.slice(0, 10)}</strong></span>
                  </div>
                  {cert.notes && <p className="text-xs text-gray-400 mt-2">{cert.notes}</p>}
                  {cert.certificate_url && (
                    <a href={cert.certificate_url} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-2 inline-block">
                      View Certificate Document
                    </a>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <Button variant="success" className="py-1 px-3 text-sm" onClick={() => handleApprove(cert.id)} loading={loading}>Approve</Button>
                  <Button variant="danger" className="py-1 px-3 text-sm" onClick={() => { setRejectTarget(cert.id); setReason(''); }}>Reject</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Certification">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Reason for rejection</label>
            <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={reason} onChange={e => setReason(e.target.value)}
              placeholder="Please explain why this certification is being rejected..." />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={loading} onClick={handleReject}>Reject Certification</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
