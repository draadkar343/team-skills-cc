import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getResourcingStats } from '../../api/resourcingApi';
import NewsFeed from '../../components/common/NewsFeed';

const STAGE_LABELS = {
  sourced:     'Sourced',
  screening:   'Screening',
  interviewing:'Interviewing',
  offered:     'Offered',
  hired:       'Hired',
  rejected:    'Rejected',
  withdrawn:   'Withdrawn',
};

const STAGE_COLOURS = {
  sourced:      'bg-gray-100 text-gray-700',
  screening:    'bg-blue-100 text-blue-700',
  interviewing: 'bg-purple-100 text-purple-700',
  offered:      'bg-yellow-100 text-yellow-700',
  hired:        'bg-green-100 text-green-700',
  rejected:     'bg-red-100 text-red-700',
  withdrawn:    'bg-gray-100 text-gray-500',
};

function StatCard({ value, label, colour, to }) {
  const inner = (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border ${colour} p-5 shadow-sm hover:shadow-md transition-shadow text-center`}>
      <div className="text-4xl font-bold">{value}</div>
      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{label}</div>
    </div>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

export default function ResourcingDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getResourcingStats()
      .then(setStats)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-400 dark:text-gray-500">Loading...</div>;

  const alloc = stats?.allocation || {};
  const totalPipeline = (stats?.pipeline || []).reduce((s, r) => s + r.count, 0);
  const activePipeline = (stats?.pipeline || [])
    .filter(r => !['hired', 'rejected', 'withdrawn'].includes(r.stage))
    .reduce((s, r) => s + r.count, 0);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Resourcing Dashboard</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Welcome, {user?.firstName}!</p>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          value={stats?.headcount ?? 0}
          label="Active Employees"
          colour="border-blue-200"
          to="/resourcing"
        />
        <StatCard
          value={stats?.squads ?? 0}
          label="Squads"
          colour="border-indigo-200"
          to="/workload"
        />
        <StatCard
          value={activePipeline}
          label="Active Candidates"
          colour="border-purple-200"
          to="/talent-pipeline"
        />
        <StatCard
          value={alloc.over ?? 0}
          label="Over-allocated"
          colour={alloc.over > 0 ? "border-red-300" : "border-green-200"}
          to="/resourcing"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Allocation breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Allocation Breakdown</h2>
          <div className="space-y-3">
            {[
              { label: 'Unallocated (0%)',       value: alloc.unallocated, bar: 'bg-gray-300',   text: 'text-gray-600 dark:text-gray-400' },
              { label: 'Partially allocated',    value: alloc.partial,     bar: 'bg-blue-400',   text: 'text-blue-600' },
              { label: 'Fully allocated (100%)', value: alloc.fully,       bar: 'bg-green-500',  text: 'text-green-600' },
              { label: 'Over-allocated (>100%)', value: alloc.over,        bar: 'bg-red-500',    text: 'text-red-600' },
            ].map(row => (
              <div key={row.label} className="flex items-center gap-3">
                <div className="w-36 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">{row.label}</div>
                <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full ${row.bar}`}
                    style={{ width: stats?.headcount ? `${Math.min((row.value / stats.headcount) * 100, 100)}%` : '0%' }}
                  />
                </div>
                <span className={`text-sm font-semibold w-6 text-right ${row.text}`}>{row.value}</span>
              </div>
            ))}
          </div>
          <Link to="/resourcing" className="mt-4 inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View full resourcing overview →
          </Link>
        </div>

        {/* Talent pipeline breakdown */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Talent Pipeline</h2>
            <span className="text-xs text-gray-400">{totalPipeline} total</span>
          </div>
          {stats?.pipeline?.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">No candidates yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.pipeline.map(r => (
                <div key={r.stage} className="flex items-center justify-between">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLOURS[r.stage] || 'bg-gray-100 text-gray-600'}`}>
                    {STAGE_LABELS[r.stage] || r.stage}
                  </span>
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{r.count}</span>
                </div>
              ))}
            </div>
          )}
          <Link to="/talent-pipeline" className="mt-4 inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline">
            View talent pipeline →
          </Link>
        </div>
      </div>

      {/* Recent candidates */}
      {stats?.recentCandidates?.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 shadow-sm mb-6">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Candidates</h2>
          <div className="space-y-2">
            {stats.recentCandidates.map((c, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">{c.job_role_name || c.job_role_text || '—'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STAGE_COLOURS[c.stage] || 'bg-gray-100 text-gray-600'}`}>
                    {STAGE_LABELS[c.stage] || c.stage}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <NewsFeed />
    </div>
  );
}
