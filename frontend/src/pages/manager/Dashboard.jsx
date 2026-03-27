import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getPendingSkills } from '../../api/skillsApi';
import { getPendingTimesheets } from '../../api/timesheetApi';
import { getMySquad } from '../../api/squadApi';
import NewsFeed from '../../components/common/NewsFeed';

export default function ManagerDashboard() {
  const { user } = useAuth();
  const [pendingSkills, setPendingSkills] = useState([]);
  const [pendingTs, setPendingTs] = useState([]);
  const [squad, setSquad] = useState(null);

  useEffect(() => {
    getPendingSkills().then(setPendingSkills).catch(() => {});
    getPendingTimesheets().then(setPendingTs).catch(() => {});
    getMySquad().then(data => setSquad(data[0] || null)).catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-1">Manager Dashboard</h1>
      <p className="text-gray-500 text-sm mb-6">Welcome, {user?.firstName}!</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Link to="/skill-approvals" className="bg-white rounded-xl border border-yellow-300 p-5 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="text-4xl font-bold text-yellow-600">{pendingSkills.length}</div>
          <div className="text-sm text-gray-500 mt-1">Skills Awaiting Approval</div>
        </Link>
        <Link to="/timesheet-approvals" className="bg-white rounded-xl border border-blue-300 p-5 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="text-4xl font-bold text-blue-600">{pendingTs.length}</div>
          <div className="text-sm text-gray-500 mt-1">Timesheets Awaiting Approval</div>
        </Link>
        <Link to="/squad" className="bg-white rounded-xl border border-green-300 p-5 shadow-sm hover:shadow-md transition-shadow text-center">
          <div className="text-4xl font-bold text-green-600">{squad?.members?.length || 0}</div>
          <div className="text-sm text-gray-500 mt-1">Team Members</div>
        </Link>
      </div>

      <div className="mb-6">
        <NewsFeed />
      </div>

      {squad && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Squad: {squad.name}</h2>
          {squad.members?.length === 0 ? (
            <p className="text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="space-y-2">
              {squad.members.map(m => (
                <div key={m.id} className="flex items-center justify-between text-sm">
                  <span>{m.first_name} {m.last_name}</span>
                  <span className="text-gray-400">{m.email}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
