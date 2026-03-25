import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser, resetUserPassword } from '../../api/adminApi';
import { getJobRoles } from '../../api/jobRoleApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', role: 'employee' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'reset'
  const [form, setForm] = useState(emptyForm);
  const [target, setTarget] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = () => Promise.all([listUsers(), getJobRoles()]).then(([u, jr]) => { setUsers(u); setJobRoles(jr); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create'); };
  const openEdit = (u) => {
    setTarget(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive, jobRoleId: u.jobRoleId ?? '' });
    setError('');
    setModal('edit');
  };
  const openReset = (u) => { setTarget(u); setNewPw(''); setModal('reset'); };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createUser(form);
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateUser(target.id, { ...form, jobRoleId: form.jobRoleId !== '' ? parseInt(form.jobRoleId) : null });
      setModal(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleDeactivate = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    await deleteUser(id);
    await load();
  };

  const handleReset = async () => {
    if (!newPw || newPw.length < 8) return alert('Password must be at least 8 characters');
    setLoading(true);
    try {
      await resetUserPassword(target.id, newPw);
      setModal(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed');
    } finally { setLoading(false); }
  };

  const roleBadge = { employee: 'bg-gray-100 text-gray-600', manager: 'bg-blue-100 text-blue-700', administrator: 'bg-purple-100 text-purple-700' };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <Button onClick={openCreate}>+ New User</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Name</th>
              <th className="text-left p-4 font-medium text-gray-600">Email</th>
              <th className="text-left p-4 font-medium text-gray-600">Job Role</th>
              <th className="text-left p-4 font-medium text-gray-600">Role</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium">{u.firstName} {u.lastName}</td>
                <td className="p-4 text-gray-500">{u.email}</td>
                <td className="p-4 text-gray-500 text-sm">{u.jobRoleName || '-'}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize ${roleBadge[u.role]}`}>{u.role}</span>
                </td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEdit(u)}>Edit</Button>
                    <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openReset(u)}>Reset PW</Button>
                    {u.isActive && (
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDeactivate(u.id)}>Deactivate</Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create User">
        <form onSubmit={handleCreate} className="space-y-3">
          {error && <p className="text-sm text-red-500">{error}</p>}
          {['firstName', 'lastName', 'email'].map(f => (
            <div key={f}>
              <label className="block text-sm font-medium mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
              <input required type={f === 'email' ? 'email' : 'text'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form[f] || ''} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input required type="password" minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.password} onChange={e => setForm(x => ({ ...x, password: e.target.value }))} />
          </div>
          <p className="text-xs text-gray-400">New users are always created with the Employee role. Use Edit to promote them.</p>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={`Edit: ${target?.firstName} ${target?.lastName}`}>
        <form onSubmit={handleUpdate} className="space-y-3">
          {['firstName', 'lastName'].map(f => (
            <div key={f}>
              <label className="block text-sm font-medium mb-1 capitalize">{f.replace(/([A-Z])/g, ' $1')}</label>
              <input type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form[f] || ''} onChange={e => setForm(x => ({ ...x, [f]: e.target.value }))} />
            </div>
          ))}
          <div>
            <label className="block text-sm font-medium mb-1">Job Role</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.jobRoleId || ''} onChange={e => setForm(x => ({ ...x, jobRoleId: e.target.value }))}>
              <option value="">None</option>
              {jobRoles.filter(r => r.is_active).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.role} onChange={e => setForm(x => ({ ...x, role: e.target.value }))}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
              <option value="administrator">Administrator</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal open={modal === 'reset'} onClose={() => setModal(null)} title={`Reset Password: ${target?.firstName}`}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">New Password</label>
            <input type="password" minLength={8}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={newPw} onChange={e => setNewPw(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
            <Button loading={loading} onClick={handleReset}>Reset Password</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
