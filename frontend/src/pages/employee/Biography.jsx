import React, { useEffect, useState } from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getMe, updateProfile } from '../../api/authApi';
import { getMySkills } from '../../api/skillsApi';
import { getConfig } from '../../api/adminApi';
import Button from '../../components/common/Button';

const MAX_CHARS = 2000;

const DEFAULT_TEMPLATE = `<div style="font-family: Arial, sans-serif; padding: 40px; background: white; color: #333; max-width: 794px;">
  <div style="display: flex; align-items: center; gap: 20px; margin-bottom: 28px; padding-bottom: 24px; border-bottom: 3px solid #3B82F6;">
    {{profilePicture}}
    <div>
      <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #111827;">{{fullName}}</h1>
      <p style="margin: 6px 0 0; font-size: 15px; color: #6B7280;">{{jobRole}}</p>
    </div>
  </div>
  <div style="margin-bottom: 28px;">
    <h2 style="font-size: 14px; font-weight: 700; color: #3B82F6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Professional Summary</h2>
    <p style="font-size: 13px; line-height: 1.7; margin: 0; white-space: pre-wrap;">{{biography}}</p>
  </div>
  <div>
    <h2 style="font-size: 14px; font-weight: 700; color: #3B82F6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px;">Skills</h2>
    {{skills}}
  </div>
</div>`;

export default function Biography() {
  const [biography, setBiography] = useState('');
  const [original, setOriginal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null); // { type: 'success'|'error', text }

  useEffect(() => {
    getMe()
      .then(u => {
        const bio = u.biography || '';
        setBiography(bio);
        setOriginal(bio);
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
      const [user, skills, cfg] = await Promise.all([getMe(), getMySkills(), getConfig()]);

      const template = cfg.resume_template?.value || DEFAULT_TEMPLATE;
      const approvedSkills = skills.filter(s => s.status === 'approved');

      // Group by main skill name
      const grouped = {};
      approvedSkills.forEach(s => {
        const group = s.main_skill_name || 'Other';
        if (!grouped[group]) grouped[group] = [];
        grouped[group].push(s);
      });

      const skillsHtml = Object.keys(grouped).length
        ? Object.entries(grouped).map(([mainSkill, subSkills]) => `
            <div style="margin-bottom: 14px;">
              <div style="font-size: 13px; font-weight: 700; color: #374151; margin-bottom: 6px;">${mainSkill}</div>
              <ul style="margin: 0; padding-left: 18px;">
                ${subSkills.map(s => `<li style="font-size: 13px; margin-bottom: 3px; color: #4B5563;">${s.skill_name} <span style="color: #9CA3AF;">(${s.weighting}%)</span></li>`).join('')}
              </ul>
            </div>`).join('')
        : '<p style="font-size: 13px; color: #9CA3AF; margin: 0;">No approved skills yet.</p>';

      const picHtml = user.avatarUrl
        ? `<img src="${user.avatarUrl}" crossorigin="anonymous" style="width:96px;height:96px;border-radius:50%;object-fit:cover;flex-shrink:0;" />`
        : `<div style="width:96px;height:96px;border-radius:50%;background:#E5E7EB;display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;color:#9CA3AF;flex-shrink:0;">${(user.firstName?.[0] || '') + (user.lastName?.[0] || '')}</div>`;

      const html = template
        .replace(/\{\{fullName\}\}/g, `${user.firstName || ''} ${user.lastName || ''}`.trim())
        .replace(/\{\{firstName\}\}/g, user.firstName || '')
        .replace(/\{\{lastName\}\}/g, user.lastName || '')
        .replace(/\{\{jobRole\}\}/g, user.jobRoleName || '')
        .replace(/\{\{biography\}\}/g, user.biography || '')
        .replace(/\{\{profilePicture\}\}/g, picHtml)
        .replace(/\{\{skills\}\}/g, skillsHtml);

      // Render off-screen
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;background:white;';
      container.innerHTML = html;
      document.body.appendChild(container);

      // Wait for images to load
      await Promise.all(
        [...container.querySelectorAll('img')].map(
          img => new Promise(resolve => {
            if (img.complete) resolve();
            else { img.onload = resolve; img.onerror = resolve; }
          })
        )
      );

      const canvas = await html2canvas(container, { scale: 2, useCORS: true, allowTaint: true });
      document.body.removeChild(container);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'px', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgH = (canvas.height / canvas.width) * pageW;
      const imgData = canvas.toDataURL('image/png');

      if (imgH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pageW, imgH);
      } else {
        let posY = 0;
        while (posY < imgH) {
          pdf.addImage(imgData, 'PNG', 0, -posY, pageW, imgH);
          posY += pageH;
          if (posY < imgH) pdf.addPage();
        }
      }

      const fileName = `${user.firstName || 'Resume'}_${user.lastName || ''}_Resume.pdf`.replace(/\s+/g, '_');
      pdf.save(fileName);
    } catch (err) {
      console.error('Resume generation error:', err);
      setMsg({ type: 'error', text: 'Failed to generate resume. Please try again.' });
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
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Resume PDF</h2>
        <p className="text-xs text-gray-400 mb-4">
          Generates a PDF using the company resume template — includes your profile picture, name, job role, biography, and all approved skills grouped by category.
        </p>
        <Button type="button" onClick={handleGenerateResume} loading={generating}>
          Download Resume PDF
        </Button>
      </div>
    </div>
  );
}
