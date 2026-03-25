import React, { useEffect, useRef, useState } from 'react';
import { getMe, updateProfile, uploadAvatar, changePassword } from '../../api/authApi';
import { getJobRoles } from '../../api/jobRoleApi';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/common/Button';

export default function Profile() {
  const { user: authUser, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [jobRoles, setJobRoles] = useState([]);
  const [form, setForm] = useState({ firstName: '', lastName: '', newEmail: '', jobRoleId: '' });
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [profileMsg, setProfileMsg] = useState(null);
  const [pwMsg, setPwMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPw, setSavingPw] = useState(false);
  const [avatarMsg, setAvatarMsg] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    Promise.all([getMe(), getJobRoles()]).then(([u, roles]) => {
      setProfile(u);
      setJobRoles(roles);
      setForm({ firstName: u.firstName, lastName: u.lastName, newEmail: u.email, jobRoleId: u.jobRoleId ?? '' });
    });
  }, []);

  const profileDirty =
    profile &&
    (form.firstName !== profile.firstName ||
      form.lastName !== profile.lastName ||
      form.newEmail !== profile.email ||
      (form.jobRoleId || '') !== (profile.jobRoleId ?? '').toString());

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);
    try {
      const updated = await updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        newEmail: form.newEmail !== profile.email ? form.newEmail : undefined,
        jobRoleId: form.jobRoleId !== '' ? parseInt(form.jobRoleId) : null,
      });
      setProfile(p => ({ ...p, ...updated }));
      // Update stored user if name/email changed
      const stored = JSON.parse(localStorage.getItem('user') || '{}');
      localStorage.setItem('user', JSON.stringify({ ...stored, firstName: updated.firstName, lastName: updated.lastName, email: updated.email }));
      setProfileMsg({ type: 'success', text: 'Profile updated successfully.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: err.response?.data?.error || 'Failed to update profile.' });
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pwForm.newPassword !== pwForm.confirm) {
      return setPwMsg({ type: 'error', text: 'New passwords do not match.' });
    }
    if (pwForm.newPassword.length < 8) {
      return setPwMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
    }
    setSavingPw(true);
    try {
      await changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwForm({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setPwMsg({ type: 'error', text: err.response?.data?.error || 'Failed to change password.' });
    } finally { setSavingPw(false); }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarMsg(null);
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      const { avatarUrl } = await uploadAvatar(formData);
      setProfile(p => ({ ...p, avatarUrl }));
      updateUser({ avatarUrl });
      setAvatarMsg({ type: 'success', text: 'Profile picture updated.' });
    } catch (err) {
      setAvatarMsg({ type: 'error', text: err.response?.data?.error || 'Failed to upload image.' });
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  if (!profile) return <div className="p-6 text-gray-400">Loading...</div>;

  const roleBadge = {
    employee: 'bg-gray-100 text-gray-600',
    manager: 'bg-blue-100 text-blue-700',
    administrator: 'bg-purple-100 text-purple-700',
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">My Profile</h1>

      {/* Avatar */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 flex items-center gap-5">
        <div className="relative group cursor-pointer" onClick={() => avatarInputRef.current?.click()}>
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Profile"
              className="h-20 w-20 rounded-full object-cover border-2 border-gray-200"
            />
          ) : (
            <div className="h-20 w-20 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-2xl font-bold border-2 border-gray-200">
              {profile.firstName?.[0]}{profile.lastName?.[0]}
            </div>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <span className="text-white text-xs font-medium">Change</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700">Profile Picture</p>
          <p className="text-xs text-gray-400 mt-0.5">JPEG, PNG, WebP or SVG · Max 5 MB</p>
          <button
            type="button"
            disabled={uploadingAvatar}
            onClick={() => avatarInputRef.current?.click()}
            className="mt-2 text-xs text-blue-600 hover:underline disabled:opacity-50"
          >
            {uploadingAvatar ? 'Uploading…' : 'Upload new picture'}
          </button>
          {avatarMsg && (
            <p className={`text-xs mt-1 ${avatarMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
              {avatarMsg.text}
            </p>
          )}
        </div>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/svg+xml"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      {/* Profile details */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Account Details</h2>

        {profileMsg && (
          <div className={`p-3 rounded-lg text-sm border ${profileMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {profileMsg.text}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">First Name</label>
            <input
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.firstName}
              onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Last Name</label>
            <input
              required
              type="text"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.lastName}
              onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Email Address</label>
          <input
            required
            type="email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.newEmail}
            onChange={e => setForm(f => ({ ...f, newEmail: e.target.value }))}
          />
          <p className="text-xs text-gray-400 mt-1">This is your login email. You will receive a confirmation if it changes.</p>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Job Role</label>
          <select
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={form.jobRoleId}
            onChange={e => setForm(f => ({ ...f, jobRoleId: e.target.value }))}
          >
            <option value="">None</option>
            {jobRoles.filter(r => r.is_active).map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Role</label>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium capitalize ${roleBadge[profile.role]}`}>
            {profile.role}
          </span>
        </div>

        <div className="flex justify-end">
          <Button type="submit" loading={savingProfile} disabled={!profileDirty}>Save Changes</Button>
        </div>
      </form>

      {/* Change password */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 space-y-4">
        <h2 className="font-semibold text-gray-700">Change Password</h2>

        {pwMsg && (
          <div className={`p-3 rounded-lg text-sm border ${pwMsg.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
            {pwMsg.text}
          </div>
        )}

        {[
          { key: 'currentPassword', label: 'Current Password' },
          { key: 'newPassword', label: 'New Password' },
          { key: 'confirm', label: 'Confirm New Password' },
        ].map(({ key, label }) => (
          <div key={key}>
            <label className="block text-sm font-medium mb-1">{label}</label>
            <input
              required
              type="password"
              minLength={key !== 'currentPassword' ? 8 : undefined}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={pwForm[key]}
              onChange={e => setPwForm(f => ({ ...f, [key]: e.target.value }))}
            />
          </div>
        ))}

        <div className="flex justify-end">
          <Button type="submit" loading={savingPw}>Change Password</Button>
        </div>
      </form>
    </div>
  );
}
