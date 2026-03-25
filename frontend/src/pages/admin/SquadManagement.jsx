import React, { useEffect, useState } from 'react';
import { listSquads, createSquad, updateSquad, deleteSquad, getSquad, addMember, removeMember, listManagers, getUnassigned } from '../../api/squadApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { name: '', managerId: '' };

export default function AdminSquadManagement() {
  const [squads, setSquads] = useState([]);
  const [managers, setManagers] = useState([]);
  const [modal, setModal] = useState(null); // null | 'create' | 'edit' | 'members'
  const [form, setForm] = useState(emptyForm);
  const [target, setTarget] = useState(null);
  const [membersSquad, setMembersSquad] = useState(null); // full squad with members
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [error, setError] = useState('');

  const loadList = () =>
    Promise.all([listSquads(), listManagers()])
      .then(([s, m]) => { setSquads(s); setManagers(m); })
      .catch(() => {});

  useEffect(() => { loadList(); }, []);

  const openCreate = () => { setForm(emptyForm); setError(''); setModal('create'); };

  const openEdit = (squad) => {
    setTarget(squad);
    setForm({ name: squad.name, managerId: squad.manager_id });
    setError('');
    setModal('edit');
  };

  const openMembers = async (squad) => {
    setMembersLoading(true);
    setModal('members');
    try {
      const [full, unass] = await Promise.all([getSquad(squad.id), getUnassigned()]);
      setMembersSquad(full);
      setUnassigned(unass);
    } catch { /* ignore */ }
    finally { setMembersLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await createSquad({ name: form.name, managerId: parseInt(form.managerId) });
      setModal(null);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create squad');
    } finally { setLoading(false); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await updateSquad(target.id, { name: form.name, managerId: parseInt(form.managerId) });
      setModal(null);
      await loadList();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update squad');
    } finally { setLoading(false); }
  };

  const handleDelete = async (squad) => {
    if (!window.confirm(`Delete squad "${squad.name}"? Members will be unassigned.`)) return;
    try {
      await deleteSquad(squad.id);
      await loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete squad');
    }
  };

  const handleAddMember = async (userId) => {
    if (!membersSquad) return;
    setMembersLoading(true);
    try {
      await addMember(membersSquad.id, userId);
      const [full, unass] = await Promise.all([getSquad(membersSquad.id), getUnassigned()]);
      setMembersSquad(full);
      setUnassigned(unass);
      await loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add member');
    } finally { setMembersLoading(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member from the squad?')) return;
    setMembersLoading(true);
    try {
      await removeMember(membersSquad.id, userId);
      const [full, unass] = await Promise.all([getSquad(membersSquad.id), getUnassigned()]);
      setMembersSquad(full);
      setUnassigned(unass);
      await loadList();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member');
    } finally { setMembersLoading(false); }
  };

  const SquadForm = ({ onSubmit }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <p className="text-sm text-red-500">{error}</p>}
      <div>
        <label className="block text-sm font-medium mb-1">Squad Name</label>
        <input
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Squad Lead (Manager)</label>
        <select
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={form.managerId}
          onChange={e => setForm(f => ({ ...f, managerId: e.target.value }))}
        >
          <option value="">Select a manager...</option>
          {managers.map(m => (
            <option key={m.id} value={m.id}>
              {m.first_name} {m.last_name} ({m.email})
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end pt-1">
        <Button variant="secondary" type="button" onClick={() => setModal(null)}>Cancel</Button>
        <Button type="submit" loading={loading}>Save</Button>
      </div>
    </form>
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Squad Management</h1>
        <Button onClick={openCreate}>+ New Squad</Button>
      </div>

      {squads.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p>No squads yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">Squad Name</th>
                <th className="text-left p-4 font-medium text-gray-600">Squad Lead</th>
                <th className="text-left p-4 font-medium text-gray-600">Members</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {squads.map(squad => (
                <tr key={squad.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4 font-medium">{squad.name}</td>
                  <td className="p-4 text-gray-600">{squad.manager_name}</td>
                  <td className="p-4">
                    <span className="inline-flex items-center gap-1">
                      <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-0.5 rounded-full">
                        {squad.member_count} member{squad.member_count != 1 ? 's' : ''}
                      </span>
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-end">
                      <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openMembers(squad)}>
                        Members
                      </Button>
                      <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEdit(squad)}>
                        Edit
                      </Button>
                      <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDelete(squad)}>
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      <Modal open={modal === 'create'} onClose={() => setModal(null)} title="Create Squad">
        <SquadForm onSubmit={handleCreate} />
      </Modal>

      {/* Edit Modal */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={`Edit: ${target?.name}`}>
        <SquadForm onSubmit={handleUpdate} />
      </Modal>

      {/* Members Modal */}
      <Modal open={modal === 'members'} onClose={() => setModal(null)} title={`${membersSquad?.name || 'Squad'} — Members`}>
        {membersLoading && !membersSquad ? (
          <p className="text-sm text-gray-400 py-4 text-center">Loading...</p>
        ) : (
          <div className="space-y-5">
            {/* Current members */}
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Current Members ({membersSquad?.members?.length ?? 0})
              </h3>
              {!membersSquad?.members?.length ? (
                <p className="text-sm text-gray-400">No members yet.</p>
              ) : (
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {membersSquad.members.map(m => (
                    <div key={m.id} className="flex justify-between items-center py-2 px-1 border-b last:border-0">
                      <div>
                        <span className="font-medium text-sm">{m.first_name} {m.last_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{m.email}</span>
                      </div>
                      <Button
                        variant="danger"
                        className="py-0.5 px-2 text-xs"
                        onClick={() => handleRemoveMember(m.id)}
                        loading={membersLoading}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Unassigned employees */}
            {unassigned.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Unassigned Employees</h3>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {unassigned.map(u => (
                    <div key={u.id} className="flex justify-between items-center py-2 px-1 border-b last:border-0">
                      <div>
                        <span className="font-medium text-sm">{u.first_name} {u.last_name}</span>
                        <span className="text-xs text-gray-400 ml-2">{u.email}</span>
                      </div>
                      <Button
                        className="py-0.5 px-2 text-xs"
                        onClick={() => handleAddMember(u.id)}
                        loading={membersLoading}
                      >
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-1">
              <Button variant="secondary" onClick={() => setModal(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
