import React, { useEffect, useRef, useState } from 'react';
import {
  listCandidates, createCandidate, updateCandidate,
  changeStage, uploadCV, parseCV, deleteCV, deleteCandidate, getCandidate,
} from '../../api/talentApi';
import { getJobRoles } from '../../api/jobRoleApi';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';

const STAGES = [
  { key: 'sourced',          label: 'Sourced',          colour: 'bg-gray-100  border-gray-300  text-gray-700' },
  { key: 'cv_review',        label: 'CV Review',        colour: 'bg-blue-50   border-blue-300   text-blue-700' },
  { key: 'phone_screen',     label: 'Phone Screen',     colour: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
  { key: 'panel_interview',  label: 'Panel Interview',  colour: 'bg-purple-50 border-purple-300 text-purple-700' },
  { key: 'offer',            label: 'Offer',            colour: 'bg-amber-50  border-amber-300  text-amber-700' },
  { key: 'hired',            label: 'Hired',            colour: 'bg-green-50  border-green-300  text-green-700' },
  { key: 'rejected',         label: 'Rejected',         colour: 'bg-red-50    border-red-300    text-red-700' },
];

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s]));

const SCORE_LABELS = { 1: 'Poor', 2: 'Below Avg', 3: 'Average', 4: 'Good', 5: 'Excellent' };

const emptyForm = {
  firstName: '', lastName: '', email: '', phone: '', linkedinUrl: '',
  employmentType: '', jobRoleId: '', jobRoleText: '',
  availabilityDate: '', notes: '',
};

function StarScore({ value, onChange, readOnly }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => !readOnly && onChange(value === n ? null : n)}
          className={`text-xl leading-none ${n <= value ? 'text-amber-400' : 'text-gray-200'} ${readOnly ? '' : 'hover:text-amber-300 cursor-pointer'}`}
        >
          ★
        </button>
      ))}
      {value && <span className="text-xs text-gray-500 ml-1 self-center">{SCORE_LABELS[value]}</span>}
    </div>
  );
}

