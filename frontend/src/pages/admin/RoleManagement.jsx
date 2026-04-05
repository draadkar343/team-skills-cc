import React, { useEffect, useState } from 'react';
import { listRoles, updateRole, saveRolePermissions } from '../../api/rolesApi';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

export default function RoleManagement() {
  const [roles, setRoles]           = useState([]);
  const [allPerms, setAllPerms]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [editRole, setEditRole]     = useState(null);   // role object being edited
  const [permsRole, setPermsRole]   = useState(null);   // role object whose perms are being edited
  const [form, setForm]             = useState({});
  const [permSet, setPermSet]       = useState(new Set());
  const [saving, setSaving]         = useState(false);
  const [error, setError]           = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listRoles();
      setRoles(data.roles);
      setAllPerms(data.allPermissions);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ── Edit role details ──────────────────────────────────────────
  const openEdit = (r) => {
    setForm({ displayName: r.display_name, description: r.description || '', color: r.color });
    setError('');
    setEditRole(r);
  };

  const handleSaveDetails = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateRole(editRole.name, form);
      setEditRole(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Edit permissions ───────────────────────────────────────────
  const openPerms = (r) => {
    setPermSet(new Set(r.permissions));
    setError('');
    setPermsRole(r);
  };

  const togglePerm = (key) => {
    setPermSet(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleCategory = (keys) => {
    const allOn = keys.every(k => permSet.has(k));
    setPermSet(prev => {
      const next = new Set(prev);
      keys.forEach(k => allOn ? next.delete(k) : next.add(k));
      return next;
    });
  };

  const handleSavePerms = async () => {
    setSaving(true);
    setError('');
    try {
      await saveRolePermissions(permsRole.name, Array.from(permSet));
      setPermsRole(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  // Group allPerms by category
  const categories = allPerms.reduce((acc, p) => {
    (acc[p.category] = acc[p.category] || []).push(p);
    return acc;
  }, {});

  if (loading) return <div className="p-8 text-gray-500 dark:text-gray-400">Loading…</div>;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Role Management</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 text-left">Role</th>
              <th className="px-4 py-3 text-left">Description</th>
              <th className="px-4 py-3 text-left">Permissions</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {roles.map(r => (
              <tr key={r.name} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: r.color }} />
                    <span className="font-medium text-gray-900 dark:text-white">{r.display_name}</span>
                  </div>
                  <div className="text-xs text-gray-400 ml-5">{r.name}</div>
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-xs">{r.description || '—'}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.permissions.length} assigned</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => openPerms(r)}>Permissions</Button>
                    <Button size="sm" variant="outline" onClick={() => openEdit(r)}>Edit</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Edit Role Details Modal ── */}
      {editRole && (
        <Modal title={`Edit — ${editRole.display_name}`} onClose={() => setEditRole(null)}>
          <form onSubmit={handleSaveDetails} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
              <input
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.displayName}
                onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                rows={3}
                className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Colour</label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  className="h-9 w-14 cursor-pointer rounded border"
                  value={form.color}
                  onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                />
                <span className="text-sm text-gray-500">{form.color}</span>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditRole(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Permissions Modal ── */}
      {permsRole && (
        <Modal title={`Permissions — ${permsRole.display_name}`} onClose={() => setPermsRole(null)}>
          <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
            {error && <p className="text-sm text-red-600">{error}</p>}
            {Object.entries(categories).map(([cat, perms]) => {
              const keys = perms.map(p => p.key);
              const allOn = keys.every(k => permSet.has(k));
              const someOn = !allOn && keys.some(k => permSet.has(k));
              return (
                <div key={cat}>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      checked={allOn}
                      ref={el => { if (el) el.indeterminate = someOn; }}
                      onChange={() => toggleCategory(keys)}
                      className="rounded"
                    />
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">{cat}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 pl-5">
                    {perms.map(p => (
                      <label key={p.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={permSet.has(p.key)}
                          onChange={() => togglePerm(p.key)}
                          className="rounded"
                        />
                        {p.label}
                      </label>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between items-center pt-4 border-t border-gray-200 dark:border-gray-700 mt-4">
            <span className="text-sm text-gray-500">{permSet.size} permission{permSet.size !== 1 ? 's' : ''} selected</span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPermsRole(null)}>Cancel</Button>
              <Button onClick={handleSavePerms} disabled={saving}>{saving ? 'Saving…' : 'Save Permissions'}</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
