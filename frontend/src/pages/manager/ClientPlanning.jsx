import React, { useEffect, useState } from 'react';
import {
  listClients, createClient, updateClient, deleteClient,
  getClientAllocations, addAllocation, updateAllocation, deleteAllocation,
  getSquadOverview,
} from '../../api/clientApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const emptyClientForm = { name: '', description: '', contactName: '', contactEmail: '' };

const GRADE_STYLES = {
  A: 'bg-green-100 text-green-700 border-green-300',
  B: 'bg-blue-100 text-blue-700 border-blue-300',
  C: 'bg-amber-100 text-amber-700 border-amber-300',
};

function GradeBadge({ grade, size = 'sm' }) {
  if (!grade) return null;
  return (
    <span className={`border font-bold rounded px-1.5 py-0.5 ${size === 'xs' ? 'text-[10px]' : 'text-xs'} ${GRADE_STYLES[grade]}`}>
      {grade}
    </span>
  );
}

function GradePicker({ value, onChange }) {
  return (
    <div className="flex gap-2">
      {['A', 'B', 'C'].map(g => (
        <button
          key={g}
          type="button"
          onClick={() => onChange(value === g ? '' : g)}
          className={`w-10 h-10 rounded-lg border-2 font-bold text-sm transition-colors ${
            value === g
              ? `${GRADE_STYLES[g]} border-current`
              : 'border-gray-200 text-gray-400 hover:border-gray-300'
          }`}
        >
          {g}
        </button>
      ))}
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-xs text-gray-400 hover:text-gray-600 ml-1 self-center">
          Clear
        </button>
      )}
    </div>
  );
}

function AllocationBar({ total }) {
  const pct = Math.min(total, 100);
  const color = total > 100 ? 'bg-red-500' : total === 100 ? 'bg-green-500' : total >= 80 ? 'bg-yellow-400' : 'bg-blue-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-semibold w-10 text-right ${total > 100 ? 'text-red-600' : 'text-gray-700'}`}>
        {total}%
      </span>
    </div>
  );
}

