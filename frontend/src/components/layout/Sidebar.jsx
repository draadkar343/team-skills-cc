import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkClass = ({ isActive }) =>
  `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
  }`;

export default function Sidebar() {
  const { user } = useAuth();

  return (
    <aside className="w-56 min-h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-1">
      {user?.role === 'employee' && (
        <>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/my-skills" className={linkClass}>My Skills</NavLink>
          <NavLink to="/my-certifications" className={linkClass}>My Certifications</NavLink>
          <NavLink to="/timesheets" className={linkClass}>Timesheets</NavLink>
          <NavLink to="/biography" className={linkClass}>My Biography</NavLink>
        </>
      )}
      {user?.role === 'manager' && (
        <>
          <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/skill-approvals" className={linkClass}>Skill Approvals</NavLink>
          <NavLink to="/cert-approvals" className={linkClass}>Cert Approvals</NavLink>
          <NavLink to="/timesheet-approvals" className={linkClass}>Timesheet Approvals</NavLink>
          <NavLink to="/squad" className={linkClass}>My Squad</NavLink>
          <NavLink to="/manager/main-skills" className={linkClass}>Main Skills</NavLink>
          <NavLink to="/client-planning" className={linkClass}>Client Planning</NavLink>
          <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>
          <NavLink to="/workload" className={linkClass}>Workload View</NavLink>
        </>
      )}
      {user?.role === 'resourcing' && (
        <>
          <NavLink to="/resourcing" className={linkClass}>Resourcing Overview</NavLink>
          <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>
          <NavLink to="/workload" className={linkClass}>Workload View</NavLink>
        </>
      )}
      {user?.role === 'administrator' && (
        <>
          <NavLink to="/admin" className={linkClass}>Dashboard</NavLink>
          <NavLink to="/admin/users" className={linkClass}>Users</NavLink>
          <NavLink to="/admin/squads" className={linkClass}>Squads</NavLink>
          <NavLink to="/admin/job-roles" className={linkClass}>Job Roles</NavLink>
          <NavLink to="/admin/skills" className={linkClass}>Skills Catalogue</NavLink>
          <NavLink to="/admin/all-skills" className={linkClass}>All Employee Skills</NavLink>
          <NavLink to="/admin/all-timesheets" className={linkClass}>All Timesheets</NavLink>
          <NavLink to="/admin/certifications" className={linkClass}>Certifications</NavLink>
          <NavLink to="/client-planning" className={linkClass}>Client Planning</NavLink>
          <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>
          <NavLink to="/workload" className={linkClass}>Workload View</NavLink>
          <NavLink to="/resourcing" className={linkClass}>Resourcing Overview</NavLink>
          <NavLink to="/admin/integrations" className={linkClass}>Integrations</NavLink>
          <NavLink to="/admin/news" className={linkClass}>News</NavLink>
          <NavLink to="/admin/config" className={linkClass}>System Config</NavLink>
          <NavLink to="/admin/audit" className={linkClass}>Audit Log</NavLink>
        </>
      )}
      <hr className="my-2 border-gray-200 dark:border-gray-700" />
      <NavLink to="/profile" className={linkClass}>My Profile</NavLink>
    </aside>
  );
}
