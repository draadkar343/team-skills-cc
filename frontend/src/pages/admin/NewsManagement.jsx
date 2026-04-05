import React, { useEffect, useState } from 'react';
import { getAllNews, createNews, updateNews, deleteNews } from '../../api/newsApi';
import { getJobRoles } from '../../api/jobRoleApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { title: '', body: '', jobRoleId: '' };

function FormFields({ f, setF, jobRoles }) {
  return (
    <>
      <div>
        <label className="block text-sm font-medium mb-1">Title</label>
        <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.title} onChange={e => setF(x => ({ ...x, title: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Body</label>
        <textarea required rows={5} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
          value={f.body} onChange={e => setF(x => ({ ...x, body: e.target.value }))} />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Job Role (leave blank to show to all)</label>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.jobRoleId} onChange={e => setF(x => ({ ...x, jobRoleId: e.target.value }))}>
          <option value="">All roles</option>
          {jobRoles.filter(r => r.is_active).map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
      </div>
    </>
  );
}

export default function NewsManagement() {
  const [items, setItems] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [editForm, setEditForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = async () => {
    const [news, roles] = await Promise.all([getAllNews(), getJobRoles()]);
    setItems(news);
    setJobRoles(roles);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createNews({ title: form.title, body: form.body, jobRoleId: form.jobRoleId || null });
      setAddModal(false);
      setForm(emptyForm);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to create'); }
    finally { setLoading(false); }
  };

  const openEdit = (item) => {
    setEditForm({ title: item.title, body: item.body, jobRoleId: item.job_role_id || '', isActive: item.is_active });
    setEditModal(item);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateNews(editModal.id, {
        title: editForm.title,
        body: editForm.body,
        jobRoleId: editForm.jobRoleId !== '' ? parseInt(editForm.jobRoleId) : null,
        isActive: editForm.isActive,
      });
      setEditModal(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to update'); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await deleteNews(deleteTarget.id);
      setDeleteTarget(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed to delete'); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">News Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create and manage news items shown on employee dashboards.</p>
        </div>
        <Button onClick={() => { setAddModal(true); setForm(emptyForm); }}>+ Add News</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Title</th>
              <th className="text-left p-4 font-medium text-gray-600">Job Role</th>
              <th className="text-left p-4 font-medium text-gray-600">Author</th>
              <th className="text-left p-4 font-medium text-gray-600">Date</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-gray-400 text-sm">No news items yet.</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4 font-medium max-w-xs">
                  <div className="truncate">{item.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5 truncate">{item.body}</div>
                </td>
                <td className="p-4 text-gray-500">{item.job_role_name || <span className="text-gray-400 italic">All roles</span>}</td>
                <td className="p-4 text-gray-500">{item.author}</td>
                <td className="p-4 text-gray-400 whitespace-nowrap">{new Date(item.created_at).toLocaleDateString()}</td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${item.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEdit(item)}>Edit</Button>
                    <button className="py-1 px-2 text-xs text-red-600 hover:bg-red-50 rounded border border-red-200"
                      onClick={() => setDeleteTarget(item)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add News Item">
        <form onSubmit={handleCreate} className="space-y-3">
          <FormFields f={form} setF={setForm} jobRoles={jobRoles} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Publish</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title="Edit News Item">
        <form onSubmit={handleEdit} className="space-y-3">
          <FormFields f={editForm} setF={setEditForm} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="newsActive" checked={editForm.isActive ?? true}
              onChange={e => setEditForm(x => ({ ...x, isActive: e.target.checked }))} />
            <label htmlFor="newsActive" className="text-sm">Active (visible to users)</label>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete News Item">
        <p className="text-sm text-gray-600 mb-4">Are you sure you want to delete <strong>{deleteTarget?.title}</strong>? This cannot be undone.</p>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
            onClick={handleDelete} disabled={loading}>
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
