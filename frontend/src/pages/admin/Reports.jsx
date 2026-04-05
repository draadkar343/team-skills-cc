import React, { useState, useEffect, useCallback } from 'react';
import {
  getSkillsReport, getTimesheetReport, getCertReport,
  getLeaveReport, getAllocationReport, getTalentReport, getKudosReport,
} from '../../api/reportsApi';

// ── Helpers ────────────────────────────────────────────────────────────────

function exportCsv(filename, rows) {
  if (!rows.length) return;
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => {
      const v = r[h] ?? '';
      return String(v).includes(',') ? `"${v}"` : v;
    }).join(',')),
  ];
  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

function StatCard({ label, value, sub, color = 'blue' }) {
  const colors = {
    blue:   'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
    green:  'bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    amber:  'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    red:    'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300',
    purple: 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
  };
  return (
    <div className={`rounded-xl p-4 ${colors[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs mt-1 opacity-60">{sub}</p>}
    </div>
  );
}

function BarChart({ rows, labelKey, valueKey, colorClass = 'bg-blue-500' }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 italic">No data</p>;
  const max = Math.max(...rows.map(r => Number(r[valueKey]) || 0), 1);
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={i} className="flex items-center gap-3 text-sm">
          <span className="w-36 shrink-0 truncate text-gray-700 dark:text-gray-300 text-right" title={r[labelKey]}>{r[labelKey]}</span>
          <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-5 overflow-hidden">
            <div
              className={`h-full rounded-full ${colorClass} transition-all duration-500`}
              style={{ width: `${Math.max((Number(r[valueKey]) / max) * 100, 2)}%` }}
            />
          </div>
          <span className="w-10 text-right text-gray-600 dark:text-gray-400 font-medium">{r[valueKey]}</span>
        </div>
      ))}
    </div>
  );
}

function SectionHeader({ title, onExport }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">{title}</h3>
      {onExport && (
        <button
          onClick={onExport}
          className="text-xs px-3 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg transition-colors"
        >
          Export CSV
        </button>
      )}
    </div>
  );
}

function Table({ cols, rows, emptyMsg = 'No data' }) {
  if (!rows?.length) return <p className="text-sm text-gray-400 italic py-4 text-center">{emptyMsg}</p>;
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs uppercase">
          <tr>{cols.map(c => <th key={c.key} className="px-3 py-2 text-left whitespace-nowrap">{c.label}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
          {rows.map((r, i) => (
            <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-750">
              {cols.map(c => (
                <td key={c.key} className="px-3 py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {c.render ? c.render(r[c.key], r) : (r[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DateRange({ from, to, onChange }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="text-gray-500 dark:text-gray-400">From</label>
      <input type="date" value={from} onChange={e => onChange(e.target.value, to)}
        className="border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
      <label className="text-gray-500 dark:text-gray-400">To</label>
      <input type="date" value={to} onChange={e => onChange(from, e.target.value)}
        className="border rounded-lg px-2 py-1 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white" />
    </div>
  );
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-20 text-gray-400">
      <svg className="w-6 h-6 animate-spin-fast mr-2" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
      </svg>
      Loading…
    </div>
  );
}

// ── Tab Reports ─────────────────────────────────────────────────────────────

function SkillsTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getSkillsReport().then(setData).catch(() => setData({})); }, []);
  if (!data) return <Loading />;

  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Unique Skills Adopted"   value={s.unique_skills_approved}   color="blue" />
        <StatCard label="Employees with Skills"   value={s.employees_with_skills}    color="green" />
        <StatCard label="Pending Approvals"       value={s.pending_approvals}        color="amber" />
        <StatCard label="Avg Weighting"           value={s.avg_weighting ? `${s.avg_weighting}%` : '—'} color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Top 20 Skills by Adoption" onExport={() => exportCsv('top-skills.csv', data.topSkills || [])} />
          <BarChart rows={data.topSkills} labelKey="skill_name" valueKey="employee_count" colorClass="bg-blue-500" />
        </div>
        <div>
          <SectionHeader title="Skills by Category" onExport={() => exportCsv('skills-by-category.csv', data.byCategory || [])} />
          <BarChart rows={data.byCategory} labelKey="category" valueKey="count" colorClass="bg-purple-500" />
        </div>
      </div>

      <div>
        <SectionHeader title="Status Breakdown" />
        <div className="flex gap-4 flex-wrap">
          {(data.statusBreakdown || []).map(r => {
            const colors = { approved: 'green', pending: 'amber', draft: 'blue', rejected: 'red' };
            return <StatCard key={r.status} label={r.status} value={r.count} color={colors[r.status] || 'blue'} />;
          })}
        </div>
      </div>

      <div>
        <SectionHeader title="Skills by Squad" onExport={() => exportCsv('skills-by-squad.csv', data.bySquad || [])} />
        <Table
          rows={data.bySquad}
          cols={[
            { key: 'squad_name',     label: 'Squad' },
            { key: 'members',        label: 'Members' },
            { key: 'unique_skills',  label: 'Unique Skills' },
            { key: 'total_approved', label: 'Total Approved' },
          ]}
        />
      </div>

      <div>
        <SectionHeader title="Top 20 Skills Detail" onExport={() => exportCsv('top-skills-detail.csv', data.topSkills || [])} />
        <Table
          rows={data.topSkills}
          cols={[
            { key: 'skill_name',     label: 'Skill' },
            { key: 'category',       label: 'Category' },
            { key: 'employee_count', label: 'Employees' },
            { key: 'avg_weighting',  label: 'Avg Weighting', render: v => v ? `${v}%` : '—' },
          ]}
        />
      </div>
    </div>
  );
}

function TimesheetsTab() {
  const today = new Date().toISOString().slice(0, 10);
  const ninetyAgo = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(ninetyAgo);
  const [to, setTo]     = useState(today);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setData(null);
    getTimesheetReport(from, to).then(setData).catch(() => setData({}));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);

  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Timesheets"   value={s.total_timesheets}    color="blue" />
        <StatCard label="Unique Employees"   value={s.unique_employees}    color="green" />
        <StatCard label="Total Hours"        value={Number(s.total_hours || 0).toFixed(0)} color="purple" />
        <StatCard label="Avg Hrs / Sheet"    value={s.avg_hours_per_sheet} color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Hours by Employee (top 20)" onExport={() => exportCsv('timesheet-by-employee.csv', data.byEmployee || [])} />
          <BarChart rows={(data.byEmployee || []).slice(0, 20)} labelKey="employee" valueKey="total_hours" colorClass="bg-green-500" />
        </div>
        <div>
          <SectionHeader title="Weekly Submissions (last 12)" />
          <BarChart rows={[...(data.byWeek || [])].reverse()} labelKey="week" valueKey="total_hours" colorClass="bg-blue-400" />
        </div>
      </div>

      <div>
        <SectionHeader title="Status Breakdown" />
        <div className="flex gap-4 flex-wrap">
          {(data.byStatus || []).map(r => {
            const colors = { approved: 'green', pending: 'amber', draft: 'blue', rejected: 'red', submitted: 'purple' };
            return <StatCard key={r.status} label={r.status} value={r.count} color={colors[r.status] || 'blue'} sub={`${Number(r.total_hours).toFixed(0)} hrs`} />;
          })}
        </div>
      </div>

      <div>
        <SectionHeader title="All Employees" onExport={() => exportCsv('timesheet-employees.csv', data.byEmployee || [])} />
        <Table
          rows={data.byEmployee}
          cols={[
            { key: 'employee',        label: 'Employee' },
            { key: 'squad',           label: 'Squad' },
            { key: 'timesheet_count', label: 'Sheets' },
            { key: 'total_hours',     label: 'Total Hours', render: v => Number(v).toFixed(1) },
            { key: 'avg_hours',       label: 'Avg Hours' },
            { key: 'approved_count',  label: 'Approved' },
          ]}
        />
      </div>
    </div>
  );
}

function CertsTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getCertReport().then(setData).catch(() => setData({})); }, []);
  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Certifications"  value={s.total}         color="blue" />
        <StatCard label="Approved"              value={s.approved}      color="green" />
        <StatCard label="Expiring within 90d"  value={s.expiring_soon} color="amber" />
        <StatCard label="Expired"              value={s.expired}       color="red" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="By Provider" onExport={() => exportCsv('certs-by-provider.csv', data.byProvider || [])} />
          <BarChart rows={data.byProvider} labelKey="provider" valueKey="count" colorClass="bg-green-500" />
        </div>
        <div>
          <SectionHeader title="Status Breakdown" />
          <div className="space-y-3 mt-2">
            {(data.byStatus || []).map(r => {
              const colors = { approved: 'green', pending: 'amber', draft: 'blue', rejected: 'red' };
              return <StatCard key={r.status} label={r.status} value={r.count} color={colors[r.status] || 'blue'} />;
            })}
          </div>
        </div>
      </div>

      <div>
        <SectionHeader title="Expiring within 90 Days" onExport={() => exportCsv('expiring-certs.csv', data.expiringSoon || [])} />
        <Table
          rows={data.expiringSoon}
          emptyMsg="No certifications expiring in the next 90 days"
          cols={[
            { key: 'employee',        label: 'Employee' },
            { key: 'cert_name',       label: 'Certification' },
            { key: 'provider',        label: 'Provider' },
            { key: 'expiration_date', label: 'Expires', render: v => v ? new Date(v).toLocaleDateString() : '—' },
            { key: 'days_remaining',  label: 'Days Left', render: v => (
              <span className={Number(v) < 30 ? 'text-red-600 font-semibold' : 'text-amber-600'}>{v}</span>
            )},
          ]}
        />
      </div>
    </div>
  );
}

function LeaveTab() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(yearStart);
  const [to, setTo]     = useState(today);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setData(null);
    getLeaveReport(from, to).then(setData).catch(() => setData({}));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Requests"    value={s.total_requests}      color="blue" />
        <StatCard label="Approved Days"     value={Number(s.total_days_approved || 0).toFixed(1)} color="green" />
        <StatCard label="Pending"           value={s.pending}             color="amber" />
        <StatCard label="Rejected"          value={s.rejected}            color="red" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Days by Leave Type" onExport={() => exportCsv('leave-by-type.csv', data.byType || [])} />
          <BarChart rows={data.byType} labelKey="leave_type" valueKey="total_days" colorClass="bg-blue-500" />
        </div>
        <div>
          <SectionHeader title="Monthly Trend" />
          <BarChart rows={[...(data.byMonth || [])].reverse()} labelKey="month" valueKey="approved_days" colorClass="bg-green-400" />
        </div>
      </div>

      <div>
        <SectionHeader title="Leave by Leave Type" onExport={() => exportCsv('leave-by-type.csv', data.byType || [])} />
        <Table
          rows={data.byType}
          cols={[
            { key: 'leave_type',    label: 'Type' },
            { key: 'request_count', label: 'Requests' },
            { key: 'total_days',    label: 'Days Approved', render: v => Number(v).toFixed(1) },
          ]}
        />
      </div>

      <div>
        <SectionHeader title="Leave by Employee" onExport={() => exportCsv('leave-by-employee.csv', data.byEmployee || [])} />
        <Table
          rows={data.byEmployee}
          cols={[
            { key: 'employee',      label: 'Employee' },
            { key: 'squad',         label: 'Squad' },
            { key: 'request_count', label: 'Requests' },
            { key: 'days_taken',    label: 'Days Approved', render: v => Number(v).toFixed(1) },
          ]}
        />
      </div>
    </div>
  );
}

function AllocationTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getAllocationReport().then(setData).catch(() => setData({})); }, []);
  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard label="Active Clients"       value={s.active_clients}        color="blue" />
        <StatCard label="Allocated Employees"  value={s.allocated_employees}   color="green" />
        <StatCard label="Avg Allocation %"     value={s.avg_allocation_pct ? `${s.avg_allocation_pct}%` : '—'} color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Headcount by Client" onExport={() => exportCsv('allocation-by-client.csv', data.byClient || [])} />
          <BarChart rows={data.byClient} labelKey="client_name" valueKey="headcount" colorClass="bg-blue-500" />
        </div>
        <div>
          <SectionHeader title="Grade Distribution" />
          <BarChart rows={data.byGrade} labelKey="grade" valueKey="count" colorClass="bg-purple-500" />
        </div>
      </div>

      <div>
        <SectionHeader title="Client Allocation Detail" onExport={() => exportCsv('client-detail.csv', data.byClient || [])} />
        <Table
          rows={data.byClient}
          cols={[
            { key: 'client_name', label: 'Client' },
            { key: 'headcount',   label: 'Headcount' },
            { key: 'avg_pct',     label: 'Avg %', render: v => v ? `${v}%` : '—' },
            { key: 'grade_a',     label: 'Grade A' },
            { key: 'grade_b',     label: 'Grade B' },
            { key: 'grade_c',     label: 'Grade C' },
          ]}
        />
      </div>

      <div>
        <SectionHeader title="Unallocated Employees" onExport={() => exportCsv('unallocated.csv', data.unallocated || [])} />
        <Table
          rows={data.unallocated}
          emptyMsg="All employees are allocated"
          cols={[
            { key: 'employee', label: 'Employee' },
            { key: 'job_role', label: 'Job Role' },
            { key: 'squad',    label: 'Squad' },
          ]}
        />
      </div>
    </div>
  );
}

function TalentTab() {
  const [data, setData] = useState(null);
  useEffect(() => { getTalentReport().then(setData).catch(() => setData({})); }, []);
  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Candidates"   value={s.total_candidates} color="blue" />
        <StatCard label="Offers Made"        value={s.offers}           color="amber" />
        <StatCard label="Hired"              value={s.hired}            color="green" />
        <StatCard label="Avg Interview Score" value={s.avg_score ? `${s.avg_score}/5` : '—'} color="purple" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Pipeline by Stage" onExport={() => exportCsv('talent-by-stage.csv', data.byStage || [])} />
          <BarChart rows={data.byStage} labelKey="stage" valueKey="count" colorClass="bg-amber-500" />
        </div>
        <div>
          <SectionHeader title="By Job Role" onExport={() => exportCsv('talent-by-role.csv', data.byJobRole || [])} />
          <BarChart rows={data.byJobRole} labelKey="job_role" valueKey="candidate_count" colorClass="bg-blue-500" />
        </div>
      </div>

      <div>
        <SectionHeader title="Recent Candidates" onExport={() => exportCsv('recent-candidates.csv', data.recent || [])} />
        <Table
          rows={data.recent}
          cols={[
            { key: 'candidate',       label: 'Candidate' },
            { key: 'job_role',        label: 'Role' },
            { key: 'stage',           label: 'Stage', render: v => (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                v === 'hired' ? 'bg-green-100 text-green-700' :
                v === 'rejected' ? 'bg-red-100 text-red-700' :
                v === 'offer_made' ? 'bg-amber-100 text-amber-700' :
                'bg-blue-100 text-blue-700'
              }`}>{v}</span>
            )},
            { key: 'interview_score', label: 'Score', render: v => v ? `${v}/5` : '—' },
            { key: 'added_on',        label: 'Added' },
          ]}
        />
      </div>
    </div>
  );
}

