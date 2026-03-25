import React, { useEffect, useState } from 'react';
import { getMySquad, addMember, removeMember, getUnassigned } from '../../api/squadApi';
import { createUser } from '../../api/adminApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyForm = { email: '', password: '', firstName: '', lastName: '' };

export default function SquadManagement() {
  const [squad, setSquad] = useState(null);
  const [unassigned, setUnassigned] = useState([]);
  const [loading, setLoading] = useState(false);
  const [createModal, setCreateModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const load = async () => {
    const [s, u] = await Promise.all([getMySquad(), getUnassigned()]);
    setSquad(s);
    setUnassigned(u);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async (userId) => {
    if (!squad) return alert('You do not have a squad assigned. Ask an admin to create one for you.');
    setLoading(true);
    try { await addMember(squad.id, userId); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to add member'); }
    finally { setLoading(false); }
  };

  const handleRemove = async (userId) => {
    if (!window.confirm('Remove this member from your squad?')) return;
    setLoading(true);
    try { await removeMember(squad.id, userId); await load(); }
    catch (err) { alert(err.response?.data?.error || 'Failed to remove member'); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const newUser = await createUser({ ...form, role: 'employee' });
      setCreateModal(false);
      setForm(emptyForm);
      // If manager has a squad, immediately add the new employee to it
      if (squad) {
        try { await addMember(squad.id, newUser.id); }
        catch { /* squad add is best-effort */ }
      }
      await load();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create employee');
    } finally { setCreating(false); }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">My Squad</h1>
        <Button onClick={() => { setCreateModal(true); setCreateError(''); setForm(emptyForm); }}>
          + New Employee
        </Button>
      </div>

      {!squad ? (
        <div className="text-center py-16 text-gray-400">
          <p>No squad assigned yet. Contact an administrator.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Current members */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold mb-4">Squad: {squad.name}</h2>
            {squad.members?.length === 0 ? (
              <p className="text-sm text-gray-400">No members yet. Add employees from the right panel.</p>
            ) : (
              <div className="space-y-2">
                {squad.members.map(m => (
                  <div key={m.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{m.first_name} {m.last_name}</div>
                      <div className="text-xs text-gray-400">{m.email}</div>
                    </div>
                    <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleRemove(m.id)} loading={loading}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Unassigned employees */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-semibold mb-4">Unassigned Employees</h2>
            {unassigned.length === 0 ? (
              <p className="text-sm text-gray-400">All employees are assigned to squads.</p>
            ) : (
              <div className="space-y-2">
                {unassigned.map(u => (
                  <div key={u.id} className="flex justify-between items-center py-2 border-b last:border-0">
                    <div>
                      <div className="font-medium text-sm">{u.first_name} {u.last_name}</div>
                      <div className="text-xs text-gray-400">{u.email}</div>
                    </div>
                    <Button className="py-1 px-2 text-xs" onClick={() => handleAdd(u.id)} loading={loading}>
                      Add to Squad
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Create Employee Modal */}
      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create New Employee">
        <form onSubmit={handleCreate} className="space-y-3">
          {createError && <p className="text-sm text-red-500">{createError}</p>}
          {[
            { key: 'firstName', label: 'First Name' },
            { key: 'lastName', label: 'Last Name' },
            { key: 'email', label: 'Email', type: 'email' },
            { key: 'password', label: 'Password', type: 'password' },
          ].map(({ key, label, type = 'text' }) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input
                required
                type={type}
                minLength={key === 'password' ? 8 : undefined}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <p className="text-xs text-gray-400">The new employee will be created with the Employee role{squad ? ' and added to your squad automatically' : ''}.</p>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Employee</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
