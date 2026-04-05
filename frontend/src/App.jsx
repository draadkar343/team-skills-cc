import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

import ChatBot from './chatbot/ChatBot';
import Login from './pages/Login';
import ResetPassword from './pages/ResetPassword';

// Employee
import EmployeeDashboard from './pages/employee/Dashboard';
import MySkills from './pages/employee/MySkills';
import Timesheets from './pages/employee/Timesheets';
import Biography from './pages/employee/Biography';

// Manager
import ManagerDashboard from './pages/manager/Dashboard';
import SkillApprovals from './pages/manager/SkillApprovals';
import TimesheetApprovals from './pages/manager/TimesheetApprovals';
import SquadManagement from './pages/manager/SquadManagement';

// Shared
import Profile from './pages/shared/Profile';

// Admin
import AdminDashboard from './pages/admin/Dashboard';
import JobRolesView from './pages/admin/JobRolesView';
import AuditLog from './pages/admin/AuditLog';

// Resourcing
import ResourcingDashboard from './pages/resourcing/Dashboard';
import ResourcingView from './pages/resourcing/ResourcingView';
import TalentPipeline from './pages/resourcing/TalentPipeline';

// Shared — all roles
import KudosWall from './pages/shared/KudosWall';
import MyLeave from './pages/shared/MyLeave';
import TeamLeaveCalendar from './pages/shared/TeamLeaveCalendar';

// Manager extra
import MainSkillsView from './pages/manager/MainSkillsView';
import SkillsHeatmap from './pages/shared/SkillsHeatmap';
import WorkloadView from './pages/shared/WorkloadView';
import ClientPlanning from './pages/manager/ClientPlanning';
import ClientsPage from './pages/ClientsPage';
import UserManagement from './pages/admin/UserManagement';
import AdminSquadManagement from './pages/admin/SquadManagement';
import AllSkillsView from './pages/admin/AllSkillsView';
import AllTimesheets from './pages/admin/AllTimesheets';
import SystemConfig from './pages/admin/SystemConfig';
import NewsManagement from './pages/admin/NewsManagement';
import MyCertifications from './pages/employee/MyCertifications';
import CertificationApprovals from './pages/manager/CertificationApprovals';
import AllCertifications from './pages/admin/AllCertifications';
import Integrations from './pages/admin/Integrations';
import LeaveApprovals from './pages/manager/LeaveApprovals';
import LeaveTypes from './pages/admin/LeaveTypes';
import RoleManagement from './pages/admin/RoleManagement';
import Reports from './pages/admin/Reports';
import Onboarding from './pages/employee/Onboarding';
import OnboardingAdmin from './pages/admin/OnboardingAdmin';
import OrgChart from './pages/shared/OrgChart';
import EmployeeDirectory from './pages/shared/EmployeeDirectory';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
      <ChatBot />
    </div>
  );
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'administrator') return <Navigate to="/admin" replace />;
  if (user?.role === 'resourcing') return <Navigate to="/resourcing-dashboard" replace />;
  if (user?.role === 'functional_manager') return <Navigate to="/skill-approvals" replace />;
  if (user?.role === 'application_delivery_manager') return <Navigate to="/clients" replace />;
  return <Navigate to="/dashboard" replace />;
}

// Renders the right dashboard depending on role
function RoleDashboard() {
  const { user } = useAuth();
  if (user?.role === 'manager') return <ManagerDashboard />;
  return <EmployeeDashboard />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/" element={<RootRedirect />} />

      {/* Shared dashboard (employee + manager) */}
      <Route path="/dashboard" element={
        <ProtectedRoute allowedRoles={['employee', 'manager']}>
          <AppLayout><RoleDashboard /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Employee-only */}
      <Route path="/my-skills" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <AppLayout><MySkills /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/timesheets" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <AppLayout><Timesheets /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/biography" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <AppLayout><Biography /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/my-certifications" element={
        <ProtectedRoute allowedRoles={['employee']}>
          <AppLayout><MyCertifications /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Profile — all authenticated roles */}
      <Route path="/profile" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><Profile /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Kudos — all authenticated roles */}
      <Route path="/kudos" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><KudosWall /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Leave — all authenticated roles */}
      <Route path="/my-leave" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><MyLeave /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/team-calendar" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><TeamLeaveCalendar /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Manager / Functional Manager — leave approvals */}
      <Route path="/leave-approvals" element={
        <ProtectedRoute allowedRoles={['manager', 'administrator', 'functional_manager']}>
          <AppLayout><LeaveApprovals /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Manager-only */}
      <Route path="/manager/main-skills" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><MainSkillsView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/skill-approvals" element={
        <ProtectedRoute allowedRoles={['manager', 'functional_manager']}>
          <AppLayout><SkillApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/cert-approvals" element={
        <ProtectedRoute allowedRoles={['manager', 'functional_manager']}>
          <AppLayout><CertificationApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/timesheet-approvals" element={
        <ProtectedRoute allowedRoles={['manager', 'functional_manager']}>
          <AppLayout><TimesheetApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/squad" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><SquadManagement /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Manager — client planning */}
      <Route path="/client-planning" element={
        <ProtectedRoute allowedRoles={['manager', 'administrator', 'application_delivery_manager']}>
          <AppLayout><ClientPlanning /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Clients — detailed client view */}
      <Route path="/clients" element={
        <ProtectedRoute allowedRoles={['manager', 'administrator', 'resourcing', 'application_delivery_manager']}>
          <AppLayout><ClientsPage /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Manager — heatmap and workload */}
      <Route path="/skills-heatmap" element={
        <ProtectedRoute allowedRoles={['manager', 'administrator', 'resourcing', 'functional_manager']}>
          <AppLayout><SkillsHeatmap /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/workload" element={
        <ProtectedRoute allowedRoles={['manager', 'administrator', 'resourcing', 'functional_manager']}>
          <AppLayout><WorkloadView /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Resourcing */}
      <Route path="/resourcing-dashboard" element={
        <ProtectedRoute allowedRoles={['resourcing', 'administrator']}>
          <AppLayout><ResourcingDashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/resourcing" element={
        <ProtectedRoute allowedRoles={['resourcing', 'administrator']}>
          <AppLayout><ResourcingView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/talent-pipeline" element={
        <ProtectedRoute allowedRoles={['resourcing', 'administrator']}>
          <AppLayout><TalentPipeline /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Admin */}
      <Route path="/admin" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AdminDashboard /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/job-roles" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><JobRolesView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/users" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><UserManagement /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/squads" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AdminSquadManagement /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/skills" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AllSkillsView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/all-skills" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AllSkillsView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/all-timesheets" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AllTimesheets /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/config" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><SystemConfig /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/audit" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AuditLog /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/integrations" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><Integrations /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/certifications" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><AllCertifications /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/news" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><NewsManagement /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/leave-types" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><LeaveTypes /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/roles" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><RoleManagement /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/reports" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><Reports /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/admin/onboarding" element={
        <ProtectedRoute allowedRoles={['administrator']}>
          <AppLayout><OnboardingAdmin /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Employee onboarding checklist */}
      <Route path="/onboarding" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager']}>
          <AppLayout><Onboarding /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Org chart — all roles */}
      <Route path="/org-chart" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><OrgChart /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Directory — all roles */}
      <Route path="/directory" element={
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator', 'resourcing', 'functional_manager', 'application_delivery_manager']}>
          <AppLayout><EmployeeDirectory /></AppLayout>
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
