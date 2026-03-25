import React, { useEffect, useState } from 'react';
import { getConfig, updateConfig, uploadLogo, uploadLoginBg, removeLoginBg } from '../../api/adminApi';
import Button from '../../components/common/Button';

export default function SystemConfig() {
  const [config, setConfig] = useState({});
  const [values, setValues] = useState({});
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [bgFile, setBgFile] = useState(null);
  const [bgPreview, setBgPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [removingBg, setRemovingBg] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    getConfig().then(cfg => {
      setConfig(cfg);
      const initial = {};
      Object.entries(cfg).forEach(([k, v]) => { initial[k] = v.value || ''; });
      setValues(initial);
    });
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    const changes = {};
    Object.entries(values).forEach(([k, v]) => {
      if (k !== 'company_logo') changes[k] = v;
    });
    try {
      await updateConfig(changes);
      setMsg('Settings saved successfully.');
    } catch {
      setMsg('Failed to save settings.');
    } finally { setSaving(false); }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleLogoUpload = async () => {
    if (!logoFile) return;
    setUploading(true);
    setMsg('');
    try {
      const { logoUrl } = await uploadLogo(logoFile);
      setValues(v => ({ ...v, company_logo: logoUrl }));
      setMsg('Logo uploaded successfully.');
      setLogoFile(null);
    } catch {
      setMsg('Failed to upload logo.');
    } finally { setUploading(false); }
  };

  const handleBgChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  };

  const handleBgUpload = async () => {
    if (!bgFile) return;
    setUploadingBg(true);
    setMsg('');
    try {
      const { bgUrl } = await uploadLoginBg(bgFile);
      setValues(v => ({ ...v, login_bg: bgUrl }));
      setMsg('Login background uploaded successfully.');
      setBgFile(null);
      setBgPreview(null);
    } catch {
      setMsg('Failed to upload background.');
    } finally { setUploadingBg(false); }
  };

  const handleRemoveBg = async () => {
    if (!window.confirm('Remove the login background image?')) return;
    setRemovingBg(true);
    setMsg('');
    try {
      await removeLoginBg();
      setValues(v => ({ ...v, login_bg: '' }));
      setBgPreview(null);
      setBgFile(null);
      setMsg('Login background removed.');
    } catch {
      setMsg('Failed to remove background.');
    } finally { setRemovingBg(false); }
  };

  const handleSaveTemplate = async () => {
    setTemplateSaving(true);
    setMsg('');
    try {
      await updateConfig({ resume_template: values.resume_template || '' });
      setMsg('Resume template saved successfully.');
    } catch {
      setMsg('Failed to save resume template.');
    } finally { setTemplateSaving(false); }
  };

  const editableKeys = ['company_name', 'primary_color', 'allow_self_register'];

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">System Configuration</h1>

      {msg && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${msg.includes('success') ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-600 border border-red-200'}`}>
          {msg}
        </div>
      )}

      {/* Logo */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold mb-4">Company Logo</h2>
        <div className="flex items-center gap-4 mb-4">
          {(logoPreview || values.company_logo) && (
            <img
              src={logoPreview || values.company_logo}
              alt="Logo"
              className="h-16 w-auto border border-gray-200 rounded-lg object-contain p-1"
            />
          )}
          <div>
            <input type="file" accept="image/*" onChange={handleLogoChange} className="text-sm" />
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, SVG or WebP, max 5MB</p>
          </div>
        </div>
        {logoFile && (
          <Button onClick={handleLogoUpload} loading={uploading}>Upload Logo</Button>
        )}
      </div>

      {/* Login Background */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-6">
        <h2 className="font-semibold mb-1">Login Page Background</h2>
        <p className="text-xs text-gray-400 mb-4">Image displayed behind the login card. Recommended: 1920×1080 or larger.</p>
        <div className="flex items-start gap-4 mb-4">
          {(bgPreview || values.login_bg) && (
            <img
              src={bgPreview || values.login_bg}
              alt="Login background preview"
              className="h-24 w-40 border border-gray-200 rounded-lg object-cover"
            />
          )}
          <div>
            <input type="file" accept="image/*" onChange={handleBgChange} className="text-sm" />
            <p className="text-xs text-gray-400 mt-1">PNG, JPG or WebP, max 5MB</p>
          </div>
        </div>
        <div className="flex gap-2">
          {bgFile && (
            <Button onClick={handleBgUpload} loading={uploadingBg}>Upload Background</Button>
          )}
          {values.login_bg && !bgFile && (
            <Button variant="danger" onClick={handleRemoveBg} loading={removingBg}>Remove Background</Button>
          )}
        </div>
      </div>

      {/* Other config */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold mb-2">General Settings</h2>
        {editableKeys.map(key => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">
              {key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </label>
            {config[key]?.description && (
              <p className="text-xs text-gray-400 mb-1">{config[key].description}</p>
            )}
            {key === 'allow_self_register' ? (
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={values[key] || 'false'}
                onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
              >
                <option value="false">Disabled</option>
                <option value="true">Enabled</option>
              </select>
            ) : (
              <input
                type={key === 'primary_color' ? 'color' : 'text'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={values[key] || ''}
                onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
              />
            )}
          </div>
        ))}
        <Button type="submit" loading={saving}>Save Settings</Button>
      </form>

      {/* Resume Template */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <h2 className="font-semibold mb-1">Resume Template</h2>
        <p className="text-xs text-gray-400 mb-3">
          HTML template used when employees generate their resume PDF. Use the placeholders below to inject employee data.
        </p>
        <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
          <p className="font-medium text-gray-700 mb-1">Available placeholders:</p>
          {[
            ['{{fullName}}', 'Full name (first + last)'],
            ['{{firstName}}', 'First name'],
            ['{{lastName}}', 'Last name'],
            ['{{jobRole}}', 'Job role title'],
            ['{{biography}}', 'Employee biography text'],
            ['{{profilePicture}}', 'Profile photo (rendered as <img> or initials)'],
            ['{{skills}}', 'Approved skills grouped by main skill'],
          ].map(([ph, desc]) => (
            <div key={ph} className="flex gap-2">
              <code className="bg-white border border-gray-200 rounded px-1 font-mono text-blue-600 whitespace-nowrap">{ph}</code>
              <span className="text-gray-500">{desc}</span>
            </div>
          ))}
        </div>
        <textarea
          rows={18}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs font-mono resize-y focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={values.resume_template || ''}
          onChange={e => setValues(v => ({ ...v, resume_template: e.target.value }))}
          placeholder="Enter HTML template here..."
          spellCheck={false}
        />
        <div className="mt-3">
          <Button type="button" onClick={handleSaveTemplate} loading={templateSaving}>Save Template</Button>
        </div>
      </div>
    </div>
  );
}
