import React, { useEffect, useState } from 'react';
import { getMyOnboarding, toggleTask } from '../../api/onboardingApi';

export default function Onboarding() {
  const [data, setData]       = useState(undefined); // undefined = loading, null = none assigned
  const [toggling, setToggling] = useState(new Set());

  const load = () => getMyOnboarding().then(setData).catch(() => setData(null));
  useEffect(() => { load(); }, []);

  const handleToggle = async (taskId) => {
    if (toggling.has(taskId)) return;
    setToggling(prev => new Set([...prev, taskId]));
    try {
      await toggleTask(taskId);
      await load();
    } finally {
      setToggling(prev => { const n = new Set(prev); n.delete(taskId); return n; });
    }
  };

  if (data === undefined) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        <svg className="w-6 h-6 animate-spin-fast mr-2" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
        </svg>
        Loading…
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center">
        <div className="text-5xl mb-4">📋</div>
        <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-300 mb-2">No onboarding checklist assigned</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">Your administrator will assign an onboarding checklist when it's ready.</p>
      </div>
    );
  }

  const pctColor = data.pct === 100 ? 'bg-green-500' : data.pct >= 50 ? 'bg-blue-500' : 'bg-amber-400';

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{data.template_name}</h1>
        {data.description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{data.description}</p>}
        <p className="text-xs text-gray-400 mt-1">Assigned {new Date(data.assigned_at).toLocaleDateString()}</p>
      </div>

      {/* Progress bar */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-5 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {data.done} of {data.total} tasks complete
          </span>
          <span className={`text-sm font-bold ${data.pct === 100 ? 'text-green-600' : 'text-gray-600 dark:text-gray-300'}`}>
            {data.pct}%
          </span>
        </div>
        <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${pctColor}`}
            style={{ width: `${data.pct}%` }}
          />
        </div>
        {data.pct === 100 && (
          <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-2 text-center">
            🎉 Onboarding complete! Welcome to the team.
          </p>
        )}
      </div>

      {/* Task list */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow divide-y divide-gray-100 dark:divide-gray-700">
        {data.tasks.map((task, idx) => {
          const done = !!task.completed_at;
          const busy = toggling.has(task.id);
          return (
            <div
              key={task.id}
              className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors ${busy ? 'opacity-60' : ''}`}
              onClick={() => !busy && handleToggle(task.id)}
            >
              {/* Checkbox */}
              <div className={`mt-0.5 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                done ? 'bg-green-500 border-green-500' : 'border-gray-300 dark:border-gray-600'
              }`}>
                {done && (
                  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-6 shrink-0">{idx + 1}.</span>
                  <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800 dark:text-gray-200'}`}>
                    {task.title}
                  </p>
                </div>
                {task.description && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 ml-8">{task.description}</p>
                )}
              </div>

              {done && task.completed_at && (
                <span className="text-xs text-gray-400 shrink-0 mt-0.5">
                  {new Date(task.completed_at).toLocaleDateString()}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
