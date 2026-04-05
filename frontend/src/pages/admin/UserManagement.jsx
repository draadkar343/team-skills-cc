import React, { useEffect, useState } from 'react';
import { listUsers, createUser, updateUser, deleteUser, permanentlyDeleteUser, resetUserPassword, bulkImportUsers } from '../../api/adminApi';
import { getJobRoles } from '../../api/jobRoleApi';
import { listRoles } from '../../api/rolesApi';
import { COUNTRIES } from '../../utils/countries';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { email: '', password: '', firstName: '', lastName: '', role: 'employee' };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'reset'
  const [form, setForm] = useState(emptyForm);
  const [target, setTarget] = useState(null);
  const [newPw, setNewPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // user to permanently delete
  const [deleteError, setDeleteError] = useState('');

  const load = () => Promise.all([listUsers(), getJobRoles(), listRoles()]).then(([u, jr, rl]) => { setUsers(u); setJobRoles(jr); setSystemRoles(rl.roles || []); }).catch(() => {});
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create'); };
  const openEdit = (u) => {
    setTarget(u);
    setForm({ firstName: u.firstName, lastName: u.lastName, role: u.role, isActive: u.isActive, dateOfBirth: u.dateOfBirth ? u.dateOfBirth.split('T')[0] : '', jobRoleId: u.jobRoleId ?? '', countryCode: u.countryCode ?? '' });
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
      await updateUser(target.id, { ...form, dateOfBirth: form.dateOfBirth || null, jobRoleId: form.jobRoleId !== '' ? parseInt(form.jobRoleId) : null, countryCode: form.countryCode || null });
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

  const handlePermanentDelete = async () => {
    setDeleteError('');
    try {
      await permanentlyDeleteUser(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setDeleteError(err.response?.data?.error || 'Delete failed');
    }
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

  const downloadBulkTemplate = () => {
    const csv = 'first_name,last_name,email,password\nJohn,Smith,john.smith@company.com,SecurePass1!\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'users_import_template.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkImport = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const result = await bulkImportUsers(bulkFile);
      setBulkResult(result);
      await load();
    } catch (err) {
      setBulkResult({ errors: [err.response?.data?.error || 'Import failed'] });
    } finally { setBulkLoading(false); }
  };

  const roleMap = Object.fromEntries(systemRoles.map(r => [r.name, r]));
  const getRoleLabel = (roleName) => roleMap[roleName]?.display_name || roleName.replace(/_/g, ' ');
  const getRoleColor = (roleName) => roleMap[roleName]?.color || '#6B7280';

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => { setBulkModal(true); setBulkFile(null); setBulkResult(null); }}>Import CSV</Button>
          <Button onClick={openCreate}>+ New User</Button>
        </div>
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
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: getRoleColor(u.role) }}>
                    {getRoleLabel(u.role)}
                  </span>
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
                    {!u.isActive && (
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => { setDeleteTarget(u); setDeleteError(''); }}>Delete</Button>
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
            <label className="block text-sm font-medium mb-1">Date of Birth</label>
            <input type="date"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.dateOfBirth || ''} onChange={e => setForm(x => ({ ...x, dateOfBirth: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Role</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.role} onChange={e => setForm(x => ({ ...x, role: e.target.value }))}>
              {systemRoles.map(r => (
                <option key={r.name} value={r.name}>{r.display_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country / Region</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.countryCode || ''} onChange={e => setForm(x => ({ ...x, countryCode: e.target.value }))}>
              <option value="">— Not set —</option>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
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

      {/* Bulk Import Modal */}
      <Modal open={bulkModal} onClose={() => setBulkModal(false)} title="Bulk Import Users via CSV">
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p className="font-medium text-gray-700">Required columns:</p>
            <p><code>first_name, last_name, email, password</code></p>
            <p>All users are created with the Employee role. Passwords must be at least 8 characters. Duplicate emails are skipped.</p>
          </div>
          <button onClick={downloadBulkTemplate} className="text-xs text-blue-600 hover:underline">
            Download template CSV
          </button>
          <div>
            <label className="block text-sm font-medium mb-1">Select CSV File</label>
            <input type="file" accept=".csv,text/csv" className="text-sm text-gray-600"
              onChange={e => { setBulkFile(e.target.files[0] || null); setBulkResult(null); }} />
          </div>
          {bulkResult && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-green-600 font-medium">{bulkResult.inserted ?? 0} created</span>
                <span className="text-yellow-600 font-medium">{bulkResult.skipped ?? 0} skipped (duplicates)</span>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium mb-1">{bulkResult.errors.length} error(s):</p>
                  <ul className="text-red-500 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setBulkModal(false)}>Close</Button>
            <Button onClick={handleBulkImport} loading={bulkLoading} disabled={!bulkFile}>Import</Button>
          </div>
        </div>
      </Modal>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Permanently Delete User"
      >
        <div className="space-y-4">
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm font-medium text-red-800 dark:text-red-300">This action cannot be undone.</p>
            <p className="text-sm text-red-700 dark:text-red-400 mt-1">
              All data belonging to <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> will be permanently removed — skills, timesheets, certifications, leave records, and more.
            </p>
          </div>
          {deleteError && (
            <p className="text-sm text-red-600 dark:text-red-400">{deleteError}</p>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Any content they created (clients, API keys, etc.) will be reassigned to your account.
          </p>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={handlePermanentDelete}>Yes, permanently delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
