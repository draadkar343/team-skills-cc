import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import {
  listClients, createClient, updateClient, deleteClient,
  getClientAllocations,
  getClientSystems, addClientSystem, updateClientSystem, deleteClientSystem,
  getClientRoadmap, addRoadmapItem, updateRoadmapItem, deleteRoadmapItem,
  getClientContracts, addContract, updateContract, deleteContract,
} from '../api/clientApi';

const CONTRACT_TYPES = [
  { value: 'fixed_price',   label: 'Fixed Price' },
  { value: 'time_material', label: 'Time & Materials' },
  { value: 'retainer',      label: 'Retainer' },
  { value: 'sla',           label: 'SLA' },
  { value: 'other',         label: 'Other' },
];

const STATUS_STYLES = {
  // roadmap
  planned:     'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
  // contracts
  draft:       'bg-gray-100 text-gray-500',
  active:      'bg-green-100 text-green-700',
  expired:     'bg-red-100 text-red-600',
  terminated:  'bg-red-100 text-red-600',
  // systems env
  production:  'bg-blue-100 text-blue-700',
  staging:     'bg-purple-100 text-purple-700',
  development: 'bg-gray-100 text-gray-500',
  uat:         'bg-indigo-100 text-indigo-700',
  // systems status
  deprecated:  'bg-amber-100 text-amber-700',
  end_of_life: 'bg-red-100 text-red-600',
};

const PRIORITY_STYLES = {
  high:   'bg-red-100 text-red-700',
  medium: 'bg-amber-100 text-amber-700',
  low:    'bg-gray-100 text-gray-500',
};