export default function ClientPlanning() {
  const [tab, setTab] = useState('clients'); // 'clients' | 'overview'
  const [clients, setClients] = useState([]);
  const [overview, setOverview] = useState([]);
  const [selectedClient, setSelectedClient] = useState(null);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(false);

  // Client modal
  const [clientModal, setClientModal] = useState(null); // null | 'create' | 'edit'
  const [clientForm, setClientForm] = useState(emptyClientForm);
  const [editTarget, setEditTarget] = useState(null);

  // Allocation modal
  const [allocModal, setAllocModal] = useState(false);
  const [allocForm, setAllocForm] = useState({ userId: '', percentage: '', grade: '', startDate: '', endDate: '', notes: '' });
  const [editAllocModal, setEditAllocModal] = useState(null);
  const [editAllocForm, setEditAllocForm] = useState({ percentage: '', grade: '', startDate: '', endDate: '', notes: '' });

  // Squad members (from overview) for the allocation picker
  const squadMembers = overview.map(m => ({ id: m.id, name: m.name, email: m.email }));

  const loadClients = () => listClients().then(setClients).catch(() => {});
  const loadOverview = () => getSquadOverview().then(setOverview).catch(() => {});

  useEffect(() => {
    loadClients();
    loadOverview();
  }, []);

  const loadAllocations = async (clientId) => {
    const data = await getClientAllocations(clientId);
    setAllocations(data);
  };

  const selectClient = async (client) => {
    setSelectedClient(client);
    await loadAllocations(client.id);
  };

  // ── Client CRUD ──────────────────────────────────────────────────────────

  const openCreateClient = () => {
    setClientForm(emptyClientForm);
    setEditTarget(null);
    setClientModal('create');
  };

  const openEditClient = (c) => {
    setClientForm({ name: c.name, description: c.description || '', contactName: c.contact_name || '', contactEmail: c.contact_email || '' });
    setEditTarget(c);
    setClientModal('edit');
  };

  const handleSaveClient = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (clientModal === 'create') {
        await createClient(clientForm);
      } else {
        await updateClient(editTarget.id, clientForm);
        if (selectedClient?.id === editTarget.id) {
          setSelectedClient(prev => ({ ...prev, ...clientForm, name: clientForm.name }));
        }
      }
      setClientModal(null);
      await loadClients();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save client');
    } finally { setLoading(false); }
  };

  const handleDeleteClient = async (id) => {
    if (!window.confirm('Deactivate this client? Allocations will be removed.')) return;
    await deleteClient(id);
    if (selectedClient?.id === id) setSelectedClient(null);
    await loadClients();
  };

  // ── Allocation CRUD ──────────────────────────────────────────────────────

  const handleAddAllocation = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addAllocation(selectedClient.id, {
        userId: parseInt(allocForm.userId),
        percentage: parseInt(allocForm.percentage),
        grade: allocForm.grade || undefined,
        startDate: allocForm.startDate || undefined,
        endDate: allocForm.endDate || undefined,
        notes: allocForm.notes || undefined,
      });
      setAllocModal(false);
      setAllocForm({ userId: '', percentage: '', grade: '', startDate: '', endDate: '', notes: '' });
      await loadAllocations(selectedClient.id);
      await loadOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add allocation');
    } finally { setLoading(false); }
  };

  const openEditAlloc = (a) => {
    setEditAllocForm({
      percentage: a.percentage,
      grade: a.grade || '',
      startDate: a.start_date?.slice(0, 10) || '',
      endDate: a.end_date?.slice(0, 10) || '',
      notes: a.notes || '',
    });
    setEditAllocModal(a);
  };

  const handleEditAlloc = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateAllocation(editAllocModal.id, {
        percentage: parseInt(editAllocForm.percentage),
        grade: editAllocForm.grade || null,
        startDate: editAllocForm.startDate || null,
        endDate: editAllocForm.endDate || null,
        notes: editAllocForm.notes || undefined,
      });
      setEditAllocModal(null);
      await loadAllocations(selectedClient.id);
      await loadOverview();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update');
    } finally { setLoading(false); }
  };

  const handleRemoveAlloc = async (id) => {
    if (!window.confirm('Remove this allocation?')) return;
    await deleteAllocation(id);
    await loadAllocations(selectedClient.id);
    await loadOverview();
  };

  // Already-allocated user IDs for this client (to exclude from picker)
  const allocatedIds = new Set(allocations.map(a => a.user_id));

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Client Planning</h1>
      <p className="text-gray-500 text-sm mb-6">Assign team members to clients with percentage allocation.</p>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200">
        {['clients', 'overview'].map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'clients' ? 'Clients & Allocations' : 'Team Overview'}
          </button>
        ))}
      </div>

      {/* ── CLIENTS TAB ── */}
      {tab === 'clients' && (
        <div className="flex gap-6">
          {/* Client list */}
          <div className="w-72 flex-shrink-0">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-semibold text-gray-700 text-sm">Clients</h2>
              <Button onClick={openCreateClient} className="py-1 px-3 text-xs">+ Add</Button>
            </div>
            <div className="space-y-2">
              {clients.length === 0 && (
                <p className="text-sm text-gray-400 py-4 text-center">No clients yet.</p>
              )}
              {clients.map(c => (
                <div
                  key={c.id}
                  onClick={() => selectClient(c)}
                  className={`p-3 rounded-xl border cursor-pointer transition-colors ${selectedClient?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
                >
                  <div className="font-medium text-sm text-gray-800">{c.name}</div>
                  {c.contact_name && <div className="text-xs text-gray-400 mt-0.5">{c.contact_name}</div>}
                </div>
              ))}
            </div>
          </div>

          {/* Allocation panel */}
          <div className="flex-1">
            {!selectedClient ? (
              <div className="flex items-center justify-center h-48 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-xl">
                Select a client to manage allocations
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between p-5 border-b border-gray-100">
                  <div>
                    <h2 className="font-semibold text-gray-800">{selectedClient.name}</h2>
                    {selectedClient.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{selectedClient.description}</p>
                    )}
                    {selectedClient.contact_name && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Contact: {selectedClient.contact_name}
                        {selectedClient.contact_email && ` · ${selectedClient.contact_email}`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEditClient(selectedClient)}>Edit</Button>
                    <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDeleteClient(selectedClient.id)}>Deactivate</Button>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-medium text-sm text-gray-700">Allocated Team Members</h3>
                    <Button className="py-1 px-3 text-xs" onClick={() => { setAllocForm({ userId: '', percentage: '', startDate: '', endDate: '', notes: '' }); setAllocModal(true); }}>
                      + Assign Member
                    </Button>
                  </div>

                  {allocations.length === 0 ? (
                    <p className="text-sm text-gray-400 py-6 text-center">No team members allocated to this client yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {allocations.map(a => (
                        <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 border border-gray-100">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-gray-800">{a.first_name} {a.last_name}</span>
                              {a.grade && <GradeBadge grade={a.grade} />}
                              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">{a.percentage}%</span>
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              {a.email}
                              {a.start_date && ` · From ${a.start_date.slice(0, 10)}`}
                              {a.end_date && ` to ${a.end_date.slice(0, 10)}`}
                            </div>
                            {a.notes && <div className="text-xs text-gray-400 italic mt-0.5">{a.notes}</div>}
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => openEditAlloc(a)}
                              className="text-xs text-blue-600 hover:underline px-2">Edit</button>
                            <button onClick={() => handleRemoveAlloc(a.id)}
                              className="text-xs text-red-500 hover:underline px-2">Remove</button>
                          </div>
                        </div>
                      ))}
                      <div className="text-xs text-gray-400 text-right pt-1">
                        Total allocated: <strong>{allocations.reduce((s, a) => s + Number(a.percentage), 0)}%</strong> across {allocations.length} member{allocations.length !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── OVERVIEW TAB ── */}
      {tab === 'overview' && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Total allocation per team member across all active clients. Over 100% means over-allocated.
          </p>
          {overview.length === 0 ? (
            <p className="text-gray-400 text-sm">No team members found.</p>
          ) : (
            <div className="space-y-4">
              {overview.map(member => (
                <div key={member.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex-1">
                      <span className="font-semibold text-gray-800">{member.name}</span>
                      <span className="text-xs text-gray-400 ml-2">{member.email}</span>
                    </div>
                    {member.totalPercentage > 100 && (
                      <span className="text-xs bg-red-100 text-red-700 font-semibold px-2 py-0.5 rounded-full">Over-allocated</span>
                    )}
                    {member.totalPercentage === 0 && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Unallocated</span>
                    )}
                  </div>
                  <AllocationBar total={member.totalPercentage} />
                  {member.allocations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {member.allocations.map(a => (
                        <span key={a.id} className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 text-xs px-2 py-1 rounded-full">
                          {a.client_name}
                          {a.grade && <GradeBadge grade={a.grade} size="xs" />}
                          <strong>{a.percentage}%</strong>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Client Modal ── */}
      <Modal open={!!clientModal} onClose={() => setClientModal(null)}
        title={clientModal === 'create' ? 'Add Client' : `Edit: ${editTarget?.name}`}>
        <form onSubmit={handleSaveClient} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Client Name *</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={clientForm.description} onChange={e => setClientForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={clientForm.contactName} onChange={e => setClientForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={clientForm.contactEmail} onChange={e => setClientForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setClientModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      {/* ── Add Allocation Modal ── */}
      <Modal open={allocModal} onClose={() => setAllocModal(false)} title={`Assign to: ${selectedClient?.name}`}>
        <form onSubmit={handleAddAllocation} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Team Member *</label>
            <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={allocForm.userId} onChange={e => setAllocForm(f => ({ ...f, userId: e.target.value }))}>
              <option value="">Select team member...</option>
              {squadMembers
                .filter(m => !allocatedIds.has(m.id))
                .map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {squadMembers.filter(m => !allocatedIds.has(m.id)).length === 0 && (
              <p className="text-xs text-gray-400 mt-1">All team members are already allocated to this client.</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Allocation % *</label>
              <div className="flex items-center gap-2">
                <input required type="number" min={1} max={100} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={allocForm.percentage} onChange={e => setAllocForm(f => ({ ...f, percentage: e.target.value }))} />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grade</label>
              <GradePicker value={allocForm.grade} onChange={g => setAllocForm(f => ({ ...f, grade: g }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={allocForm.startDate} onChange={e => setAllocForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={allocForm.endDate} onChange={e => setAllocForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={allocForm.notes} onChange={e => setAllocForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setAllocModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Assign</Button>
          </div>
        </form>
      </Modal>

      {/* ── Edit Allocation Modal ── */}
      <Modal open={!!editAllocModal} onClose={() => setEditAllocModal(null)}
        title={`Edit: ${editAllocModal?.first_name} ${editAllocModal?.last_name}`}>
        <form onSubmit={handleEditAlloc} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Allocation % *</label>
              <div className="flex items-center gap-2">
                <input required type="number" min={1} max={100} className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={editAllocForm.percentage} onChange={e => setEditAllocForm(f => ({ ...f, percentage: e.target.value }))} />
                <span className="text-sm text-gray-500">%</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Grade</label>
              <GradePicker value={editAllocForm.grade} onChange={g => setEditAllocForm(f => ({ ...f, grade: g }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={editAllocForm.startDate} onChange={e => setEditAllocForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={editAllocForm.endDate} onChange={e => setEditAllocForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={editAllocForm.notes} onChange={e => setEditAllocForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setEditAllocModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
