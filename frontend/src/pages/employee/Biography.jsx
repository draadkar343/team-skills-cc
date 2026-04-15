import React, { useEffect, useState } from 'react';
import { getMe, updateProfile } from '../../api/authApi';
import { getConfig, generateResume } from '../../api/adminApi';
import Button from '../../components/common/Button';

const MAX_CHARS = 2000;

export default function Biography() {
  const [biography, setBiography] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [hasTemplate, setHasTemplate] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    Promise.all([getMe(), getConfig()])
      .then(([u, cfg]) => {
        const bio = u.biography || '';
        setBiography(bio);
        setOriginal(bio);
        setHasTemplate(!!cfg.resume_template_docx?.value);
      })
      .catch(() => setMsg({ type: 'error', text: 'Failed to load profile.' }))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      await updateProfile({ biography });
      setOriginal(biography);
      setMsg({ type: 'success', text: 'Biography saved successfully.' });
    } catch {
      setMsg({ type: 'error', text: 'Failed to save biography. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateResume = async () => {
    setGenerating(true);
    setMsg(null);
    try {
      const [user, blob] = await Promise.all([getMe(), generateResume()]);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(user.firstName || 'Resume').replace(/\s+/g, '_')}_${(user.lastName || '').replace(/\s+/g, '_')}_Resume.docx`.replace(/^_|_$/g, '');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const text = err.response?.status === 404
        ? 'No resume template has been configured. Please contact your administrator.'
        : 'Failed to generate resume. Please try again.';
      setMsg({ type: 'error', text });
    } finally {
      setGenerating(false);
    }
  };

  const isDirty = biography !== original;
  const charsLeft = MAX_CHARS - biography.length;

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">My Biography</h1>
      <p className="text-sm text-gray-500 mb-6">
        Write a short professional summary about yourself — your background, expertise, and what you bring to the team.
      </p>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm border ${
          msg.type === 'success'
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-red-50 border-red-200 text-red-600'
        }`}>
          {msg.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <div>
          <textarea
            rows={12}
            maxLength={MAX_CHARS}
            placeholder="Tell us about yourself — your experience, skills, interests, and professional goals..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={biography}
            onChange={e => { setBiography(e.target.value); setMsg(null); }}
          />
          <p className={`text-xs mt-1 text-right ${charsLeft < 100 ? 'text-orange-500' : 'text-gray-400'}`}>
            {charsLeft} characters remaining
          </p>
        </div>

        <div className="flex items-center justify-between">
          {isDirty && !saving && (
            <button
              type="button"
              className="text-sm text-gray-400 hover:text-gray-600"
              onClick={() => { setBiography(original); setMsg(null); }}
            >
              Discard changes
            </button>
          )}
          <div className="ml-auto">
            <Button type="submit" loading={saving} disabled={!isDirty}>
              Save Biography
            </Button>
          </div>
        </div>
      </form>

      {original && (
        <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{original}</p>
        </div>
      )}

      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Resume</h2>
        <p className="text-xs text-gray-400 mb-4">
          Downloads a Word document using the company resume template — includes your name, job role, biography, and all approved skills grouped by category.
        </p>
        {hasTemplate ? (
          <Button type="button" onClick={handleGenerateResume} loading={generating}>
            Download Resume
          </Button>
        ) : (
          <p className="text-xs text-gray-400 italic">No resume template has been configured. Please contact your administrator.</p>
        )}
      </div>
    </div>
  );
}
