import React, { useEffect, useState } from 'react';
import {
  getCatalogue, getMySkills, addSkill, updateMySkill,
  deleteMySkill, submitSkill, submitAllSkills
} from '../../api/skillsApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function MySkills() {
  const [catalogue, setCatalogue] = useState([]);
  const [mySkills, setMySkills] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [editSkill, setEditSkill] = useState(null);
  const [rejectInfo, setRejectInfo] = useState(null);
  const [form, setForm] = useState({ skillId: '', weighting: 50, notes: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    const [cat, mine] = await Promise.all([getCatalogue(), getMySkills()]);
    setCatalogue(cat);
    setMySkills(mine);
  };

  useEffect(() => { load(); }, []);

  const addedIds = new Set(mySkills.map(s => s.skill_id));
  const available = catalogue.filter(s => !addedIds.has(s.id));

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await addSkill({ skillId: parseInt(form.skillId), weighting: parseInt(form.weighting), notes: form.notes });
      setAddModal(false);
      setForm({ skillId: '', weighting: 50, notes: '' });
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add skill');
    } finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateMySkill(editSkill.id, { weighting: parseInt(editSkill.weighting), notes: editSkill.notes });
      setEditSkill(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this skill?')) return;
    await deleteMySkill(id);
    await load();
  };

  const handleSubmit = async (id) => {
    await submitSkill(id);
    await load();
  };

  const handleSubmitAll = async () => {
    await submitAllSkills();
    await load();
  };

  const hasDrafts = mySkills.some(s => ['draft', 'rejected'].includes(s.status));

  // Group by job role → main skill → skill
  const grouped = mySkills.reduce((acc, s) => {
    const jobRole = s.job_role_name || 'Unassigned';
    const mainSkill = s.main_skill_name || 'General';
    const key = `${jobRole}|||${mainSkill}`;
    if (!acc[key]) acc[key] = { jobRole, mainSkill, skills: [] };
    acc[key].skills.push(s);
    return acc;
  }, {});

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Skills</h1>
        <div className="flex gap-2">
          {hasDrafts && (
            <Button variant="secondary" onClick={handleSubmitAll}>Submit All for Approval</Button>
          )}
          <Button onClick={() => setAddModal(true)} disabled={available.length === 0}>+ Add Skill</Button>
        </div>
      </div>

      {mySkills.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg mb-2">No skills added yet</p>
          <p className="text-sm">Click "Add Skill" to get started</p>
        </div>
      ) : (
        Object.entries(grouped).map(([key, { jobRole, mainSkill, skills }]) => (
          <div key={key} className="mb-6">
            <div className="flex items-baseline gap-2 mb-3">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{jobRole}</h2>
              <span className="text-xs text-gray-400">/ {mainSkill}</span>
            </div>
            <div className="space-y-3">
              {skills.map(s => (
                <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{s.skill_name}</span>
                        <Badge status={s.status} />
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500">
                        <span>Weighting: <strong className="text-gray-900">{s.weighting}%</strong></span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-xs">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${s.weighting}%` }} />
                        </div>
                      </div>
                      {s.notes && <p className="text-xs text-gray-400 mt-1">{s.notes}</p>}
                      {s.status === 'rejected' && s.rejection_reason && (
                        <p className="text-xs text-red-500 mt-1">Rejected: {s.rejection_reason}</p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      {['draft', 'rejected'].includes(s.status) && (
                        <>
                          <Button variant="secondary" className="text-xs py-1 px-2" onClick={() => setEditSkill({ ...s })}>Edit</Button>
                          <Button variant="success" className="text-xs py-1 px-2" onClick={() => handleSubmit(s.id)}>Submit</Button>
                          <Button variant="danger" className="text-xs py-1 px-2" onClick={() => handleDelete(s.id)}>Delete</Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Add Modal */}
      <Modal open={addModal} onClose={() => { setAddModal(false); setError(''); }} title="Add Skill">
        <form onSubmit={handleAdd} className="space-y-4">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Skill</label>
            <select
              required
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.skillId}
              onChange={e => setForm(f => ({ ...f, skillId: e.target.value }))}
            >
              <option value="">Select a skill...</option>
              {available.map(s => (
                <option key={s.id} value={s.id}>{s.category_name ? `${s.category_name} / ` : ''}{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Weighting: {form.weighting}%</label>
            <input
              type="range" min="0" max="100"
              className="w-full accent-blue-600"
              value={form.weighting}
              onChange={e => setForm(f => ({ ...f, weighting: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Skill</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={!!editSkill} onClose={() => setEditSkill(null)} title={`Edit: ${editSkill?.skill_name}`}>
        {editSkill && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Weighting: {editSkill.weighting}%</label>
              <input
                type="range" min="0" max="100"
                className="w-full accent-blue-600"
                value={editSkill.weighting}
                onChange={e => setEditSkill(s => ({ ...s, weighting: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={editSkill.notes || ''}
                onChange={e => setEditSkill(s => ({ ...s, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="secondary" type="button" onClick={() => setEditSkill(null)}>Cancel</Button>
              <Button type="submit" loading={loading}>Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
