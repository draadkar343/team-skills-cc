import React, { useEffect, useState } from 'react';
import { getJobRoles, getMainSkills, createMainSkill, updateMainSkill, deleteMainSkill } from '../../api/jobRoleApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function MainSkillsView() {
  const [jobRoles, setJobRoles] = useState([]);
  const [mainSkills, setMainSkills] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(null); // null | 'create' | 'edit'
  const [form, setForm] = useState({ name: '', description: '' });
  const [target, setTarget] = useState(null);

  useEffect(() => {
    getJobRoles().then(roles => {
      setJobRoles(roles);
      if (roles.length) { setSelectedRole(roles[0]); loadSkills(roles[0].id); }
    });
  }, []);

  const loadSkills = async (jobRoleId) => {
    const skills = await getMainSkills(jobRoleId);
    setMainSkills(skills);
  };

  const selectRole = (role) => { setSelectedRole(role); loadSkills(role.id); };

  const openCreate = () => { setForm({ name: '', description: '' }); setError(''); setModal('create'); };
  const openEdit = (s) => { setTarget(s); setForm({ name: s.name, description: s.description || '' }); setError(''); setModal('edit'); };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!selectedRole) return;
    setLoading(true); setError('');
    try {
      await createMainSkill({ ...form, jobRoleId: selectedRole.id });
      setModal(null);
      await loadSkills(selectedRole.id);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      await updateMainSkill(target.id, form);
      setModal(null);
      if (selectedRole) await loadSkills(selectedRole.id);
    } catch (err) { setError(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Delete main skill "${s.name}"?`)) return;
    try {
      await deleteMainSkill(s.id);
      if (selectedRole) await loadSkills(selectedRole.id);
    } catch (err) { alert(err.response?.data?.error || 'Cannot delete — skills may be linked.'); }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Main Skills</h1>

      <div className="grid grid-cols-3 gap-6">
        {/* Left: Job Roles (read-only) */}
        <div>
          <h2 className="font-semibold text-gray-700 mb-3">Job Roles</h2>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {jobRoles.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No job roles configured yet.</p>
            ) : (
              jobRoles.map(r => (
                <div
                  key={r.id}
                  onClick={() => selectRole(r)}
                  className={`p-3 border-b last:border-0 cursor-pointer transition-colors ${selectedRole?.id === r.id ? 'bg-blue-50 border-l-2 border-l-blue-500' : 'hover:bg-gray-50'}`}
                >
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-gray-400">{r.main_skill_count} skill{r.main_skill_count !== 1 ? 's' : ''}</div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Main Skills for selected role */}
        <div className="col-span-2">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-gray-700">
              {selectedRole ? `Main Skills — ${selectedRole.name}` : 'Main Skills'}
            </h2>
            {selectedRole && (
              <Button className="text-xs py-1 px-3" onClick={openCreate}>+ Add Main Skill</Button>
            )}
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            {!selectedRole ? (
              <p className="p-4 text-sm text-gray-400">Select a job role.</p>
            ) : mainSkills.length === 0 ? (
              <p className="p-4 text-sm text-gray-400">No main skills for this job role yet. Click "+ Add Main Skill" to create one.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left p-3 font-medium text-gray-600">Name</th>
                    <th className="text-left p-3 font-medium text-gray-600">Description</th>
                    <th className="text-left p-3 font-medium text-gray-600">Catalogue Skills</th>
                    <th className="p-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {mainSkills.map(s => (
                    <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="p-3 font-medium">{s.name}</td>
                      <td className="p-3 text-gray-400">{s.description || '-'}</td>
                      <td className="p-3 text-gray-500">{s.catalogue_skill_count}</td>
                      <td className="p-3">
                        <div className="flex gap-2 justify-end">
                          <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEdit(s)}>Edit</Button>
                          <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDelete(s)}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? `Add Main Skill to ${selectedRole?.name}` : `Edit: ${target?.name}`}>
        <form onSubmit={modal === 'create' ? handleCreate : handleUpdate} className="space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>{modal === 'create' ? 'Add' : 'Save'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
