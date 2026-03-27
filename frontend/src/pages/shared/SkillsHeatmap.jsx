import React, { useEffect, useState } from 'react';
import { getSkillsHeatmap } from '../../api/skillsHeatmapApi';

function weightColor(weighting, status) {
  if (!weighting && weighting !== 0) return { bg: 'bg-gray-100', text: 'text-gray-300', label: '' };
  if (status !== 'approved') return { bg: 'bg-yellow-100', text: 'text-yellow-600', label: `${weighting}%` };
  if (weighting >= 67) return { bg: 'bg-green-200', text: 'text-green-800', label: `${weighting}%` };
  if (weighting >= 34) return { bg: 'bg-yellow-200', text: 'text-yellow-800', label: `${weighting}%` };
  return { bg: 'bg-red-200', text: 'text-red-800', label: `${weighting}%` };
}

export default function SkillsHeatmap() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');

  useEffect(() => {
    getSkillsHeatmap()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-500">Loading heatmap...</div>;
  if (!data) return <div className="p-6 text-red-500">Failed to load heatmap.</div>;

  const { employees, skills, matrix } = data;

  const categories = [...new Set(skills.map(s => s.category_name || 'Uncategorised'))].sort();

  const filteredSkills = categoryFilter
    ? skills.filter(s => (s.category_name || 'Uncategorised') === categoryFilter)
    : skills;

  if (!employees.length) {
    return (
      <div className="p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">Skills Heatmap</h1>
        <p className="text-gray-500">No team members found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-full mx-auto">
      <h1 className="text-2xl font-bold mb-1">Skills Heatmap</h1>
      <p className="text-gray-500 text-sm mb-4">Colour shows approved skill weighting. Yellow = pending/rejected.</p>

      <div className="flex items-center gap-4 mb-4 flex-wrap">
        <select
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 inline-block" /> 67–100%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-200 inline-block" /> 34–66%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 inline-block" /> 1–33%</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-100 inline-block" /> Pending</span>
          <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-100 inline-block" /> None</span>
        </div>
      </div>

      <div className="overflow-auto rounded-xl border border-gray-200 shadow-sm bg-white">
        <table className="text-xs border-collapse" style={{ minWidth: `${filteredSkills.length * 60 + 180}px` }}>
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left p-3 font-medium text-gray-600 border-b border-r border-gray-200 sticky left-0 bg-gray-50 z-10 min-w-[160px]">
                Employee
              </th>
              {filteredSkills.map(s => (
                <th key={s.id} className="border-b border-gray-200 p-1 font-medium text-gray-600 text-center" style={{ minWidth: '56px' }}>
                  <div className="writing-mode-vertical transform -rotate-45 origin-bottom-left h-16 flex items-end pb-1 whitespace-nowrap overflow-hidden text-ellipsis" style={{ maxWidth: '56px' }}>
                    {s.name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.id} className="hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-700 border-r border-b border-gray-100 sticky left-0 bg-white">
                  {emp.name}
                </td>
                {filteredSkills.map(s => {
                  const cell = matrix[`${emp.id}_${s.id}`];
                  const { bg, text, label } = weightColor(cell?.weighting, cell?.status);
                  return (
                    <td key={s.id} className={`border-b border-r border-gray-100 text-center ${bg}`} style={{ minWidth: '56px', height: '36px' }}>
                      <span className={`font-semibold ${text}`}>{label}</span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
