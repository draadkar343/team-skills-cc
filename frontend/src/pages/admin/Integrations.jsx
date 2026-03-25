import React, { useEffect, useState, useCallback } from 'react';
import {
  listApiKeys, createApiKey, revokeApiKey, deleteApiKey,
  listIntegrations, getIntegration, createIntegration, updateIntegration, deleteIntegration, testIntegration,
  listWebhooks, createWebhook, updateWebhook, deleteWebhook, getWebhookDeliveries,
} from '../../api/integrationsApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const ALL_SCOPES = [
  { value: 'users:read', label: 'users:read — List all users and skill/cert counts' },
  { value: 'skills:read', label: 'skills:read — List all approved employee skills' },
  { value: 'certs:read', label: 'certs:read — List all approved certifications' },
];

const ALL_EVENTS = [
  'skill.submitted', 'skill.approved', 'skill.rejected',
  'cert.submitted', 'cert.approved', 'cert.rejected',
  'user.created',
];

const AUTH_TYPES = ['none', 'api_key', 'bearer', 'basic'];

function TabBtn({ active, onClick, children }) {
  return (
    <button onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${active ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
      {children}
    </button>
  );
}

function CopyBtn({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} className="ml-2 text-xs text-blue-600 hover:underline">
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ── API KEYS TAB ────────────────────────────────────────────────────────────

function ApiKeysTab() {
  const [keys, setKeys] = useState([]);
  const [createModal, setCreateModal] = useState(false);
  const [newKeyModal, setNewKeyModal] = useState(null); // { key: '...', name: '...' }
  const [form, setForm] = useState({ name: '', description: '', scopes: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => listApiKeys().then(setKeys).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const toggleScope = (scope) =>
    setForm(f => ({ ...f, scopes: f.scopes.includes(scope) ? f.scopes.filter(s => s !== scope) : [...f.scopes, scope] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.scopes.length) return alert('Select at least one scope');
    setLoading(true);
    try {
      const result = await createApiKey(form);
      setCreateModal(false);
      setForm({ name: '', description: '', scopes: [] });
      setNewKeyModal({ key: result.key, name: result.name });
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleRevoke = async (id) => {
    if (!window.confirm('Revoke this API key? Any systems using it will lose access immediately.')) return;
    await revokeApiKey(id).catch(() => {});
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this API key permanently?')) return;
    await deleteApiKey(id).catch(() => {});
    await load();
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500">Generate API keys to allow external systems to read data from this portal.</p>
          <p className="text-xs text-gray-400 mt-1">Authenticate using the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> header on <code className="bg-gray-100 px-1 rounded">/api/v1/public/*</code> endpoints.</p>
        </div>
        <Button onClick={() => setCreateModal(true)}>+ Create API Key</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Name</th>
              <th className="text-left p-4 font-medium text-gray-600">Key</th>
              <th className="text-left p-4 font-medium text-gray-600">Scopes</th>
              <th className="text-left p-4 font-medium text-gray-600">Last Used</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {keys.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-gray-400">No API keys yet.</td></tr>}
            {keys.map(k => (
              <tr key={k.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{k.name}</div>
                  {k.description && <div className="text-xs text-gray-400">{k.description}</div>}
                </td>
                <td className="p-4 font-mono text-xs text-gray-500">{k.key_prefix}</td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap">
                    {k.scopes.map(s => <span key={s} className="text-xs bg-blue-50 text-blue-600 border border-blue-100 rounded px-1.5 py-0.5">{s}</span>)}
                  </div>
                </td>
                <td className="p-4 text-gray-400 text-xs">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}</td>
                <td className="p-4">
                  <span className={`text-xs font-medium ${k.is_active ? 'text-green-600' : 'text-red-500'}`}>
                    {k.is_active ? 'Active' : 'Revoked'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    {k.is_active && <button className="text-xs text-yellow-600 hover:underline" onClick={() => handleRevoke(k.id)}>Revoke</button>}
                    <button className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(k.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={createModal} onClose={() => setCreateModal(false)} title="Create API Key">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
            <input required type="text" placeholder="e.g. HR Dashboard Integration"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Scopes <span className="text-red-500">*</span></label>
            <div className="space-y-2">
              {ALL_SCOPES.map(s => (
                <label key={s.value} className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={form.scopes.includes(s.value)} onChange={() => toggleScope(s.value)} />
                  <span className="text-sm text-gray-700">{s.label}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setCreateModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Create Key</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!newKeyModal} onClose={() => setNewKeyModal(null)} title="API Key Created">
        <div className="space-y-4">
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
            Copy this key now — it will not be shown again.
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Your API Key</label>
            <div className="flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2">
              <code className="text-xs flex-1 break-all">{newKeyModal?.key}</code>
              <CopyBtn value={newKeyModal?.key || ''} />
            </div>
          </div>
          <p className="text-xs text-gray-500">Use the <code className="bg-gray-100 px-1 rounded">X-API-Key</code> request header to authenticate.</p>
          <div className="flex justify-end">
            <Button onClick={() => setNewKeyModal(null)}>Done</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ── EXTERNAL INTEGRATIONS TAB ───────────────────────────────────────────────

const emptyExtForm = { name: '', description: '', baseUrl: '', authType: 'none', authConfig: {} };

function ExternalTab() {
  const [integrations, setIntegrations] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [form, setForm] = useState(emptyExtForm);
  const [editForm, setEditForm] = useState(emptyExtForm);
  const [loading, setLoading] = useState(false);
  const [testResults, setTestResults] = useState({}); // { [id]: { success, statusCode, statusMessage, loading } }

  const load = useCallback(() => listIntegrations().then(setIntegrations).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createIntegration(form);
      setAddModal(false);
      setForm(emptyExtForm);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const openEdit = async (item) => {
    const full = await getIntegration(item.id);
    setEditForm({ name: full.name, description: full.description || '', baseUrl: full.base_url, authType: full.auth_type, authConfig: full.auth_config || {} });
    setEditModal(item);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateIntegration(editModal.id, editForm);
      setEditModal(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this integration?')) return;
    await deleteIntegration(id).catch(() => {});
    await load();
  };

  const handleTest = async (id) => {
    setTestResults(r => ({ ...r, [id]: { loading: true } }));
    try {
      const result = await testIntegration(id);
      setTestResults(r => ({ ...r, [id]: { ...result, loading: false } }));
    } catch {
      setTestResults(r => ({ ...r, [id]: { success: false, statusMessage: 'Request failed', loading: false } }));
    }
  };

  const AuthConfigFields = ({ cfg, setCfg, authType }) => {
    if (authType === 'api_key') return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Header Name</label>
          <input type="text" placeholder="X-API-Key" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={cfg.header || ''} onChange={e => setCfg(c => ({ ...c, header: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Key Value</label>
          <input type="password" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={cfg.value || ''} onChange={e => setCfg(c => ({ ...c, value: e.target.value }))} />
        </div>
      </div>
    );
    if (authType === 'bearer') return (
      <div>
        <label className="block text-xs font-medium mb-1">Bearer Token</label>
        <input type="password" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
          value={cfg.token || ''} onChange={e => setCfg(c => ({ ...c, token: e.target.value }))} />
      </div>
    );
    if (authType === 'basic') return (
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Username</label>
          <input type="text" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={cfg.username || ''} onChange={e => setCfg(c => ({ ...c, username: e.target.value }))} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Password</label>
          <input type="password" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
            value={cfg.password || ''} onChange={e => setCfg(c => ({ ...c, password: e.target.value }))} />
        </div>
      </div>
    );
    return null;
  };

  const ExtForm = ({ f, setF }) => (
    <>
      <div><label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
        <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} /></div>
      <div><label className="block text-sm font-medium mb-1">Description</label>
        <input type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.description} onChange={e => setF(x => ({ ...x, description: e.target.value }))} /></div>
      <div><label className="block text-sm font-medium mb-1">Base URL <span className="text-red-500">*</span></label>
        <input required type="url" placeholder="https://api.example.com" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.baseUrl} onChange={e => setF(x => ({ ...x, baseUrl: e.target.value }))} /></div>
      <div>
        <label className="block text-sm font-medium mb-1">Authentication</label>
        <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm mb-2"
          value={f.authType} onChange={e => setF(x => ({ ...x, authType: e.target.value, authConfig: {} }))}>
          {AUTH_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <AuthConfigFields authType={f.authType} cfg={f.authConfig} setCfg={cfg => setF(x => ({ ...x, authConfig: typeof cfg === 'function' ? cfg(x.authConfig) : cfg }))} />
      </div>
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <p className="text-sm text-gray-500">Configure connections to external APIs that this portal can interact with.</p>
        <Button onClick={() => { setAddModal(true); setForm(emptyExtForm); }}>+ Add Integration</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Name</th>
              <th className="text-left p-4 font-medium text-gray-600">Base URL</th>
              <th className="text-left p-4 font-medium text-gray-600">Auth</th>
              <th className="text-left p-4 font-medium text-gray-600">Status</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {integrations.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No integrations configured.</td></tr>}
            {integrations.map(item => {
              const t = testResults[item.id];
              return (
                <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-medium">{item.name}</div>
                    {item.description && <div className="text-xs text-gray-400">{item.description}</div>}
                  </td>
                  <td className="p-4 text-xs font-mono text-gray-500 max-w-xs truncate">{item.base_url}</td>
                  <td className="p-4 text-gray-500 capitalize">{item.auth_type}{item.has_credentials ? ' ✓' : ''}</td>
                  <td className="p-4">
                    {t ? (
                      t.loading ? <span className="text-xs text-gray-400">Testing...</span>
                        : <span className={`text-xs font-medium ${t.success ? 'text-green-600' : 'text-red-600'}`}>
                            {t.success ? '✓' : '✗'} {t.statusCode ? `${t.statusCode} ` : ''}{t.statusMessage}
                          </span>
                    ) : <span className="text-xs text-gray-400">{item.is_active ? 'Active' : 'Inactive'}</span>}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button className="text-xs text-blue-600 hover:underline" onClick={() => handleTest(item.id)}>Test</button>
                      <button className="text-xs text-gray-600 hover:underline" onClick={() => openEdit(item)}>Edit</button>
                      <button className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(item.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add External Integration">
        <form onSubmit={handleCreate} className="space-y-3">
          <ExtForm f={form} setF={setForm} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.name}`}>
        <form onSubmit={handleEdit} className="space-y-3">
          <ExtForm f={editForm} setF={setEditForm} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ── WEBHOOKS TAB ────────────────────────────────────────────────────────────

const emptyWhForm = { name: '', url: '', secret: '', events: [] };

function WebhooksTab() {
  const [webhooks, setWebhooks] = useState([]);
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null);
  const [deliveriesModal, setDeliveriesModal] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [form, setForm] = useState(emptyWhForm);
  const [editForm, setEditForm] = useState(emptyWhForm);
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => listWebhooks().then(setWebhooks).catch(() => {}), []);
  useEffect(() => { load(); }, [load]);

  const toggleEvent = (ev, f, setF) =>
    setF(x => ({ ...x, events: x.events.includes(ev) ? x.events.filter(e => e !== ev) : [...x.events, ev] }));

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.events.length) return alert('Select at least one event');
    setLoading(true);
    try {
      await createWebhook(form);
      setAddModal(false);
      setForm(emptyWhForm);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const openEdit = (wh) => {
    setEditForm({ name: wh.name, url: wh.url, secret: '', events: wh.events, isActive: wh.is_active });
    setEditModal(wh);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateWebhook(editModal.id, editForm);
      setEditModal(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this webhook?')) return;
    await deleteWebhook(id).catch(() => {});
    await load();
  };

  const openDeliveries = async (wh) => {
    setDeliveriesModal(wh);
    const data = await getWebhookDeliveries(wh.id).catch(() => []);
    setDeliveries(data);
  };

  const WhForm = ({ f, setF }) => (
    <>
      <div><label className="block text-sm font-medium mb-1">Name <span className="text-red-500">*</span></label>
        <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.name} onChange={e => setF(x => ({ ...x, name: e.target.value }))} /></div>
      <div><label className="block text-sm font-medium mb-1">URL <span className="text-red-500">*</span></label>
        <input required type="url" placeholder="https://hooks.example.com/..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={f.url} onChange={e => setF(x => ({ ...x, url: e.target.value }))} /></div>
      <div><label className="block text-sm font-medium mb-1">Secret <span className="text-xs text-gray-400">(optional — used for HMAC signature in X-Webhook-Signature header)</span></label>
        <input type="password" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder={f.has_secret ? '(leave blank to keep existing)' : ''}
          value={f.secret} onChange={e => setF(x => ({ ...x, secret: e.target.value }))} /></div>
      <div>
        <label className="block text-sm font-medium mb-2">Events <span className="text-red-500">*</span></label>
        <div className="grid grid-cols-2 gap-1">
          {ALL_EVENTS.map(ev => (
            <label key={ev} className="flex items-center gap-2 cursor-pointer text-sm">
              <input type="checkbox" checked={f.events.includes(ev)} onChange={() => toggleEvent(ev, f, setF)} />
              <code className="text-xs">{ev}</code>
            </label>
          ))}
        </div>
      </div>
    </>
  );

  return (
    <div>
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm text-gray-500">Send HTTP POST events to external URLs when things happen in the portal.</p>
          <p className="text-xs text-gray-400 mt-1">Payloads are signed with HMAC-SHA256 in the <code className="bg-gray-100 px-1 rounded">X-Webhook-Signature</code> header when a secret is set.</p>
        </div>
        <Button onClick={() => { setAddModal(true); setForm(emptyWhForm); }}>+ Add Webhook</Button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left p-4 font-medium text-gray-600">Name</th>
              <th className="text-left p-4 font-medium text-gray-600">URL</th>
              <th className="text-left p-4 font-medium text-gray-600">Events</th>
              <th className="text-left p-4 font-medium text-gray-600">Deliveries</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {webhooks.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-gray-400">No webhooks configured.</td></tr>}
            {webhooks.map(wh => (
              <tr key={wh.id} className="border-b last:border-0 hover:bg-gray-50">
                <td className="p-4">
                  <div className="font-medium">{wh.name}</div>
                  <span className={`text-xs ${wh.is_active ? 'text-green-600' : 'text-red-500'}`}>{wh.is_active ? 'Active' : 'Inactive'}</span>
                </td>
                <td className="p-4 text-xs font-mono text-gray-500 max-w-xs truncate">{wh.url}</td>
                <td className="p-4">
                  <div className="flex gap-1 flex-wrap max-w-xs">
                    {wh.events.map(ev => <span key={ev} className="text-xs bg-gray-100 text-gray-600 rounded px-1.5 py-0.5">{ev}</span>)}
                  </div>
                </td>
                <td className="p-4 text-xs text-gray-500">
                  {wh.delivery_count > 0 ? (
                    <span className={wh.last_delivery_success ? 'text-green-600' : 'text-red-500'}>
                      {wh.delivery_count} total · last {wh.last_delivery_success ? '✓' : '✗'}
                    </span>
                  ) : 'No deliveries'}
                </td>
                <td className="p-4">
                  <div className="flex gap-2">
                    <button className="text-xs text-blue-600 hover:underline" onClick={() => openDeliveries(wh)}>History</button>
                    <button className="text-xs text-gray-600 hover:underline" onClick={() => openEdit(wh)}>Edit</button>
                    <button className="text-xs text-red-600 hover:underline" onClick={() => handleDelete(wh.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Webhook">
        <form onSubmit={handleCreate} className="space-y-3">
          <WhForm f={form} setF={setForm} />
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add Webhook</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.name}`}>
        <form onSubmit={handleEdit} className="space-y-3">
          <WhForm f={editForm} setF={setEditForm} />
          <div className="flex items-center gap-2">
            <input type="checkbox" id="whActive" checked={editForm.isActive ?? true}
              onChange={e => setEditForm(x => ({ ...x, isActive: e.target.checked }))} />
            <label htmlFor="whActive" className="text-sm">Active</label>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="secondary" type="button" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deliveriesModal} onClose={() => setDeliveriesModal(null)} title={`Delivery History: ${deliveriesModal?.name}`}>
        <div className="max-h-96 overflow-y-auto">
          {deliveries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No deliveries yet.</p>
          ) : (
            <table className="w-full text-xs">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium text-gray-600">Event</th>
                  <th className="text-left p-2 font-medium text-gray-600">Status</th>
                  <th className="text-left p-2 font-medium text-gray-600">Response</th>
                  <th className="text-left p-2 font-medium text-gray-600">Delivered</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.map(d => (
                  <tr key={d.id} className="border-b last:border-0">
                    <td className="p-2 font-mono">{d.event}</td>
                    <td className="p-2">
                      <span className={d.success ? 'text-green-600' : 'text-red-500'}>
                        {d.success ? '✓' : '✗'} {d.response_code || '—'}
                      </span>
                    </td>
                    <td className="p-2 text-gray-400 max-w-xs truncate">{d.response_body || '—'}</td>
                    <td className="p-2 text-gray-400 whitespace-nowrap">{new Date(d.delivered_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="flex justify-end mt-4">
          <Button variant="secondary" onClick={() => setDeliveriesModal(null)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}

// ── MAIN PAGE ───────────────────────────────────────────────────────────────

export default function Integrations() {
  const [tab, setTab] = useState('apikeys');

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">API Integrations</h1>
      <p className="text-sm text-gray-500 mb-6">Manage API keys, external connections, and webhook notifications.</p>

      <div className="flex gap-0 border-b border-gray-200 mb-6">
        <TabBtn active={tab === 'apikeys'} onClick={() => setTab('apikeys')}>API Keys</TabBtn>
        <TabBtn active={tab === 'external'} onClick={() => setTab('external')}>External APIs</TabBtn>
        <TabBtn active={tab === 'webhooks'} onClick={() => setTab('webhooks')}>Webhooks</TabBtn>
      </div>

      {tab === 'apikeys' && <ApiKeysTab />}
      {tab === 'external' && <ExternalTab />}
      {tab === 'webhooks' && <WebhooksTab />}
    </div>
  );
}
