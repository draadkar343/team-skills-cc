import React, { useEffect, useState } from 'react';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate,
  addTask, updateTask, deleteTask,
  listAssignments, assign, removeAssignment,
} from '../../api/onboardingApi';
import { listUsers } from '../../api/adminApi';
import Modal from '../../components/common/Modal';
import Button from '../../components/common/Button';

const TABS = ['Templates', 'Assignments'];

function Avatar({ url, name, size = 8 }) {
  if (url) return <img src={url} alt={name} className={`w-${size} h-${size} rounded-full object-cover`} />;
  const initials = name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className={`w-${size} h-${size} rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold`}>
      {initials}
    </div>
  );
}

export default function OnboardingAdmin() {
  const [tab, setTab]                 = useState('Templates');
  const [templates, setTemplates]     = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [users, setUsers]             = useState([]);
  const [selected, setSelected]       = useState(null); // expanded template
  const [modal, setModal]             = useState(null); // 'template' | 'task' | 'assign'
  const [form, setForm]               = useState({});
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState('');

  const loadTemplates   = () => listTemplates().then(setTemplates).catch(() => {});
  const loadAssignments = () => listAssignments().then(setAssignments).catch(() => {});
  const loadUsers       = () => listUsers().then(setUsers).catch(() => {});

  useEffect(() => {
    loadTemplates();
    loadAssignments();
    loadUsers();
  }, []);

  // ── Template CRUD ──────────────────────────────────────────────────────────
  const openNewTemplate = () => { setForm({}); setError(''); setModal('template'); };
  const openEditTemplate = (t) => { setForm({ id: t.id, name: t.name, description: t.description || '', is_active: t.is_active }); setError(''); setModal('template'); };

  const handleSaveTemplate = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (form.id) {
        await updateTemplate(form.id, form);
      } else {
        await createTemplate(form);
      }
      setModal(null); await loadTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!window.confirm('Delete this template? All employee assignments will also be removed.')) return;
    await deleteTemplate(id).catch(() => {});
    await loadTemplates();
    if (selected?.id === id) setSelected(null);
  };

  // ── Task CRUD ──────────────────────────────────────────────────────────────
  const openNewTask = (template) => { setSelected(template); setForm({ templateId: template.id }); setError(''); setModal('task'); };
  const openEditTask = (template, task) => {
    setSelected(template);
    setForm({ id: task.id, templateId: template.id, title: task.title, description: task.description || '', sort_order: task.sort_order });
    setError(''); setModal('task');
  };

  const handleSaveTask = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      if (form.id) {
        await updateTask(form.templateId, form.id, form);
      } else {
        await addTask(form.templateId, form);
      }
      setModal(null); await loadTemplates();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task');
    } finally { setSaving(false); }
  };

  const handleDeleteTask = async (template, taskId) => {
    await deleteTask(template.id, taskId).catch(() => {});
    await loadTemplates();
  };

  // ── Assignments ────────────────────────────────────────────────────────────
  const openAssign = () => { setForm({ userId: '', templateId: '' }); setError(''); setModal('assign'); };

  const handleAssign = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try {
      await assign(Number(form.userId), Number(form.templateId));
      setModal(null); await loadAssignments();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to assign');
    } finally { setSaving(false); }
  };

  const handleRemove = async (id) => {
    if (!window.confirm('Remove this assignment?')) return;
    await removeAssignment(id).catch(() => {});
    await loadAssignments();
  };

  const activeTemplates = templates.filter(t => t.is_active);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Onboarding</h1>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-white dark:border-gray-600 dark:border-b-gray-800 -mb-px'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
            }`}
          >{t}</button>
        ))}
      </div>

      {/* ── Templates tab ── */}
      {tab === 'Templates' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openNewTemplate}>+ New Template</Button>
          </div>

          <div className="space-y-4">
            {templates.map(t => (
              <div key={t.id} className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
                {/* Template header */}
                <div
                  className="flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750"
                  onClick={() => setSelected(selected?.id === t.id ? null : t)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${t.is_active ? 'bg-green-400' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{t.name}</p>
                      {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{t.tasks.length} tasks</span>
                    <button onClick={e => { e.stopPropagation(); openEditTemplate(t); }}
                      className="text-xs text-blue-600 hover:underline">Edit</button>
                    <button onClick={e => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                      className="text-xs text-red-500 hover:underline">Delete</button>
                    <svg className={`w-4 h-4 text-gray-400 transition-transform ${selected?.id === t.id ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Expanded tasks */}
                {selected?.id === t.id && (
                  <div className="border-t border-gray-100 dark:border-gray-700">
                    {t.tasks.map((task, idx) => (
                      <div key={task.id} className="flex items-start justify-between px-5 py-3 hover:bg-gray-50 dark:hover:bg-gray-750 border-b border-gray-50 dark:border-gray-700 last:border-0">
                        <div className="flex items-start gap-3">
                          <span className="text-xs text-gray-400 w-5 mt-0.5">{idx + 1}.</span>
                          <div>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{task.title}</p>
                            {task.description && <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>}
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4 shrink-0">
                          <button onClick={() => openEditTask(t, task)} className="text-xs text-blue-600 hover:underline">Edit</button>
                          <button onClick={() => handleDeleteTask(t, task.id)} className="text-xs text-red-500 hover:underline">Delete</button>
                        </div>
                      </div>
                    ))}
                    <div className="px-5 py-3">
                      <button onClick={() => openNewTask(t)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline">+ Add task</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {!templates.length && (
              <p className="text-center text-gray-400 text-sm py-12">No templates yet. Create one to get started.</p>
            )}
          </div>
        </div>
      )}

      {/* ── Assignments tab ── */}
      {tab === 'Assignments' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button onClick={openAssign}>+ Assign Checklist</Button>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Template</th>
                  <th className="px-4 py-3 text-left">Progress</th>
                  <th className="px-4 py-3 text-left">Assigned</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {assignments.map(a => {
                  const pct = a.total_tasks > 0 ? Math.round((a.completed_tasks / a.total_tasks) * 100) : 0;
                  return (
                    <tr key={a.id} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar url={a.avatar_url} name={a.employee_name} />
                          <div>
                            <p className="font-medium text-gray-900 dark:text-white">{a.employee_name}</p>
                            <p className="text-xs text-gray-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{a.template_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${pct === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500">{a.completed_tasks}/{a.total_tasks}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{new Date(a.assigned_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleRemove(a.id)} className="text-xs text-red-500 hover:underline">Remove</button>
                      </td>
                    </tr>
                  );
                })}
                {!assignments.length && (
                  <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-gray-400">No assignments yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Template modal ── */}
      {modal === 'template' && (
        <Modal title={form.id ? 'Edit Template' : 'New Template'} onClose={() => setModal(null)}>
          <form onSubmit={handleSaveTemplate} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
              <input required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.name || ''} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
              <textarea rows={3} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            {form.id && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.is_active ?? true}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
                Active
              </label>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Task modal ── */}
      {modal === 'task' && (
        <Modal title={form.id ? 'Edit Task' : 'Add Task'} onClose={() => setModal(null)}>
          <form onSubmit={handleSaveTask} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Title</label>
              <input required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.title || ''} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description (optional)</label>
              <textarea rows={2} className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Order</label>
              <input type="number" min={0} className="w-24 border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.sort_order ?? 0} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Assign modal ── */}
      {modal === 'assign' && (
        <Modal title="Assign Onboarding Checklist" onClose={() => setModal(null)}>
          <form onSubmit={handleAssign} className="space-y-4">
            {error && <p className="text-sm text-red-600">{error}</p>}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employee</label>
              <select required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))}>
                <option value="">Select employee…</option>
                {users.filter(u => u.role === 'employee' && u.isActive).map(u => (
                  <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Template</label>
              <select required className="w-full border rounded-lg px-3 py-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                value={form.templateId} onChange={e => setForm(f => ({ ...f, templateId: e.target.value }))}>
                <option value="">Select template…</option>
                {activeTemplates.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.tasks.length} tasks)</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? 'Assigning…' : 'Assign'}</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
