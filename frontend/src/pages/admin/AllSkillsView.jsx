import React, { useEffect, useState } from 'react';
import { getAllSkills, getAllCatalogue, getCategories, createCatalogueSkill, updateCatalogueSkill, createCategory, bulkUploadMainSkills, bulkUploadSubSkills } from '../../api/skillsApi';
import { getMainSkills } from '../../api/jobRoleApi';
import Badge from '../../components/common/Badge';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

export default function AllSkillsView() {
  const [skills, setSkills] = useState([]);
  const [catalogue, setCatalogue] = useState([]);
  const [categories, setCategories] = useState([]);
  const [allMainSkills, setAllMainSkills] = useState([]);
  const [tab, setTab] = useState('skills'); // 'skills' | 'catalogue'
  const [filter, setFilter] = useState('');
  const [addModal, setAddModal] = useState(false);
  const [editModal, setEditModal] = useState(null); // skill object or null
  const [catModal, setCatModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', categoryId: '', mainSkillId: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', categoryId: '', mainSkillId: '', isActive: true });
  const [catName, setCatName] = useState('');
  const [loading, setLoading] = useState(false);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkTab, setBulkTab] = useState('main'); // 'main' | 'sub'
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const load = async () => {
    const [s, c, cats, ms] = await Promise.all([getAllSkills(), getAllCatalogue(), getCategories(), getMainSkills()]);
    setSkills(s);
    setCatalogue(c);
    setCategories(cats);
    setAllMainSkills(ms);
  };

  useEffect(() => { load(); }, []);

  const filtered = skills.filter(s =>
    !filter || `${s.first_name} ${s.last_name} ${s.skill_name}`.toLowerCase().includes(filter.toLowerCase())
  );

  const handleAddSkill = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCatalogueSkill({ name: form.name, description: form.description, categoryId: form.categoryId || null, mainSkillId: form.mainSkillId || null });
      setAddModal(false);
      setForm({ name: '', description: '', categoryId: '', mainSkillId: '' });
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const openEdit = (skill) => {
    setEditForm({ name: skill.name, description: skill.description || '', categoryId: skill.category_id || '', mainSkillId: skill.main_skill_id || '', isActive: skill.is_active });
    setEditModal(skill);
  };

  const handleEditSkill = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateCatalogueSkill(editModal.id, {
        name: editForm.name, description: editForm.description,
        categoryId: editForm.categoryId || null,
        mainSkillId: editForm.mainSkillId !== '' ? parseInt(editForm.mainSkillId) : null,
        isActive: editForm.isActive,
      });
      setEditModal(null);
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createCategory({ name: catName });
      setCatModal(false);
      setCatName('');
      await load();
    } catch (err) { alert(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };


  const downloadTemplate = () => {
    const templates = {
      main: 'job_role_name,main_skill_name,description\n"Software Engineer","Backend Development","Core backend competencies"\n',
      sub: 'job_role_name,main_skill_name,skill_name,category_name,description\n"Software Engineer","Backend Development","Python","Programming","Python programming language"\n',
    };
    const blob = new Blob([templates[bulkTab]], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = bulkTab === 'main' ? 'main_skills_template.csv' : 'sub_skills_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const fn = bulkTab === 'main' ? bulkUploadMainSkills : bulkUploadSubSkills;
      const result = await fn(bulkFile);
      setBulkResult(result);
      await load();
    } catch (err) {
      setBulkResult({ errors: [err.response?.data?.error || 'Upload failed'] });
    } finally {
      setBulkLoading(false);
    }
  };

  const closeBulkModal = () => { setBulkModal(false); setBulkFile(null); setBulkResult(null); };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex gap-4 mb-6">
        <button onClick={() => setTab('skills')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'skills' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
          Employee Skills ({skills.length})
        </button>
        <button onClick={() => setTab('catalogue')} className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === 'catalogue' ? 'bg-blue-600 text-white' : 'bg-white border border-gray-300 text-gray-600'}`}>
          Skills Catalogue ({catalogue.length})
        </button>
      </div>

      {tab === 'skills' && (
        <div>
          <div className="mb-4">
            <input type="text" placeholder="Filter by employee or skill name..."
              className="w-full max-w-sm border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={filter} onChange={e => setFilter(e.target.value)} />
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Employee</th>
                  <th className="text-left p-4 font-medium text-gray-600">Skill</th>
                  <th className="text-left p-4 font-medium text-gray-600">Category</th>
                  <th className="text-left p-4 font-medium text-gray-600">Weighting</th>
                  <th className="text-left p-4 font-medium text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium">{s.first_name} {s.last_name}</div>
                      <div className="text-xs text-gray-400">{s.email}</div>
                    </td>
                    <td className="p-4">{s.skill_name}</td>
                    <td className="p-4 text-gray-500">{s.category_name || '-'}</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="bg-gray-200 rounded-full h-2 w-16">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${s.weighting}%` }} />
                        </div>
                        <span>{s.weighting}%</span>
                      </div>
                    </td>
                    <td className="p-4"><Badge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'catalogue' && (
        <div>
          <div className="flex gap-2 mb-4">
            <Button onClick={() => setAddModal(true)}>+ Add Skill</Button>
            <Button variant="secondary" onClick={() => setCatModal(true)}>+ Add Category</Button>
            <Button variant="secondary" onClick={() => { setBulkModal(true); setBulkFile(null); setBulkResult(null); }}>Bulk Upload CSV</Button>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Skill</th>
                  <th className="text-left p-4 font-medium text-gray-600">Main Skill</th>
                  <th className="text-left p-4 font-medium text-gray-600">Category</th>
                  <th className="text-left p-4 font-medium text-gray-600">Description</th>
                  <th className="text-left p-4 font-medium text-gray-600">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {catalogue.map(s => (
                  <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="p-4 font-medium">{s.name}</td>
                    <td className="p-4 text-gray-500">
                      {s.main_skill_name ? (
                        <div>
                          <div>{s.main_skill_name}</div>
                          <div className="text-xs text-gray-400">{s.job_role_name}</div>
                        </div>
                      ) : '-'}
                    </td>
                    <td className="p-4 text-gray-500">{s.category_name || '-'}</td>
                    <td className="p-4 text-gray-400">{s.description || '-'}</td>
                    <td className="p-4">
                      <span className={`text-xs font-medium ${s.is_active ? 'text-green-600' : 'text-red-500'}`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4">
                      <Button variant="secondary" className="py-1 px-2 text-xs" onClick={() => openEdit(s)}>Edit</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal open={addModal} onClose={() => setAddModal(false)} title="Add Skill to Catalogue">
        <form onSubmit={handleAddSkill} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Skill Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Main Skill</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.mainSkillId} onChange={e => setForm(f => ({ ...f, mainSkillId: e.target.value }))}>
              <option value="">None</option>
              {allMainSkills.map(ms => <option key={ms.id} value={ms.id}>{ms.job_role_name} / {ms.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.categoryId} onChange={e => setForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editModal} onClose={() => setEditModal(null)} title={`Edit: ${editModal?.name}`}>
        <form onSubmit={handleEditSkill} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Skill Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Main Skill</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={editForm.mainSkillId} onChange={e => setEditForm(f => ({ ...f, mainSkillId: e.target.value }))}>
              <option value="">None</option>
              {allMainSkills.map(ms => <option key={ms.id} value={ms.id}>{ms.job_role_name} / {ms.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={editForm.categoryId} onChange={e => setEditForm(f => ({ ...f, categoryId: e.target.value }))}>
              <option value="">None</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isActive" checked={editForm.isActive}
              onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button type="submit" loading={loading}>Save</Button>
          </div>
        </form>
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title="Add Category">
        <form onSubmit={handleAddCategory} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Category Name</label>
            <input required type="text" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={catName} onChange={e => setCatName(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button type="submit" loading={loading}>Add</Button>
          </div>
        </form>
      </Modal>

      <Modal open={bulkModal} onClose={closeBulkModal} title="Bulk Upload Skills via CSV">
        <div className="space-y-4">
          {/* Tab switcher */}
          <div className="flex gap-2 border-b border-gray-200">
            <button onClick={() => { setBulkTab('main'); setBulkFile(null); setBulkResult(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${bulkTab === 'main' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              Main Skills
            </button>
            <button onClick={() => { setBulkTab('sub'); setBulkFile(null); setBulkResult(null); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${bulkTab === 'sub' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500'}`}>
              Sub Skills
            </button>
          </div>

          {/* Format hint */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            {bulkTab === 'main' ? (
              <>
                <p className="font-medium text-gray-700">Required columns:</p>
                <p><code>job_role_name, main_skill_name, description</code></p>
                <p>Job role must already exist. Duplicates are skipped.</p>
              </>
            ) : (
              <>
                <p className="font-medium text-gray-700">Required columns:</p>
                <p><code>job_role_name, main_skill_name, skill_name, category_name, description</code></p>
                <p>job_role_name, main_skill_name, category_name and description are optional. Categories are auto-created if not found.</p>
              </>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={downloadTemplate} className="text-xs text-blue-600 hover:underline">
              Download template CSV
            </button>
          </div>

          {/* File picker */}
          <div>
            <label className="block text-sm font-medium mb-1">Select CSV File</label>
            <input type="file" accept=".csv,text/csv"
              className="text-sm text-gray-600"
              onChange={e => { setBulkFile(e.target.files[0] || null); setBulkResult(null); }} />
          </div>

          {/* Results */}
          {bulkResult && (
            <div className="rounded-lg border p-3 space-y-2 text-sm">
              <div className="flex gap-4">
                <span className="text-green-600 font-medium">{bulkResult.inserted ?? 0} inserted</span>
                <span className="text-yellow-600 font-medium">{bulkResult.skipped ?? 0} skipped (duplicates)</span>
              </div>
              {bulkResult.errors?.length > 0 && (
                <div className="mt-2">
                  <p className="text-red-600 font-medium mb-1">{bulkResult.errors.length} error(s):</p>
                  <ul className="text-red-500 text-xs space-y-0.5 max-h-32 overflow-y-auto">
                    {bulkResult.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="secondary" type="button" onClick={closeBulkModal}>Close</Button>
            <Button onClick={handleBulkUpload} loading={bulkLoading} disabled={!bulkFile}>Upload</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
