import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import ProtectedRoute from './components/layout/ProtectedRoute';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';

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

// Manager extra
import MainSkillsView from './pages/manager/MainSkillsView';
import UserManagement from './pages/admin/UserManagement';
import AllSkillsView from './pages/admin/AllSkillsView';
import AllTimesheets from './pages/admin/AllTimesheets';
import SystemConfig from './pages/admin/SystemConfig';
import NewsManagement from './pages/admin/NewsManagement';
import MyCertifications from './pages/employee/MyCertifications';
import CertificationApprovals from './pages/manager/CertificationApprovals';
import AllCertifications from './pages/admin/AllCertifications';

function AppLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function RootRedirect() {
  const { user, isAuthenticated } = useAuth();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'administrator') return <Navigate to="/admin" replace />;
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
        <ProtectedRoute allowedRoles={['employee', 'manager', 'administrator']}>
          <AppLayout><Profile /></AppLayout>
        </ProtectedRoute>
      } />

      {/* Manager-only */}
      <Route path="/manager/main-skills" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><MainSkillsView /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/skill-approvals" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><SkillApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/cert-approvals" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><CertificationApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/timesheet-approvals" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><TimesheetApprovals /></AppLayout>
        </ProtectedRoute>
      } />
      <Route path="/squad" element={
        <ProtectedRoute allowedRoles={['manager']}>
          <AppLayout><SquadManagement /></AppLayout>
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
