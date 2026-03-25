import React, { useEffect, useState } from 'react';
import {
  getJobRoles, createJobRole, updateJobRole, deleteJobRole,
  getMainSkills, createMainSkill, updateMainSkill, deleteMainSkill,
} from '../../api/jobRoleApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function JobRolesView() {
  const [jobRoles, setJobRoles] = useState([]);
  const [mainSkills, setMainSkills] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Job role modals
  const [jrModal, setJrModal] = useState(null); // null | 'create' | 'edit'
  const [jrForm, setJrForm] = useState({ name: '', description: '' });
  const [jrTarget, setJrTarget] = useState(null);

  // Main skill modals
  const [msModal, setMsModal] = useState(null); // null | 'create' | 'edit'
  const [msForm, setMsForm] = useState({ name: '', description: '', jobRoleId: '' });
  const [msTarget, setMsTarget] = useState(null);

  const loadRoles = async () => {
    const roles = await getJobRoles();
    setJobRoles(roles);
    if (selectedRole) {
      const still = roles.find(r => r.id === selectedRole.id);
      if (still) setSelectedRole(still);
    }
  };

  const loadMainSkills = async (jobRoleId) => {
    const skills = await getMainSkills(jobRoleId);
    setMainSkills(skills);
  };

  useEffect(() => { loadRoles(); }, []);

  const selectRole = (role) => {
    setSelectedRole(role);
    loadMainSkills(role.id);
  };

  // ── Job Role CRUD ──────────────────────────────────────────────────────
  const openCreateJR = () => { setJrForm({ name: '', description: '' }); setError(''); setJrModal('create'); };
  const openEditJR = (r) => { setJrTarget(r); setJrForm({ name: r.name, description: r.description || '' }); setError(''); setJrModal('edit'); };

  const handleCreateJR = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createJobRole(jrForm);
      setJrModal(null);
      await loadRoles();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleUpdateJR = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateJobRole(jrTarget.id, jrForm);
      setJrModal(null);
      await loadRoles();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDeleteJR = async (r) => {
    if (!window.confirm(`Delete job role "${r.name}"? This will fail if main skills are linked to it.`)) return;
    try {
      await deleteJobRole(r.id);
      if (selectedRole?.id === r.id) { setSelectedRole(null); setMainSkills([]); }
      await loadRoles();
    } catch (err) { alert(err.response?.data?.error || 'Cannot delete — remove linked main skills first.'); }
  };

  // ── Main Skill CRUD ────────────────────────────────────────────────────
  const openCreateMS = () => { setMsForm({ name: '', description: '', jobRoleId: selectedRole?.id || '' }); setError(''); setMsModal('create'); };
  const openEditMS = (s) => { setMsTarget(s); setMsForm({ name: s.name, description: s.description || '', jobRoleId: s.job_role_id }); setError(''); setMsModal('edit'); };

  const handleCreateMS = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await createMainSkill(msForm);
      setMsModal(null);
      if (selectedRole) await loadMainSkills(selectedRole.id);
      await loadRoles();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleUpdateMS = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateMainSkill(msTarget.id, msForm);
      setMsModal(null);
      if (selectedRole) await loadMainSkills(selectedRole.id);
      await loadRoles();
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDeleteMS = async (s) => {
    if (!window.confirm(`Delete main skill "${s.name}"?`)) return;
    try {
      await deleteMainSkill(s.id);
      if (selectedRole) await loadMainSkills(selectedRole.id);
      await loadRoles();
    } catch (err) { alert(err.response?.data?.error || 'Cannot delete — skills may be linked.'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Job Roles & Main Skills</h1>

      <div className="grid grid-cols-2 gap-6">
        {/* Left panel: Job Roles */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">Job Roles</h2>
            <Button className="text-xs py-1 px-3" onClick={openCreateJR}>+ Add</Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {jobRoles.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No job roles yet.</p>
            ) : (
              jobRoles.map(r => (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`flex items-center justify-between p-3 border-b last:border-0 cursor-pointer transition-colors ${selectedRole?.id === r.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                >
                  <div>
                    <div className="font-medium text-sm">{r.name}</div>
                    {r.description && <div className="text-xs text-gray-400">{r.description}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{r.main_skill_count} main skill{r.main_skill_count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex gap-1 ml-2" onClick={e => e.stopPropagation()}>
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => openEditJR(r)}>Edit</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteJR(r)}>Del</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right panel: Main Skills for selected role */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">
              {selectedRole ? `Main Skills — ${selectedRole.name}` : 'Main Skills'}
            </h2>
            {selectedRole && (
              <Button className="text-xs py-1 px-3" onClick={openCreateMS}>+ Add</Button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {!selectedRole ? (
              <p className="p-4 text-sm text-gray-400">Select a job role to view its main skills.</p>
            ) : mainSkills.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No main skills for this job role yet.</p>
            ) : (
              mainSkills.map(s => (
                <div key={s.id} className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50">
                  <div>
                    <div className="font-medium text-sm">{s.name}</div>
                    {s.description && <div className="text-xs text-gray-400">{s.description}</div>}
                    <div className="text-xs text-gray-400 mt-0.5">{s.catalogue_skill_count} catalogue skill{s.catalogue_skill_count !== 1 ? 's' : ''}</div>
                  </div>
                  <div className="flex gap-1 ml-2">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => openEditMS(s)}>Edit</button>
                    <span className="text-gray-300">|</span>
                    <button className="text-xs text-red-500 hover:underline" onClick={() => handleDeleteMS(s)}>Del</button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Job Role Create/Edit Modal */}
      <Modal open={!!jrModal} onClose={() => setJrModal(null)} title={jrModal === 'create' ? 'Add Job Role' : `Edit: ${jrTarget?.name}`}>
        <form onSubmit={jrModal === 'create' ? handleCreateJR : handleUpdateJR} className="space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={jrForm.name} onChange={e => setJrForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={jrForm.description} onChange={e => setJrForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setJrModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>{jrModal === 'create' ? 'Add' : 'Save'}</Button>
          </div>
        </form>
      </Modal>

      {/* Main Skill Create/Edit Modal */}
      <Modal open={!!msModal} onClose={() => setMsModal(null)} title={msModal === 'create' ? 'Add Main Skill' : `Edit: ${msTarget?.name}`}>
        <form onSubmit={msModal === 'create' ? handleCreateMS : handleUpdateMS} className="space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Job Role</label>
            <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={msForm.jobRoleId} onChange={e => setMsForm(f => ({ ...f, jobRoleId: e.target.value }))}>
              <option value="">Select job role...</option>
              {jobRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={msForm.name} onChange={e => setMsForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={msForm.description} onChange={e => setMsForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setMsModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>{msModal === 'create' ? 'Add' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
