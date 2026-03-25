import React, { useEffect, useState } from 'react';
import { getMyCerts, addCert, updateCert, deleteCert, submitCert } from '../../api/certsApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { name: '', provider: '', dateObtained: '', expirationDate: '', notes: '' };

function expiryClass(dateStr) {
  if (!dateStr) return '';
  const days = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  if (days < 0) return 'text-red-600';
  if (days <= 30) return 'text-yellow-600';
  return 'text-gray-500';
}

function expiryLabel(dateStr) {
  if (!dateStr) return 'No expiry';
  const days = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return 'Expires today';
  if (days <= 30) return `Expires in ${days}d`;
  return new Date(dateStr).toLocaleDateString();
}

export default function MyCertifications() {
  const [certs, setCerts] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [editCert, setEditCert] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [file, setFile] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const load = () => getMyCerts().then(setCerts).catch(() => {});
  useEffect(() => { load(); }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addCert(form, file);
      setAddModal(false);
      setForm(emptyForm);
      setFile(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to add'); }
    finally { setLoading(false); }
  };

  const openEdit = (cert) => {
    setEditForm({
      name: cert.name,
      provider: cert.provider || '',
      dateObtained: cert.date_obtained?.slice(0, 10) || '',
      expirationDate: cert.expiration_date?.slice(0, 10) || '',
      notes: cert.notes || '',
    });
    setEditFile(null);
    setEditCert(cert);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCert(editCert.id, editForm, editFile);
      setEditCert(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this certification?')) return;
    await deleteCert(id).catch(() => {});
    await load();
  };

  const handleSubmit = async (id) => {
    await submitCert(id).catch(err => alert(err.response?.data?.error || 'Failed'));
    await load();
  };

  const CertForm = ({ f, setF, fileState, setFileState }) => (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Certification Name <span className="text-red-500">*</span></label>
          <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium mb-1">Issuing Provider</label>
          <input type="text" placeholder="e.g. AWS, Microsoft, CompTIA" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={f.provider} onChange={e => setF(x => ({ ...x, provider: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Date Obtained <span className="text-red-500">*</span></label>
          <input required type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={f.dateObtained} onChange={e => setF(x => ({ ...x, dateObtained: e.target.value }))} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Expiration Date</label>
          <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={f.expirationDate} onChange={e => setF(x => ({ ...x, expirationDate: e.target.value }))} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Notes</label>
        <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.notes} onChange={e => setF(x => ({ ...x, notes: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Certificate File <span className="text-xs text-gray-400">(PDF or image, max 10MB)</span></label>
        <input type="file" accept=".pdf,image/*" className="text-sm text-gray-600"
          onChange={e => setFileState(e.target.files[0] || null)} />
        {fileState && <p className="text-xs text-gray-400 mt-1">{fileState.name}</p>}
      </div>
    </>
  );

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Certifications</h1>
        <Button onClick={() => { setAddModal(true); setForm(emptyForm); setFile(null); }}>+ Add Certification</Button>
      </div>

      {certs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No certifications added yet</p>
          <p className="text-sm">Click "Add Certification" to get started</p>
        </div>
      ) : (
        <div className="space-y-3">
          {certs.map(cert => (
            <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium">{cert.name}</span>
                    {cert.provider && <span className="text-xs text-gray-400 border border-gray-200 rounded px-1.5 py-0.5">{cert.provider}</span>}
                    <Badge status={cert.status} />
                  </div>
                  <div className="flex gap-4 text-sm text-gray-500 flex-wrap">
                    <span>Obtained: <strong className="text-gray-800">{cert.date_obtained?.slice(0, 10)}</strong></span>
                    <span className={expiryClass(cert.expiration_date)}>
                      {expiryLabel(cert.expiration_date)}
                    </span>
                  </div>
                  {cert.notes && <p className="text-xs text-gray-400 mt-1">{cert.notes}</p>}
                  {cert.status === 'rejected' && cert.rejection_reason && (
                    <p className="text-xs text-red-500 mt-1">Rejected: {cert.rejection_reason}</p>
                  )}
                  {cert.certificate_url && (
                    <a href={cert.certificate_url} target="_blank" rel="noreferrer"
                      className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                      View Certificate
                    </a>
                  )}
                </div>
                <div className="flex gap-2 ml-4 flex-shrink-0">
                  {['draft', 'rejected'].includes(cert.status) && (
                    <>
                      <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => openEdit(cert)}>Edit</Button>
                      <Button variant="success" className="text-xs py-1 px-2" onClick={() => handleSubmit(cert.id)}>Submit</Button>
                      <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(cert.id)}>Delete</Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Certification">
        <form onSubmit={handleAdd} className="space-y-3">
          <CertForm f={form} setF={setForm} fileState={file} setFileState={setFile} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Certification</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editCert} onClose={() => setEditCert(null)} title={`Edit: ${editCert?.name}`}>
        <form onSubmit={handleEdit} className="space-y-3">
          <CertForm f={editForm} setF={setEditForm} fileState={editFile} setFileState={setEditFile} />
          {editCert?.certificate_url && !editFile && (
            <p className="text-xs text-gray-400">
              Current file: <a href={editCert.certificate_url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">View</a>
            </p>
          )}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setEditCert(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