function Pill({ value, styleMap }) {
  const cls = styleMap?.[value] || 'bg-gray-100 text-gray-500';
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${cls}`}>
      {value?.replace(/_/g, ' ')}
    </span>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value || <span className="text-gray-400 italic">—</span>}</p>
    </div>
  );
}

const BLANK_CLIENT   = { name: '', description: '', contactName: '', contactEmail: '' };
const BLANK_SYSTEM   = { name: '', version: '', vendor: '', environment: 'production', status: 'active', supportExpiry: '', description: '', notes: '' };
const BLANK_ROADMAP  = { title: '', description: '', targetDate: '', status: 'planned', priority: 'medium' };
const BLANK_CONTRACT = { title: '', contractNumber: '', type: '', startDate: '', endDate: '', value: '', currency: 'USD', status: 'active', description: '', notes: '' };

export default function ClientsPage() {
  const { user } = useAuth();

  const [clients, setClients]       = useState([]);
  const [selected, setSelected]     = useState(null);
  const [tab, setTab]               = useState('overview');
  const [search, setSearch]         = useState('');
  const [loading, setLoading]       = useState(false);

  const [allocations, setAllocations] = useState([]);
  const [systems, setSystems]         = useState([]);
  const [roadmap, setRoadmap]         = useState([]);
  const [contracts, setContracts]     = useState([]);

  // Client modal
  const [clientModal, setClientModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [clientForm, setClientForm]   = useState(BLANK_CLIENT);

  // System modal
  const [systemModal, setSystemModal]   = useState(false);
  const [editingSystem, setEditingSystem] = useState(null);
  const [systemForm, setSystemForm]     = useState(BLANK_SYSTEM);

  // Roadmap modal
  const [roadmapModal, setRoadmapModal]   = useState(false);
  const [editingRoadmap, setEditingRoadmap] = useState(null);
  const [roadmapForm, setRoadmapForm]     = useState(BLANK_ROADMAP);

  // Contract modal
  const [contractModal, setContractModal]   = useState(false);
  const [editingContract, setEditingContract] = useState(null);
  const [contractForm, setContractForm]     = useState(BLANK_CONTRACT);

  const canManage = user?.role === 'administrator' ||
    (user?.role === 'manager' && selected?.created_by === user?.id);

  // ── Load ────────────────────────────────────────────────────────────────

  const loadClients = () => listClients().then(setClients).catch(() => {});

  const loadDetails = async (clientId) => {
    const [allocs, sys, road, contr] = await Promise.all([
      getClientAllocations(clientId).catch(() => []),
      getClientSystems(clientId).catch(() => []),
      getClientRoadmap(clientId).catch(() => []),
      getClientContracts(clientId).catch(() => []),
    ]);
    setAllocations(allocs);
    setSystems(sys);
    setRoadmap(road);
    setContracts(contr);
  };

  useEffect(() => { loadClients(); }, []);

  const selectClient = (client) => {
    setSelected(client);
    setTab('overview');
    loadDetails(client.id);
  };

  // ── Client CRUD ─────────────────────────────────────────────────────────

  const openNewClient = () => {
    setEditingClient(null);
    setClientForm(BLANK_CLIENT);
    setClientModal(true);
  };

  const openEditClient = (c) => {
    setEditingClient(c);
    setClientForm({ name: c.name, description: c.description || '', contactName: c.contact_name || '', contactEmail: c.contact_email || '' });
    setClientModal(true);
  };

  const saveClient = async () => {
    setLoading(true);
    try {
      const payload = { name: clientForm.name, description: clientForm.description, contactName: clientForm.contactName, contactEmail: clientForm.contactEmail };
      if (editingClient) {
        const updated = await updateClient(editingClient.id, payload);
        setSelected(prev => prev?.id === updated.id ? { ...prev, ...updated } : prev);
      } else {
        await createClient(payload);
      }
      await loadClients();
      setClientModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save client'); }
    finally { setLoading(false); }
  };

  const deactivateClient = async (c) => {
    if (!window.confirm(`Deactivate "${c.name}"?`)) return;
    await deleteClient(c.id);
    await loadClients();
    if (selected?.id === c.id) setSelected(null);
  };

  // ── System CRUD ─────────────────────────────────────────────────────────

  const openNewSystem = () => { setEditingSystem(null); setSystemForm(BLANK_SYSTEM); setSystemModal(true); };
  const openEditSystem = (s) => {
    setEditingSystem(s);
    setSystemForm({ name: s.name, version: s.version, vendor: s.vendor || '', environment: s.environment, status: s.status, supportExpiry: s.support_expiry?.slice(0, 10) || '', description: s.description || '', notes: s.notes || '' });
    setSystemModal(true);
  };

  const saveSystem = async () => {
    setLoading(true);
    try {
      const payload = { ...systemForm, supportExpiry: systemForm.supportExpiry || undefined };
      if (editingSystem) {
        await updateClientSystem(editingSystem.id, payload);
      } else {
        await addClientSystem(selected.id, payload);
      }
      setSystems(await getClientSystems(selected.id));
      setSystemModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save system'); }
    finally { setLoading(false); }
  };

  const removeSystem = async (id) => {
    if (!window.confirm('Remove this system?')) return;
    await deleteClientSystem(id);
    setSystems(await getClientSystems(selected.id));
  };

  // ── Roadmap CRUD ────────────────────────────────────────────────────────

  const openNewRoadmap = () => { setEditingRoadmap(null); setRoadmapForm(BLANK_ROADMAP); setRoadmapModal(true); };
  const openEditRoadmap = (r) => {
    setEditingRoadmap(r);
    setRoadmapForm({ title: r.title, description: r.description || '', targetDate: r.target_date?.slice(0, 10) || '', status: r.status, priority: r.priority });
    setRoadmapModal(true);
  };

  const saveRoadmap = async () => {
    setLoading(true);
    try {
      const payload = { ...roadmapForm, targetDate: roadmapForm.targetDate || undefined };
      if (editingRoadmap) {
        await updateRoadmapItem(editingRoadmap.id, payload);
      } else {
        await addRoadmapItem(selected.id, payload);
      }
      setRoadmap(await getClientRoadmap(selected.id));
      setRoadmapModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save roadmap item'); }
    finally { setLoading(false); }
  };

  const removeRoadmap = async (id) => {
    if (!window.confirm('Delete this roadmap item?')) return;
    await deleteRoadmapItem(id);
    setRoadmap(await getClientRoadmap(selected.id));
  };

  // ── Contract CRUD ────────────────────────────────────────────────────────

  const openNewContract = () => { setEditingContract(null); setContractForm(BLANK_CONTRACT); setContractModal(true); };
  const openEditContract = (c) => {
    setEditingContract(c);
    setContractForm({
      title: c.title, contractNumber: c.contract_number || '', type: c.type || '',
      startDate: c.start_date?.slice(0, 10) || '', endDate: c.end_date?.slice(0, 10) || '',
      value: c.value || '', currency: c.currency || 'USD', status: c.status,
      description: c.description || '', notes: c.notes || '',
    });
    setContractModal(true);
  };

  const saveContract = async () => {
    setLoading(true);
    try {
      const payload = {
        ...contractForm,
        startDate: contractForm.startDate || undefined,
        endDate: contractForm.endDate || undefined,
        value: contractForm.value ? parseFloat(contractForm.value) : undefined,
      };
      if (editingContract) {
        await updateContract(editingContract.id, payload);
      } else {
        await addContract(selected.id, payload);
      }
      setContracts(await getClientContracts(selected.id));
      setContractModal(false);
    } catch (err) { alert(err.response?.data?.error || 'Failed to save contract'); }
    finally { setLoading(false); }
  };

  const removeContract = async (id) => {
    if (!window.confirm('Delete this contract?')) return;
    await deleteContract(id);
    setContracts(await getClientContracts(selected.id));
  };

  // ── Filtered clients ────────────────────────────────────────────────────

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact_email || '').toLowerCase().includes(search.toLowerCase())
  );

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Clients</h1>
        {(user?.role === 'manager' || user?.role === 'administrator') && (
          <Button onClick={openNewClient}>+ New Client</Button>
        )}
      </div>

      <div className="flex gap-6">
        {/* Client list */}
        <div className="w-60 flex-shrink-0 space-y-2">
          <input
            type="text"
            placeholder="Search clients…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
          {filtered.length === 0 && (
            <p className="text-sm text-gray-400 pt-2">No clients found.</p>
          )}
          {filtered.map(c => (
            <div
              key={c.id}
              onClick={() => selectClient(c)}
              className={`cursor-pointer rounded-xl border p-3 shadow-sm transition-colors ${
                selected?.id === c.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:border-blue-300'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className="text-sm font-medium truncate">{c.name}</span>
              </div>
              {c.contact_email && (
                <p className="text-xs text-gray-400 mt-0.5 truncate pl-3.5">{c.contact_email}</p>
              )}
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {!selected && (
          <div className="flex-1 flex items-center justify-center text-gray-400 bg-white rounded-xl border border-gray-200">
            <p className="text-sm">Select a client to view details</p>
          </div>
        )}

        {selected && (
          <div className="flex-1 min-w-0 bg-white rounded-xl border border-gray-200 shadow-sm">
            {/* Header */}
            <div className="flex items-start justify-between p-5 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.name}</h2>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium ${selected.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {selected.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              {canManage && (
                <div className="flex gap-2">
                  <Button variant="secondary" className="py-1 px-3 text-sm" onClick={() => openEditClient(selected)}>Edit</Button>
                  <Button variant="danger" className="py-1 px-3 text-sm" onClick={() => deactivateClient(selected)}>Deactivate</Button>
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-5">
              {[
                { key: 'overview', label: 'Overview' },
                { key: 'systems',  label: 'System Landscape' },
                { key: 'roadmap',  label: 'Roadmap' },
                { key: 'contracts', label: 'Contracts' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px ${
                    tab === key
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">

              {/* ── OVERVIEW ── */}
              {tab === 'overview' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Client Details</h3>
                      <Field label="Name" value={selected.name} />
                      <Field label="Description" value={selected.description} />
                      <Field label="Contact Name" value={selected.contact_name} />
                      <Field label="Contact Email" value={selected.contact_email} />
                    </div>
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Record Info</h3>
                      <Field label="Created By" value={selected.created_by_name} />
                      <Field label="Created" value={selected.created_at?.slice(0, 10)} />
                      <Field label="Last Updated" value={selected.updated_at?.slice(0, 10)} />
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Allocated Team Members</h3>
                    {allocations.length === 0 ? (
                      <p className="text-sm text-gray-400">No team members allocated.</p>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2 pr-4">Name</th>
                            <th className="pb-2 pr-4">Email</th>
                            <th className="pb-2 pr-4">Allocation</th>
                            <th className="pb-2 pr-4">Grade</th>
                            <th className="pb-2 pr-4">Start</th>
                            <th className="pb-2">End</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocations.map(a => (
                            <tr key={a.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{a.first_name} {a.last_name}</td>
                              <td className="py-2 pr-4 text-gray-500">{a.email}</td>
                              <td className="py-2 pr-4">
                                <span className="font-semibold text-blue-700">{a.percentage}%</span>
                              </td>
                              <td className="py-2 pr-4">{a.grade || '—'}</td>
                              <td className="py-2 pr-4 text-gray-500">{a.start_date?.slice(0, 10) || '—'}</td>
                              <td className="py-2 text-gray-500">{a.end_date?.slice(0, 10) || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {/* ── SYSTEM LANDSCAPE ── */}
              {tab === 'systems' && (
                <div>
                  {canManage && (
                    <div className="mb-4">
                      <Button onClick={openNewSystem}>+ Add System</Button>
                    </div>
                  )}
                  {systems.length === 0 ? (
                    <p className="text-sm text-gray-400">No systems recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2 pr-4">Name</th>
                            <th className="pb-2 pr-4">Version</th>
                            <th className="pb-2 pr-4">Vendor</th>
                            <th className="pb-2 pr-4">Environment</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2 pr-4">Support Expiry</th>
                            <th className="pb-2 pr-4">Notes</th>
                            {canManage && <th className="pb-2"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {systems.map(s => (
                            <tr key={s.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{s.name}</td>
                              <td className="py-2 pr-4">{s.version}</td>
                              <td className="py-2 pr-4 text-gray-500">{s.vendor || '—'}</td>
                              <td className="py-2 pr-4"><Pill value={s.environment} styleMap={STATUS_STYLES} /></td>
                              <td className="py-2 pr-4"><Pill value={s.status} styleMap={STATUS_STYLES} /></td>
                              <td className="py-2 pr-4 text-gray-500">{s.support_expiry?.slice(0, 10) || '—'}</td>
                              <td className="py-2 pr-4 text-gray-500 max-w-xs truncate">{s.notes || '—'}</td>
                              {canManage && (
                                <td className="py-2 whitespace-nowrap">
                                  <button className="text-blue-500 hover:text-blue-700 text-xs mr-3" onClick={() => openEditSystem(s)}>Edit</button>
                                  <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => removeSystem(s.id)}>Remove</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* ── ROADMAP ── */}
              {tab === 'roadmap' && (
                <div>
                  {canManage && (
                    <div className="mb-4">
                      <Button onClick={openNewRoadmap}>+ Add Item</Button>
                    </div>
                  )}
                  {roadmap.length === 0 ? (
                    <p className="text-sm text-gray-400">No roadmap items yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {roadmap.map(r => (
                        <div key={r.id} className="border border-gray-200 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <span className="font-semibold text-gray-900">{r.title}</span>
                                <Pill value={r.priority} styleMap={PRIORITY_STYLES} />
                                <Pill value={r.status} styleMap={STATUS_STYLES} />
                              </div>
                              {r.description && (
                                <p className="text-sm text-gray-500 mt-1">{r.description}</p>
                              )}
                              {r.target_date && (
                                <p className="text-xs text-gray-400 mt-2">Target: {r.target_date.slice(0, 10)}</p>
                              )}
                            </div>
                            {canManage && (
                              <div className="flex gap-2 flex-shrink-0">
                                <button className="text-blue-500 hover:text-blue-700 text-xs" onClick={() => openEditRoadmap(r)}>Edit</button>
                                <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => removeRoadmap(r.id)}>Delete</button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ── CONTRACTS ── */}
              {tab === 'contracts' && (
                <div>
                  {canManage && (
                    <div className="mb-4">
                      <Button onClick={openNewContract}>+ Add Contract</Button>
                    </div>
                  )}
                  {contracts.length === 0 ? (
                    <p className="text-sm text-gray-400">No contracts recorded.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-gray-500 border-b">
                            <th className="pb-2 pr-4">Title</th>
                            <th className="pb-2 pr-4">Contract #</th>
                            <th className="pb-2 pr-4">Type</th>
                            <th className="pb-2 pr-4">Status</th>
                            <th className="pb-2 pr-4">Start</th>
                            <th className="pb-2 pr-4">End</th>
                            <th className="pb-2 pr-4">Value</th>
                            {canManage && <th className="pb-2"></th>}
                          </tr>
                        </thead>
                        <tbody>
                          {contracts.map(c => (
                            <tr key={c.id} className="border-b last:border-0">
                              <td className="py-2 pr-4 font-medium">{c.title}</td>
                              <td className="py-2 pr-4 text-gray-500">{c.contract_number || '—'}</td>
                              <td className="py-2 pr-4 text-gray-500 capitalize">{c.type?.replace(/_/g, ' ') || '—'}</td>
                              <td className="py-2 pr-4"><Pill value={c.status} styleMap={STATUS_STYLES} /></td>
                              <td className="py-2 pr-4 text-gray-500">{c.start_date?.slice(0, 10) || '—'}</td>
                              <td className="py-2 pr-4 text-gray-500">{c.end_date?.slice(0, 10) || '—'}</td>
                              <td className="py-2 pr-4 font-medium">
                                {c.value ? `${c.currency} ${Number(c.value).toLocaleString()}` : '—'}
                              </td>
                              {canManage && (
                                <td className="py-2 whitespace-nowrap">
                                  <button className="text-blue-500 hover:text-blue-700 text-xs mr-3" onClick={() => openEditContract(c)}>Edit</button>
                                  <button className="text-red-500 hover:text-red-700 text-xs" onClick={() => removeContract(c.id)}>Delete</button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        )}
      </div>

      {/* ── CLIENT MODAL ── */}
      <Modal open={clientModal} onClose={() => setClientModal(false)} title={editingClient ? 'Edit Client' : 'New Client'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={clientForm.name} onChange={e => setClientForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={clientForm.description} onChange={e => setClientForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Contact Name</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={clientForm.contactName} onChange={e => setClientForm(f => ({ ...f, contactName: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input type="email" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={clientForm.contactEmail} onChange={e => setClientForm(f => ({ ...f, contactEmail: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setClientModal(false)}>Cancel</Button>
            <Button loading={loading} onClick={saveClient} disabled={!clientForm.name.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── SYSTEM MODAL ── */}
      <Modal open={systemModal} onClose={() => setSystemModal(false)} title={editingSystem ? 'Edit System' : 'Add System'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.name} onChange={e => setSystemForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Version <span className="text-red-500">*</span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.version} onChange={e => setSystemForm(f => ({ ...f, version: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.vendor} onChange={e => setSystemForm(f => ({ ...f, vendor: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Support Expiry</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.supportExpiry} onChange={e => setSystemForm(f => ({ ...f, supportExpiry: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Environment</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.environment} onChange={e => setSystemForm(f => ({ ...f, environment: e.target.value }))}>
                <option value="production">Production</option>
                <option value="staging">Staging</option>
                <option value="uat">UAT</option>
                <option value="development">Development</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.status} onChange={e => setSystemForm(f => ({ ...f, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="deprecated">Deprecated</option>
                <option value="end_of_life">End of Life</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.description} onChange={e => setSystemForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={systemForm.notes} onChange={e => setSystemForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setSystemModal(false)}>Cancel</Button>
            <Button loading={loading} onClick={saveSystem} disabled={!systemForm.name.trim() || !systemForm.version.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── ROADMAP MODAL ── */}
      <Modal open={roadmapModal} onClose={() => setRoadmapModal(false)} title={editingRoadmap ? 'Edit Roadmap Item' : 'Add Roadmap Item'}>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roadmapForm.title} onChange={e => setRoadmapForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roadmapForm.description} onChange={e => setRoadmapForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Target Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roadmapForm.targetDate} onChange={e => setRoadmapForm(f => ({ ...f, targetDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roadmapForm.priority} onChange={e => setRoadmapForm(f => ({ ...f, priority: e.target.value }))}>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={roadmapForm.status} onChange={e => setRoadmapForm(f => ({ ...f, status: e.target.value }))}>
                <option value="planned">Planned</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setRoadmapModal(false)}>Cancel</Button>
            <Button loading={loading} onClick={saveRoadmap} disabled={!roadmapForm.title.trim()}>Save</Button>
          </div>
        </div>
      </Modal>

      {/* ── CONTRACT MODAL ── */}
      <Modal open={contractModal} onClose={() => setContractModal(false)} title={editingContract ? 'Edit Contract' : 'Add Contract'}>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Title <span className="text-red-500">*</span></label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.title} onChange={e => setContractForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Contract Number</label>
              <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.contractNumber} onChange={e => setContractForm(f => ({ ...f, contractNumber: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.type} onChange={e => setContractForm(f => ({ ...f, type: e.target.value }))}>
                <option value="">— Select —</option>
                {CONTRACT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.status} onChange={e => setContractForm(f => ({ ...f, status: e.target.value }))}>
                <option value="draft">Draft</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.startDate} onChange={e => setContractForm(f => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">End Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.endDate} onChange={e => setContractForm(f => ({ ...f, endDate: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Contract Value</label>
              <input type="number" min="0" step="0.01" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.value} onChange={e => setContractForm(f => ({ ...f, value: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Currency</label>
              <input maxLength={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase" value={contractForm.currency} onChange={e => setContractForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.description} onChange={e => setContractForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" onClick={() => setContractModal(false)}>Cancel</Button>
            <Button loading={loading} onClick={saveContract} disabled={!contractForm.title.trim()}>Save</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
