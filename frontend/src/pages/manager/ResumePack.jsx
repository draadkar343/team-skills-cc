import React, { useEffect, useState } from 'react';
import { listSquads, getSquad } from '../../api/squadApi';
import { getConfig, generateBulkResumes } from '../../api/adminApi';
import Button from '../../components/common/Button';

export default function ResumePack() {
  const [squads, setSquads] = useState([]);
  const [selectedSquadId, setSelectedSquadId] = useState('');
  const [members, setMembers] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [loadingSquad, setLoadingSquad] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    Promise.all([listSquads(), getConfig()]).then(([squadsData, cfg]) => {
      setSquads(squadsData);
      setHasTemplate(!!cfg.resume_template_docx?.value);
    });
  }, []);

  const handleSquadChange = async (squadId) => {
    setSelectedSquadId(squadId);
    setMembers([]);
    setSelectedIds(new Set());
    setMsg(null);
    if (!squadId) return;
    setLoadingSquad(true);
    try {
      const squad = await getSquad(squadId);
      const m = squad.members || [];
      setMembers(m);
      setSelectedIds(new Set(m.map(x => x.id)));
    } finally {
      setLoadingSquad(false);
    }
  };

  const toggleMember = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const allSelected = members.length > 0 && selectedIds.size === members.length;
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(members.map(m => m.id)));

  const handleDownload = async () => {
    if (!selectedIds.size) return;
    setDownloading(true);
    setMsg(null);
    try {
      const blob = await generateBulkResumes({ userIds: [...selectedIds] });
      const squad = squads.find(s => String(s.id) === String(selectedSquadId));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(squad?.name || 'Squad').replace(/\s+/g, '_')}_Resume_Pack.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setMsg({ type: 'error', text: 'Failed to generate resume pack. Please try again.' });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Resume Pack</h1>
      <p className="text-sm text-gray-500 mb-6">
        Download Word resumes for multiple team members as a single zip file.
      </p>

      {!hasTemplate && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-700">
          No resume template has been configured. Ask an administrator to upload one in System Config.
        </div>
      )}

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          msg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>{msg.text}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Select Squad</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={selectedSquadId}
            onChange={e => handleSquadChange(e.target.value)}
          >
            <option value="">— choose a squad —</option>
            {squads.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.member_count} member{s.member_count !== 1 ? 's' : ''})
              </option>
            ))}
          </select>
        </div>

        {loadingSquad && <p className="text-sm text-gray-400">Loading members…</p>}

        {!loadingSquad && selectedSquadId && members.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">No members in this squad.</p>
        )}

        {members.length > 0 && (
          <>
            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-sm font-medium text-gray-700">
                {selectedIds.size} of {members.length} selected
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-blue-600 hover:underline"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <div className="space-y-1">
              {members.map(m => (
                <label
                  key={m.id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={() => toggleMember(m.id)}
                    className="w-4 h-4 rounded"
                  />
                  <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-semibold text-gray-500 flex-shrink-0">
                    {(m.first_name?.[0] || '').toUpperCase()}{(m.last_name?.[0] || '').toUpperCase()}
                  </div>
                  <span className="text-sm flex-1">
                    {m.first_name} {m.last_name}
                  </span>
                  <span className="text-xs text-gray-400 capitalize">
                    {m.role?.replace(/_/g, ' ')}
                  </span>
                </label>
              ))}
            </div>

            <div className="border-t pt-3">
              <Button
                onClick={handleDownload}
                loading={downloading}
                disabled={!selectedIds.size || !hasTemplate}
              >
                Download {selectedIds.size} Resume{selectedIds.size !== 1 ? 's' : ''} (.zip)
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