export default function TalentPipeline() {
  const [candidates, setCandidates] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState(null); // full candidate for detail panel
  const [detailLoading, setDetailLoading] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [stageModal, setStageModal] = useState(null); // { candidateId, currentStage }
  const [stageNote, setStageNote] = useState('');
  const [stageTo, setStageTo] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [cvParsing, setCvParsing] = useState(false);
  const [parseMsg, setParseMsg] = useState(null); // { type: 'success'|'error', text }
  const cvInputRef = useRef(null);

  const load = async () => {
    const [c, jr] = await Promise.all([listCandidates(), getJobRoles()]);
    setCandidates(c);
    setJobRoles(jr.filter(r => r.is_active));
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openDetail = async (id) => {
    setDetailLoading(true);
    setSelected(null);
    setEditMode(false);
    setParseMsg(null);
    const c = await getCandidate(id);
    setSelected(c);
    setDetailLoading(false);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createCandidate(form);
      setShowCreate(false);
      setForm(emptyForm);
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to create candidate');
    } finally { setSaving(false); }
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      await updateCandidate(selected.id, editForm);
      const refreshed = await getCandidate(selected.id);
      setSelected(refreshed);
      await load();
      setEditMode(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleStageChange = async () => {
    if (!stageTo) return;
    await changeStage(stageModal.candidateId, stageTo, stageNote);
    setStageModal(null);
    setStageNote('');
    setStageTo('');
    await load();
    if (selected?.id === stageModal.candidateId) {
      const refreshed = await getCandidate(stageModal.candidateId);
      setSelected(refreshed);
    }
  };

  const handleCVUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selected) return;
    setCvUploading(true);
    try {
      const result = await uploadCV(selected.id, file);
      setSelected(s => ({ ...s, cv_path: result.cvPath, cv_filename: result.cvFilename }));
      await load();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setCvUploading(false);
      e.target.value = '';
    }
  };

  const handleParseCV = async () => {
    setCvParsing(true);
    setParseMsg(null);
    try {
      const data = await parseCV(selected.id);
      setSelected(s => ({ ...s, cv_skills: data.skills?.join(', ') || s.cv_skills }));
      // Enter edit mode pre-filling only empty fields
      setEditForm({
        firstName:         selected.first_name        || data.firstName    || '',
        lastName:          selected.last_name         || data.lastName     || '',
        email:             selected.email             || data.email        || '',
        phone:             selected.phone             || data.phone        || '',
        linkedinUrl:       selected.linkedin_url      || data.linkedinUrl  || '',
        employmentType:    selected.employment_type   || '',
        jobRoleId:         selected.job_role_id       || '',
        jobRoleText:       selected.job_role_text     || data.jobRoleText  || '',
        availabilityDate:  selected.availability_date?.slice(0, 10) || '',
        notes:             selected.notes             || (data.summary ? `${data.summary}` : ''),
        verified:          selected.verified          || false,
        verificationNotes: selected.verification_notes || '',
        interviewDate:     selected.interview_date?.slice(0, 16) || '',
        interviewPanel:    selected.interview_panel   || '',
        interviewScore:    selected.interview_score   || null,
        interviewFeedback: selected.interview_feedback || '',
      });
      setEditMode(true);
      setParseMsg({ type: 'success', text: `AI extracted ${data.skills?.length || 0} skills and ${Object.values(data).filter(v => v && v !== data.skills).length} fields from CV.` });
    } catch (err) {
      setParseMsg({ type: 'error', text: err.response?.data?.error || 'Failed to parse CV. Please try again.' });
    } finally {
      setCvParsing(false);
    }
  };

  const handleDeleteCV = async () => {
    if (!window.confirm('Remove CV?')) return;
    await deleteCV(selected.id);
    setSelected(s => ({ ...s, cv_path: null, cv_filename: null, cv_skills: null }));
    setParseMsg(null);
    await load();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this candidate?')) return;
    await deleteCandidate(id);
    if (selected?.id === id) setSelected(null);
    await load();
  };

  const byStage = Object.fromEntries(STAGES.map(s => [s.key, []]));
  for (const c of candidates) {
    if (byStage[c.stage]) byStage[c.stage].push(c);
  }

  const startEdit = () => {
    setEditForm({
      firstName: selected.first_name,
      lastName: selected.last_name,
      email: selected.email || '',
      phone: selected.phone || '',
      linkedinUrl: selected.linkedin_url || '',
      employmentType: selected.employment_type || '',
      jobRoleId: selected.job_role_id || '',
      jobRoleText: selected.job_role_text || '',
      availabilityDate: selected.availability_date?.slice(0, 10) || '',
      notes: selected.notes || '',
      verified: selected.verified || false,
      verificationNotes: selected.verification_notes || '',
      interviewDate: selected.interview_date?.slice(0, 16) || '',
      interviewPanel: selected.interview_panel || '',
      interviewScore: selected.interview_score || null,
      interviewFeedback: selected.interview_feedback || '',
    });
    setEditMode(true);
  };

  if (loading) return <div className="p-6 text-gray-400">Loading...</div>;

  const stageInfo = selected ? STAGE_MAP[selected.stage] : null;

  return (
    <div className="p-6 max-w-full">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Talent Pipeline</h1>
          <p className="text-sm text-gray-400 mt-0.5">{candidates.length} candidate{candidates.length !== 1 ? 's' : ''} in pipeline</p>
        </div>
        <Button onClick={() => { setForm(emptyForm); setShowCreate(true); }}>+ Add Candidate</Button>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* Kanban columns */}
        <div className="flex gap-4 min-w-max">
          {STAGES.map(stage => (
            <div key={stage.key} className="w-56 flex-shrink-0">
              <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg border-b-2 mb-2 ${stage.colour}`}>
                <span className="text-xs font-semibold uppercase tracking-wide">{stage.label}</span>
                <span className="text-xs font-bold">{byStage[stage.key].length}</span>
              </div>
              <div className="space-y-2">
                {byStage[stage.key].map(c => (
                  <div
                    key={c.id}
                    onClick={() => openDetail(c.id)}
                    className={`bg-white border rounded-xl p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${selected?.id === c.id ? 'ring-2 ring-blue-400' : 'border-gray-200'}`}
                  >
                    <div className="font-medium text-sm">{c.first_name} {c.last_name}</div>
                    {c.job_role_name || c.job_role_text ? (
                      <div className="text-xs text-gray-500 mt-0.5">{c.job_role_name || c.job_role_text}</div>
                    ) : null}
                    <div className="flex flex-wrap gap-1 mt-2">
                      {c.employment_type && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${c.employment_type === 'permanent' ? 'bg-green-50 text-green-700' : 'bg-orange-50 text-orange-700'}`}>
                          {c.employment_type === 'permanent' ? 'Permanent' : 'Contractor'}
                        </span>
                      )}
                      {c.cv_path && <span className="text-xs px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">CV</span>}
                      {c.verified && <span className="text-xs px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-600 font-medium">Verified</span>}
                    </div>
                    {c.availability_date && (
                      <div className="text-xs text-gray-400 mt-1">Available {c.availability_date.slice(0, 10)}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {(detailLoading || selected) && (
          <div className="w-96 flex-shrink-0 bg-white border border-gray-200 rounded-xl shadow-sm p-5 self-start sticky top-6 max-h-[85vh] overflow-y-auto">
            {detailLoading && <div className="text-gray-400 text-sm">Loading...</div>}
            {selected && !detailLoading && (
              <>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="font-bold text-lg">{selected.first_name} {selected.last_name}</h2>
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-semibold mt-1 border ${stageInfo?.colour}`}>
                      {stageInfo?.label}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {!editMode && <Button variant="secondary" className="py-1 px-2 text-xs" onClick={startEdit}>Edit</Button>}
                    <Button variant="danger" className="py-1 px-2 text-xs" onClick={() => handleDelete(selected.id)}>Delete</Button>
                  </div>
                </div>

                {/* Stage change */}
                <div className="mb-4">
                  <Button
                    variant="secondary"
                    className="w-full text-xs py-1.5"
                    onClick={() => { setStageModal({ candidateId: selected.id, currentStage: selected.stage }); setStageTo(''); setStageNote(''); }}
                  >
                    Move to Stage →
                  </Button>
                </div>

                {editMode ? (
                  <div className="space-y-3 text-sm">
                    <div className="grid grid-cols-2 gap-2">
                      {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([k, l]) => (
                        <div key={k}>
                          <label className="block text-xs font-medium mb-0.5 text-gray-600">{l}</label>
                          <input className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                            value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
                        </div>
                      ))}
                    </div>
                    {[['email', 'Email', 'email'], ['phone', 'Phone', 'text'], ['linkedinUrl', 'LinkedIn URL', 'url']].map(([k, l, t]) => (
                      <div key={k}>
                        <label className="block text-xs font-medium mb-0.5 text-gray-600">{l}</label>
                        <input type={t} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                          value={editForm[k]} onChange={e => setEditForm(f => ({ ...f, [k]: e.target.value }))} />
                      </div>
                    ))}
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Employment Type</label>
                      <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        value={editForm.employmentType} onChange={e => setEditForm(f => ({ ...f, employmentType: e.target.value }))}>
                        <option value="">Not set</option>
                        <option value="permanent">Permanent</option>
                        <option value="contractor">Contractor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Job Role</label>
                      <select className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        value={editForm.jobRoleId} onChange={e => setEditForm(f => ({ ...f, jobRoleId: e.target.value }))}>
                        <option value="">— Select —</option>
                        {jobRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Or free-text role</label>
                      <input className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        placeholder="e.g. Senior React Developer"
                        value={editForm.jobRoleText} onChange={e => setEditForm(f => ({ ...f, jobRoleText: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Availability Date</label>
                      <input type="date" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        value={editForm.availabilityDate} onChange={e => setEditForm(f => ({ ...f, availabilityDate: e.target.value }))} />
                    </div>

                    <hr className="my-2" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Verification</p>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={editForm.verified}
                        onChange={e => setEditForm(f => ({ ...f, verified: e.target.checked }))} />
                      Verified
                    </label>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Verification Notes</label>
                      <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm resize-none"
                        value={editForm.verificationNotes} onChange={e => setEditForm(f => ({ ...f, verificationNotes: e.target.value }))} />
                    </div>

                    <hr className="my-2" />
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Panel Interview</p>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Interview Date & Time</label>
                      <input type="datetime-local" className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        value={editForm.interviewDate} onChange={e => setEditForm(f => ({ ...f, interviewDate: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Panel Members</label>
                      <input className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
                        placeholder="e.g. Jane Smith, Tom Brown"
                        value={editForm.interviewPanel} onChange={e => setEditForm(f => ({ ...f, interviewPanel: e.target.value }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Interview Score</label>
                      <StarScore value={editForm.interviewScore} onChange={v => setEditForm(f => ({ ...f, interviewScore: v }))} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Interview Feedback</label>
                      <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm resize-none"
                        value={editForm.interviewFeedback} onChange={e => setEditForm(f => ({ ...f, interviewFeedback: e.target.value }))} />
                    </div>

                    <hr className="my-2" />
                    <div>
                      <label className="block text-xs font-medium mb-0.5 text-gray-600">Notes</label>
                      <textarea rows={3} className="w-full border border-gray-300 rounded-lg px-2 py-1.5 text-sm resize-none"
                        value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button loading={saving} onClick={handleSaveEdit} className="flex-1">Save</Button>
                      <Button variant="secondary" onClick={() => setEditMode(false)} className="flex-1">Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 text-sm">
                    {/* Basic info */}
                    <Section title="Contact">
                      <Field label="Email" value={selected.email} link={selected.email ? `mailto:${selected.email}` : null} />
                      <Field label="Phone" value={selected.phone} />
                      <Field label="LinkedIn" value={selected.linkedin_url} link={selected.linkedin_url} />
                    </Section>

                    <Section title="Role">
                      <Field label="Type" value={selected.employment_type === 'permanent' ? 'Permanent' : selected.employment_type === 'contractor' ? 'Contractor' : null} />
                      <Field label="Job Role" value={selected.job_role_name || selected.job_role_text} />
                      <Field label="Available From" value={selected.availability_date?.slice(0, 10)} />
                    </Section>

                    {/* CV */}
                    <Section title="CV / Resume">
                      {selected.cv_path ? (
                        <>
                          <div className="flex items-center gap-2">
                            <a href={selected.cv_path} target="_blank" rel="noreferrer"
                              className="text-blue-600 hover:underline text-xs truncate flex-1">
                              {selected.cv_filename || 'Download CV'}
                            </a>
                            <button className="text-red-500 text-xs hover:underline" onClick={handleDeleteCV}>Remove</button>
                          </div>
                          <button
                            className="mt-1 text-xs text-purple-600 hover:underline disabled:opacity-50"
                            onClick={handleParseCV}
                            disabled={cvParsing}
                          >
                            {cvParsing ? 'Extracting…' : '✦ Extract info with AI'}
                          </button>
                          {parseMsg && (
                            <p className={`text-xs mt-1 ${parseMsg.type === 'success' ? 'text-green-600' : 'text-red-500'}`}>
                              {parseMsg.text}
                            </p>
                          )}
                        </>
                      ) : (
                        <button className="text-xs text-blue-600 hover:underline" onClick={() => cvInputRef.current?.click()}>
                          {cvUploading ? 'Uploading…' : '+ Upload CV (PDF/DOC)'}
                        </button>
                      )}
                      <input ref={cvInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleCVUpload} />
                    </Section>

                    {/* AI-extracted skills */}
                    {selected.cv_skills && (
                      <Section title="Extracted Skills">
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {selected.cv_skills.split(',').map(s => s.trim()).filter(Boolean).map(skill => (
                            <span key={skill} className="text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">
                              {skill}
                            </span>
                          ))}
                        </div>
                      </Section>
                    )}

                    {/* Verification */}
                    <Section title="Verification">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selected.verified ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span>{selected.verified ? 'Verified' : 'Not verified'}</span>
                      </div>
                      {selected.verification_notes && <p className="text-gray-500 text-xs mt-1">{selected.verification_notes}</p>}
                    </Section>

                    {/* Interview */}
                    <Section title="Panel Interview">
                      <Field label="Date" value={selected.interview_date ? new Date(selected.interview_date).toLocaleString() : null} />
                      <Field label="Panel" value={selected.interview_panel} />
                      {selected.interview_score && (
                        <div>
                          <span className="text-gray-500 text-xs">Score: </span>
                          <StarScore value={selected.interview_score} readOnly />
                        </div>
                      )}
                      {selected.interview_feedback && <p className="text-gray-500 text-xs mt-1">{selected.interview_feedback}</p>}
                    </Section>

                    {selected.notes && (
                      <Section title="Notes">
                        <p className="text-gray-600 text-xs whitespace-pre-wrap">{selected.notes}</p>
                      </Section>
                    )}

                    {/* Stage history */}
                    {selected.history?.length > 0 && (
                      <Section title="Stage History">
                        <ol className="space-y-1">
                          {selected.history.map((h, i) => (
                            <li key={i} className="flex gap-2 text-xs">
                              <span className="text-gray-400 shrink-0">{new Date(h.created_at).toLocaleDateString()}</span>
                              <span className="text-gray-600">
                                {h.from_stage ? <>{STAGE_MAP[h.from_stage]?.label} → </> : null}
                                <strong>{STAGE_MAP[h.to_stage]?.label}</strong>
                                {h.note ? <> — {h.note}</> : null}
                              </span>
                            </li>
                          ))}
                        </ol>
                      </Section>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Create modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Add Candidate">
        <form onSubmit={handleCreate} className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3">
            {[['firstName', 'First Name *'], ['lastName', 'Last Name *']].map(([k, l]) => (
              <div key={k}>
                <label className="block text-xs font-medium mb-1">{l}</label>
                <input required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
              </div>
            ))}
          </div>
          {[['email', 'Email', 'email'], ['phone', 'Phone', 'text'], ['linkedinUrl', 'LinkedIn URL', 'url']].map(([k, l, t]) => (
            <div key={k}>
              <label className="block text-xs font-medium mb-1">{l}</label>
              <input type={t} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form[k]} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} />
            </div>
          ))}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Employment Type</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.employmentType} onChange={e => setForm(f => ({ ...f, employmentType: e.target.value }))}>
                <option value="">Not set</option>
                <option value="permanent">Permanent</option>
                <option value="contractor">Contractor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Availability Date</label>
              <input type="date" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                value={form.availabilityDate} onChange={e => setForm(f => ({ ...f, availabilityDate: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Job Role</label>
            <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              value={form.jobRoleId} onChange={e => setForm(f => ({ ...f, jobRoleId: e.target.value }))}>
              <option value="">— Select from catalogue —</option>
              {jobRoles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Or specify role</label>
            <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="e.g. Senior React Developer"
              value={form.jobRoleText} onChange={e => setForm(f => ({ ...f, jobRoleText: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Notes</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add to Pipeline</Button>
          </div>
        </form>
      </Modal>

      {/* Stage change modal */}
      <Modal open={!!stageModal} onClose={() => setStageModal(null)} title="Move to Stage">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {STAGES.filter(s => s.key !== stageModal?.currentStage).map(s => (
              <button
                key={s.key}
                onClick={() => setStageTo(s.key)}
                className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${stageTo === s.key ? 'ring-2 ring-blue-400' : ''} ${s.colour}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Note (optional)</label>
            <textarea rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
              placeholder="e.g. Interview scheduled for Monday"
              value={stageNote} onChange={e => setStageNote(e.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setStageModal(null)}>Cancel</Button>
            <Button onClick={handleStageChange} disabled={!stageTo}>Move</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, link }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 text-xs">
      <span className="text-gray-400 w-20 shrink-0">{label}</span>
      {link
        ? <a href={link} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline truncate">{value}</a>
        : <span className="text-gray-700">{value}</span>
      }
    </div>
  );
}