function KudosTab() {
  const today = new Date().toISOString().slice(0, 10);
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString().slice(0, 10);
  const [from, setFrom] = useState(yearStart);
  const [to, setTo]     = useState(today);
  const [data, setData] = useState(null);

  const load = useCallback(() => {
    setData(null);
    getKudosReport(from, to).then(setData).catch(() => setData({}));
  }, [from, to]);

  useEffect(() => { load(); }, [load]);
  if (!data) return <Loading />;
  const s = data.summary || {};
  return (
    <div className="space-y-8">
      <DateRange from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Kudos"        value={s.total}             color="blue" />
        <StatCard label="Unique Recipients"  value={s.unique_recipients} color="green" />
        <StatCard label="Unique Givers"      value={s.unique_givers}     color="purple" />
        <StatCard label="Categories Used"    value={s.categories_used}   color="amber" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Top Recipients" onExport={() => exportCsv('kudos-recipients.csv', data.topRecipients || [])} />
          <BarChart rows={data.topRecipients} labelKey="employee" valueKey="kudos_received" colorClass="bg-green-500" />
        </div>
        <div>
          <SectionHeader title="Top Givers" onExport={() => exportCsv('kudos-givers.csv', data.topGivers || [])} />
          <BarChart rows={data.topGivers} labelKey="employee" valueKey="kudos_given" colorClass="bg-blue-500" />
        </div>
      </div>

      <div>
        <SectionHeader title="By Category" onExport={() => exportCsv('kudos-by-category.csv', data.byCategory || [])} />
        <BarChart rows={data.byCategory} labelKey="category" valueKey="count" colorClass="bg-purple-500" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <SectionHeader title="Top Recipients Detail" />
          <Table
            rows={data.topRecipients}
            cols={[
              { key: 'employee',       label: 'Employee' },
              { key: 'squad',          label: 'Squad' },
              { key: 'kudos_received', label: 'Kudos' },
            ]}
          />
        </div>
        <div>
          <SectionHeader title="Top Givers Detail" />
          <Table
            rows={data.topGivers}
            cols={[
              { key: 'employee',   label: 'Employee' },
              { key: 'kudos_given', label: 'Kudos Given' },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'skills',     label: 'Skills',        Component: SkillsTab },
  { id: 'timesheets', label: 'Timesheets',    Component: TimesheetsTab },
  { id: 'certs',      label: 'Certifications', Component: CertsTab },
  { id: 'leave',      label: 'Leave',          Component: LeaveTab },
  { id: 'allocation', label: 'Allocations',    Component: AllocationTab },
  { id: 'talent',     label: 'Talent Pipeline', Component: TalentTab },
  { id: 'kudos',      label: 'Recognition',    Component: KudosTab },
];

export default function Reports() {
  const [activeTab, setActiveTab] = useState('skills');
  const Active = TABS.find(t => t.id === activeTab)?.Component;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Reports</h1>

      {/* Tab bar */}
      <div className="flex gap-1 flex-wrap mb-8 border-b border-gray-200 dark:border-gray-700">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${
              activeTab === t.id
                ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 border border-b-white dark:border-gray-600 dark:border-b-gray-800 -mb-px'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Active tab content */}
      {Active && <Active />}
    </div>
  );
}
