import React, { useEffect, useState } from 'react';
import { getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType } from '../../api/leaveApi';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const EMPTY_FORM = { name: '', description: '', colour: '#3B82F6', is_active: true };

const PRESET_COLOURS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16',
];

export default function LeaveTypes() {
  const [types, setTypes]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null); // null | 'create' | {id, ...}
  const [form, setForm]       = useState(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await getLeaveTypes();
    setTypes(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setError('');
    setModal('create');
  };

  const openEdit = (t) => {
    setForm({ name: t.name, description: t.description || '', colour: t.colour, is_active: t.is_active });
    setError('');
    setModal(t);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (modal === 'create') {
        await createLeaveType(form);
      } else {
        await updateLeaveType(modal.id, form);
      }
      setModal(null);
      await load();
    } catch (err) {
      setError(err.response?.data?.error || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteLeaveType(deleteId);
      setDeleteId(null);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Leave Types</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage the types of leave employees can request</p>
        </div>
        <Button variant="primary" onClick={openCreate}>+ Add Leave Type</Button>
      </div>

      {loading ? (
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      ) : types.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-gray-500">
          <p className="text-lg">No leave types yet.</p>
          <p className="text-sm mt-1">Create one to allow employees to submit leave requests.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
          {types.map(t => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4">
              <span className="w-5 h-5 rounded flex-shrink-0 shadow-sm" style={{ backgroundColor: t.colour }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900 dark:text-white">{t.name}</span>
                  {!t.is_active && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      Inactive
                    </span>
                  )}
                </div>
                {t.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 truncate">{t.description}</p>
                )}
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteId(t.id)}
                  className="text-sm text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={!!modal}
        onClose={() => setModal(null)}
        title={modal === 'create' ? 'Add Leave Type' : 'Edit Leave Type'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Annual Leave, Sick Leave..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Optional description..."
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Colour</label>
            <div className="flex items-center gap-2 flex-wrap">
              {PRESET_COLOURS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, colour: c }))}
                  className={`w-7 h-7 rounded-full border-2 transition-transform ${form.colour === c ? 'border-gray-900 dark:border-white scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.colour}
                onChange={e => setForm(f => ({ ...f, colour: e.target.value }))}
                className="w-8 h-8 rounded cursor-pointer border border-gray-300 dark:border-gray-600 p-0.5 bg-white dark:bg-gray-700"
                title="Custom colour"
              />
            </div>
          </div>

          {modal !== 'create' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600"
              />
              Active (visible to employees)
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
            <Button variant="primary" type="submit" loading={saving}>
              {modal === 'create' ? 'Create' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirmation */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Leave Type">
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          Are you sure? If any leave requests use this type, deletion will fail — deactivate it instead.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
