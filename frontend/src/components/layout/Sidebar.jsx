import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';

const linkClass = ({ isActive }) =>
  `block px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
    isActive
      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
      : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
  }`;

function Group({ label, children }) {
  const hasVisible = React.Children.toArray(children).some(Boolean);
  if (!hasVisible) return null;
  return (
    <div className="mb-2">
      <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
        {label}
      </p>
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  );
}

export default function Sidebar() {
  const { user } = useAuth();
  const { can } = usePermissions();

  return (
    <aside className="w-56 h-full bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col overflow-y-auto">
      <nav className="flex-1 py-3 flex flex-col gap-0.5">

        {user?.role === 'employee' && (
          <>
            <div className="px-3 mb-1">
              {can('page.dashboard') && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
            </div>

            <Group label="My Work">
              {can('page.my_skills')         && <NavLink to="/my-skills"         className={linkClass}>My Skills</NavLink>}
              {can('page.my_certifications') && <NavLink to="/my-certifications" className={linkClass}>My Certifications</NavLink>}
              {can('page.timesheets')        && <NavLink to="/timesheets"        className={linkClass}>Timesheets</NavLink>}
            </Group>

            <Group label="Time & Leave">
              {can('page.my_leave')      && <NavLink to="/my-leave"      className={linkClass}>My Leave</NavLink>}
              {can('page.team_calendar') && <NavLink to="/team-calendar" className={linkClass}>Team Calendar</NavLink>}
            </Group>

            <Group label="Personal">
              {can('page.biography')  && <NavLink to="/biography"  className={linkClass}>My Biography</NavLink>}
              {can('page.onboarding') && <NavLink to="/onboarding" className={linkClass}>My Onboarding</NavLink>}
              {can('page.kudos')      && <NavLink to="/kudos"      className={linkClass}>Recognition</NavLink>}
            </Group>

            <Group label="People">
              {can('page.directory') && <NavLink to="/directory" className={linkClass}>Directory</NavLink>}
              {can('page.org_chart') && <NavLink to="/org-chart" className={linkClass}>Org Chart</NavLink>}
            </Group>
          </>
        )}

        {user?.role === 'manager' && (
          <>
            <div className="px-3 mb-1">
              {can('page.dashboard') && <NavLink to="/dashboard" className={linkClass}>Dashboard</NavLink>}
            </div>

            <Group label="Approvals">
              {can('page.skill_approvals')     && <NavLink to="/skill-approvals"     className={linkClass}>Skill Approvals</NavLink>}
              {can('page.cert_approvals')      && <NavLink to="/cert-approvals"      className={linkClass}>Cert Approvals</NavLink>}
              {can('page.timesheet_approvals') && <NavLink to="/timesheet-approvals" className={linkClass}>Timesheet Approvals</NavLink>}
              {can('page.leave_approvals')     && <NavLink to="/leave-approvals"     className={linkClass}>Leave Approvals</NavLink>}
            </Group>

            <Group label="My Team">
              {can('page.squad')         && <NavLink to="/squad"         className={linkClass}>My Squad</NavLink>}
              {can('page.team_calendar') && <NavLink to="/team-calendar" className={linkClass}>Team Calendar</NavLink>}
            </Group>

            <Group label="Analytics">
              {can('page.main_skills')    && <NavLink to="/manager/main-skills" className={linkClass}>Main Skills</NavLink>}
              {can('page.skills_heatmap') && <NavLink to="/skills-heatmap"      className={linkClass}>Skills Heatmap</NavLink>}
              {can('page.workload')       && <NavLink to="/workload"            className={linkClass}>Workload View</NavLink>}
            </Group>

            <Group label="Clients">
              {can('page.clients')         && <NavLink to="/clients"         className={linkClass}>Clients</NavLink>}
              {can('page.client_planning') && <NavLink to="/client-planning" className={linkClass}>Client Planning</NavLink>}
            </Group>

            <Group label="People">
              {can('page.directory') && <NavLink to="/directory" className={linkClass}>Directory</NavLink>}
              {can('page.org_chart') && <NavLink to="/org-chart" className={linkClass}>Org Chart</NavLink>}
            </Group>

            <Group label="Personal">
              {can('page.my_leave') && <NavLink to="/my-leave" className={linkClass}>My Leave</NavLink>}
              {can('page.kudos')    && <NavLink to="/kudos"    className={linkClass}>Recognition</NavLink>}
            </Group>
          </>
        )}

        {user?.role === 'functional_manager' && (
          <>
            <Group label="Approvals">
              {can('page.skill_approvals')     && <NavLink to="/skill-approvals"     className={linkClass}>Skill Approvals</NavLink>}
              {can('page.cert_approvals')      && <NavLink to="/cert-approvals"      className={linkClass}>Cert Approvals</NavLink>}
              {can('page.timesheet_approvals') && <NavLink to="/timesheet-approvals" className={linkClass}>Timesheet Approvals</NavLink>}
              {can('page.leave_approvals')     && <NavLink to="/leave-approvals"     className={linkClass}>Leave Approvals</NavLink>}
            </Group>

            <Group label="Analytics">
              {can('page.skills_heatmap') && <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>}
              {can('page.workload')       && <NavLink to="/workload"       className={linkClass}>Workload View</NavLink>}
            </Group>

            <Group label="Time & Leave">
              {can('page.my_leave')      && <NavLink to="/my-leave"      className={linkClass}>My Leave</NavLink>}
              {can('page.team_calendar') && <NavLink to="/team-calendar" className={linkClass}>Team Calendar</NavLink>}
            </Group>

            <Group label="People">
              {can('page.directory') && <NavLink to="/directory" className={linkClass}>Directory</NavLink>}
              {can('page.org_chart') && <NavLink to="/org-chart" className={linkClass}>Org Chart</NavLink>}
              {can('page.kudos')     && <NavLink to="/kudos"     className={linkClass}>Recognition</NavLink>}
            </Group>
          </>
        )}

        {user?.role === 'resourcing' && (
          <>
            <div className="px-3 mb-1">
              {can('page.resourcing_dashboard') && <NavLink to="/resourcing-dashboard" className={linkClass}>Dashboard</NavLink>}
            </div>

            <Group label="Resourcing">
              {can('page.clients')         && <NavLink to="/clients"         className={linkClass}>Clients</NavLink>}
              {can('page.resourcing')      && <NavLink to="/resourcing"      className={linkClass}>Resourcing Overview</NavLink>}
              {can('page.talent_pipeline') && <NavLink to="/talent-pipeline" className={linkClass}>Talent Pipeline</NavLink>}
            </Group>

            <Group label="Analytics">
              {can('page.skills_heatmap') && <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>}
              {can('page.workload')       && <NavLink to="/workload"       className={linkClass}>Workload View</NavLink>}
            </Group>

            <Group label="Time & Leave">
              {can('page.my_leave')      && <NavLink to="/my-leave"      className={linkClass}>My Leave</NavLink>}
              {can('page.team_calendar') && <NavLink to="/team-calendar" className={linkClass}>Team Calendar</NavLink>}
            </Group>

            <Group label="People">
              {can('page.directory') && <NavLink to="/directory" className={linkClass}>Directory</NavLink>}
              {can('page.org_chart') && <NavLink to="/org-chart" className={linkClass}>Org Chart</NavLink>}
              {can('page.kudos')     && <NavLink to="/kudos"     className={linkClass}>Recognition</NavLink>}
            </Group>
          </>
        )}

        {user?.role === 'administrator' && (
          <>
            <div className="px-3 mb-1">
              {can('page.admin_dashboard') && <NavLink to="/admin" className={linkClass}>Dashboard</NavLink>}
            </div>

            <Group label="People">
              {can('page.admin_users')     && <NavLink to="/admin/users"     className={linkClass}>Users</NavLink>}
              {can('page.admin_squads')    && <NavLink to="/admin/squads"    className={linkClass}>Squads</NavLink>}
              {can('page.admin_job_roles') && <NavLink to="/admin/job-roles" className={linkClass}>Job Roles</NavLink>}
            </Group>

            <Group label="Skills & Certs">
              {can('page.admin_skills')         && <NavLink to="/admin/skills"        className={linkClass}>Skills Catalogue</NavLink>}
              {can('page.admin_all_skills')     && <NavLink to="/admin/all-skills"    className={linkClass}>All Employee Skills</NavLink>}
              {can('page.admin_certifications') && <NavLink to="/admin/certifications" className={linkClass}>Certifications</NavLink>}
              {can('page.admin_all_timesheets') && <NavLink to="/admin/all-timesheets" className={linkClass}>All Timesheets</NavLink>}
            </Group>

            <Group label="Clients">
              {can('page.clients')         && <NavLink to="/clients"         className={linkClass}>Clients</NavLink>}
              {can('page.client_planning') && <NavLink to="/client-planning" className={linkClass}>Client Planning</NavLink>}
            </Group>

            <Group label="Analytics">
              {can('page.skills_heatmap') && <NavLink to="/skills-heatmap" className={linkClass}>Skills Heatmap</NavLink>}
              {can('page.workload')       && <NavLink to="/workload"       className={linkClass}>Workload View</NavLink>}
            </Group>

            <Group label="Resourcing">
              {can('page.resourcing_dashboard') && <NavLink to="/resourcing-dashboard" className={linkClass}>Resourcing Dashboard</NavLink>}
              {can('page.resourcing')           && <NavLink to="/resourcing"           className={linkClass}>Resourcing Overview</NavLink>}
              {can('page.talent_pipeline')      && <NavLink to="/talent-pipeline"      className={linkClass}>Talent Pipeline</NavLink>}
            </Group>

            <Group label="Leave">
              {can('page.my_leave')          && <NavLink to="/my-leave"          className={linkClass}>My Leave</NavLink>}
              {can('page.leave_approvals')   && <NavLink to="/leave-approvals"   className={linkClass}>Leave Approvals</NavLink>}
              {can('page.team_calendar')     && <NavLink to="/team-calendar"     className={linkClass}>Team Calendar</NavLink>}
              {can('page.admin_leave_types') && <NavLink to="/admin/leave-types" className={linkClass}>Leave Types</NavLink>}
            </Group>

            <Group label="People & Comms">
              {can('page.directory')   && <NavLink to="/directory"   className={linkClass}>Directory</NavLink>}
              {can('page.org_chart')   && <NavLink to="/org-chart"   className={linkClass}>Org Chart</NavLink>}
              {can('page.kudos')       && <NavLink to="/kudos"       className={linkClass}>Recognition</NavLink>}
              {can('page.admin_news')  && <NavLink to="/admin/news"  className={linkClass}>News</NavLink>}
            </Group>

            <Group label="System">
              {can('page.admin_onboarding')   && <NavLink to="/admin/onboarding"   className={linkClass}>Onboarding</NavLink>}
              {can('page.admin_reports')      && <NavLink to="/admin/reports"      className={linkClass}>Reports</NavLink>}
              {can('page.admin_roles')        && <NavLink to="/admin/roles"        className={linkClass}>Role Management</NavLink>}
              {can('page.admin_integrations') && <NavLink to="/admin/integrations" className={linkClass}>Integrations</NavLink>}
              {can('page.admin_config')       && <NavLink to="/admin/config"       className={linkClass}>System Config</NavLink>}
              {can('page.admin_audit')        && <NavLink to="/admin/audit"        className={linkClass}>Audit Log</NavLink>}
            </Group>
          </>
        )}

        {user?.role === 'application_delivery_manager' && (
          <>
            <Group label="Clients">
              {can('page.clients')         && <NavLink to="/clients"         className={linkClass}>Clients</NavLink>}
              {can('page.client_planning') && <NavLink to="/client-planning" className={linkClass}>Client Planning</NavLink>}
            </Group>

            <Group label="Time & Leave">
              {can('page.my_leave')      && <NavLink to="/my-leave"      className={linkClass}>My Leave</NavLink>}
              {can('page.team_calendar') && <NavLink to="/team-calendar" className={linkClass}>Team Calendar</NavLink>}
            </Group>

            <Group label="People">
              {can('page.directory') && <NavLink to="/directory" className={linkClass}>Directory</NavLink>}
              {can('page.org_chart') && <NavLink to="/org-chart" className={linkClass}>Org Chart</NavLink>}
              {can('page.kudos')     && <NavLink to="/kudos"     className={linkClass}>Recognition</NavLink>}
            </Group>
          </>
        )}

      </nav>

      <div className="border-t border-gray-200 dark:border-gray-700 p-3">
        <NavLink to="/profile" className={linkClass}>My Profile</NavLink>
      </div>
    </aside>
  );
}
