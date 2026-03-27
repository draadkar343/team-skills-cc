import React, { useEffect, useState } from 'react';
import { listKudos, sendKudos, deleteKudos } from '../../api/kudosApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export const CATEGORIES = [
  { key: 'above_beyond',   label: 'Above & Beyond',  emoji: '🚀' },
  { key: 'teamwork',       label: 'Teamwork',         emoji: '🤝' },
  { key: 'innovation',     label: 'Innovation',       emoji: '💡' },
  { key: 'leadership',     label: 'Leadership',       emoji: '🌟' },
  { key: 'problem_solving',label: 'Problem Solving',  emoji: '🛡️' },
  { key: 'customer_focus', label: 'Customer Focus',   emoji: '❤️' },
  { key: 'learning',       label: 'Learning & Growth',emoji: '📚' },
];

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

function timeAgo(dateStr) {
  const diff = (Date.now() - new Date(dateStr)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ name, size = 'md' }) {
  const [first, last] = (name || '').split(' ');
  const initials = `${first?.[0] || ''}${last?.[0] || ''}`.toUpperCase();
  const sz = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className={`${sz} rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white font-bold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}

export function KudosCard({ k, isAdmin, onDelete }) {
  const cat = CAT_MAP[k.category];
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start gap-3">
        <Avatar name={k.from_name} />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-1 text-sm">
            <span className="font-semibold">{k.from_name}</span>
            <span className="text-gray-400">recognised</span>
            <span className="font-semibold text-blue-700">{k.to_name}</span>
          </div>
          {cat && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 border border-amber-200 rounded-full text-xs font-medium text-amber-700">
              {cat.emoji} {cat.label}
            </span>
          )}
          <p className="mt-2 text-sm text-gray-700 leading-relaxed">"{k.message}"</p>
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">{timeAgo(k.created_at)}</span>
            {isAdmin && (
              <button className="text-xs text-red-400 hover:text-red-600" onClick={() => onDelete(k.id)}>Remove</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function GiveKudosModal({ open, onClose, onSent, excludeUserId }) {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ toUserId: '', category: '', message: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      import('../../api/adminApi').then(m => m.getUserDirectory()).then(list => {
        setUsers(list.filter(u => u.id !== excludeUserId));
      }).catch(() => {});
    }
  }, [open, excludeUserId]);

  const handleSend = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await sendKudos({ toUserId: parseInt(form.toUserId), category: form.category || null, message: form.message });
      setForm({ toUserId: '', category: '', message: '' });
      onSent?.();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to send recognition');
    } finally { setSaving(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Give Recognition">
      <form onSubmit={handleSend} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Recognise</label>
          <select required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            value={form.toUserId} onChange={e => setForm(f => ({ ...f, toUserId: e.target.value }))}>
            <option value="">— Select a person —</option>
            {users.map(u => (
              <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.key}
                type="button"
                onClick={() => setForm(f => ({ ...f, category: f.category === c.key ? '' : c.key }))}
                className={`px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors flex items-center gap-1.5 ${
                  form.category === c.key
                    ? 'bg-amber-50 border-amber-400 text-amber-700'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
              >
                <span>{c.emoji}</span> {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Message <span className="text-gray-400 font-normal">(be specific!)</span></label>
          <textarea
            required
            rows={4}
            maxLength={500}
            placeholder="Describe what they did and why it made a difference..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.message}
            onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
          />
          <p className="text-xs text-gray-400 text-right mt-0.5">{form.message.length}/500</p>
        </div>

        <div className="flex gap-2 justify-end pt-1">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={saving}>Send Recognition 🎉</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function KudosWall() {
  const { user } = useAuth();
  const [kudos, setKudos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGive, setShowGive] = useState(false);

  const load = () => listKudos().then(setKudos).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Remove this recognition?')) return;
    await deleteKudos(id);
    await load();
  };

  const isAdmin = user?.role === 'administrator';

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Recognition Wall</h1>
          <p className="text-sm text-gray-400 mt-0.5">Celebrate great work across the team</p>
        </div>
        <Button onClick={() => setShowGive(true)}>🎉 Give Recognition</Button>
      </div>

      {loading ? (
        <div className="text-gray-400 text-sm">Loading...</div>
      ) : kudos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">🎉</div>
          <p className="font-medium">No recognitions yet</p>
          <p className="text-sm mt-1">Be the first to recognise a teammate!</p>
          <button className="mt-4 text-blue-600 hover:underline text-sm" onClick={() => setShowGive(true)}>
            Give Recognition
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {kudos.map(k => (
            <KudosCard key={k.id} k={k} isAdmin={isAdmin} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <GiveKudosModal
        open={showGive}
        onClose={() => setShowGive(false)}
        onSent={load}
        excludeUserId={user?.id}
      />
    </div>
  );
}
