import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { getMySkills } from '../../api/skillsApi';
import { getMyTimesheets } from '../../api/timesheetApi';
import { getMySquadInfo } from '../../api/squadApi';
import { getMyKudos } from '../../api/kudosApi';
import { GiveKudosModal, CATEGORIES } from '../shared/KudosWall';
import Badge from '../../components/common/Badge';
import NewsFeed from '../../components/common/NewsFeed';

const CAT_MAP = Object.fromEntries(CATEGORIES.map(c => [c.key, c]));

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [skills, setSkills] = useState([]);
  const [timesheets, setTimesheets] = useState([]);
  const [squadInfo, setSquadInfo] = useState(undefined); // undefined = loading, null = no squad
  const [myKudos, setMyKudos] = useState([]);
  const [showGiveKudos, setShowGiveKudos] = useState(false);

  useEffect(() => {
    getMySkills().then(setSkills).catch(() => {});
    getMyTimesheets().then(setTimesheets).catch(() => {});
    getMySquadInfo().then(setSquadInfo).catch(() => setSquadInfo(null));
    getMyKudos().then(k => setMyKudos(k.slice(0, 3))).catch(() => {});
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

      {/* Squad info */}
      {squadInfo !== undefined && (
        <div className="mb-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          {squadInfo ? (
            <div>
              <span className="text-sm font-semibold text-gray-800">{squadInfo.name}</span>
              <span className="text-xs text-gray-400 ml-2">Squad</span>
              <div className="text-xs text-gray-500 mt-0.5">Lead: {squadInfo.manager_name}</div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">You are not assigned to a squad yet.</div>
          )}
        </div>
      )}

      <div className="mb-6">
        <NewsFeed />
      </div>

      {/* Recent recognition received */}
      <div className="mb-6 bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-semibold">Recent Recognition</h2>
          <div className="flex gap-3">
            <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowGiveKudos(true)}>🎉 Give Recognition</button>
            <Link to="/kudos" className="text-sm text-blue-600 hover:underline">View all</Link>
          </div>
        </div>
        {myKudos.length === 0 ? (
          <p className="text-sm text-gray-400">No recognition received yet. Keep up the great work!</p>
        ) : (
          <div className="space-y-3">
            {myKudos.map(k => {
              const cat = CAT_MAP[k.category];
              return (
                <div key={k.id} className="flex gap-3 items-start">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {k.from_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm">
                      <span className="font-medium">{k.from_name}</span>
                      {cat && <span className="ml-1 text-amber-600">{cat.emoji}</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">"{k.message}"</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <GiveKudosModal open={showGiveKudos} onClose={() => setShowGiveKudos(false)} excludeUserId={user?.id} />

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
