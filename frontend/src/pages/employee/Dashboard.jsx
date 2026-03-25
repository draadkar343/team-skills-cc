import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMySkills } from '../../api/skillsApi';
import { getMyTimesheets } from '../../api/timesheetApi';
import Badge from '../../components/common/Badge';

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [timesheets, setTimesheets] = useState([]);

  useEffect(() => {
    getMySkills().then(setSkills).catch(() => {});
    getMyTimesheets().then(setTimesheets).catch(() => {});
  }, []);

  const approved = skills.filter(s => s.status === 'approved').length;
  const pending = skills.filter(s => s.status === 'pending').length;
  const draft = skills.filter(s => s.status === 'draft').length;
  const rejected = skills.filter(s => s.status === 'rejected').length;
  const recentTs = timesheets.slice(0, 3);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Welcome back, {user?.firstName}!</h1>
      <p className="text-gray-500 text-sm mb-6">Here's a summary of your profile.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Approved Skills', value: approved, color: 'green' },
          { label: 'Pending Review', value: pending, color: 'yellow' },
          { label: 'Draft', value: draft, color: 'gray' },
          { label: 'Rejected', value: rejected, color: 'red' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
            <div className={`text-3xl font-bold text-${color}-600`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent Skills</h2>
            <Link to="/my-skills" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {skills.length === 0 ? (
            <p className="text-sm text-gray-400">No skills added yet.</p>
          ) : (
            <div className="space-y-2">
              {skills.slice(0, 5).map(s => (
                <div key={s.id} className="flex justify-between items-center text-sm">
                  <span>{s.skill_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{s.weighting}%</span>
                    <Badge status={s.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold">Recent Timesheets</h2>
            <Link to="/timesheets" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
          {recentTs.length === 0 ? (
            <p className="text-sm text-gray-400">No timesheets submitted yet.</p>
          ) : (
            <div className="space-y-2">
              {recentTs.map(t => (
                <div key={t.id} className="flex justify-between items-center text-sm">
                  <span>Week of {t.week_start_date?.slice(0, 10)}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{t.total_hours}h</span>
                    <Badge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
