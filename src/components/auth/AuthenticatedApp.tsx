import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';
import { useDemoMode } from '@/contexts/DemoModeContext';
import { RBACProvider } from '@/contexts/RBACContext';
import { ProtectedRoute, ROUTE_PERMISSIONS, AccessDeniedPage } from '@/components/rbac';
import { OfflineIndicator } from '@/components/common';
import { LegalDocument } from '@/pages/legal';
import {
  TeacherDashboard,
  TeacherAttendance,
  TeacherClasses,
  TeacherClassDetail,
  TeacherStudentProfile,
  TeacherUploads,
  TeacherInsights,
  TeacherActions,
  TeacherParentInsights,
  TeacherTraining,
  TeacherClassReport,
  TeacherStudentReport,
} from '@/pages/teacher';
import { ParentDashboard } from '@/pages/parent';
import { StudentPractice } from '@/pages/student';
import { SchoolAdminDashboard, SchoolReports, AdminReportsDashboard } from '@/pages/admin';
import { 
  PlatformAdminCompliance, 
  PlatformAdminBackups,
  PlatformAdminUsage,
  PlatformAdminSecurity,
} from '@/pages/platform-admin';
import PlatformAdminOnboarding from '@/pages/platform-admin/PlatformAdminOnboarding';
import PlatformAdminSystemStatus from '@/pages/platform-admin/PlatformAdminSystemStatus';
import PlatformAdminPilot from '@/pages/platform-admin/PlatformAdminPilot';
import PlatformAdmin from '@/pages/platform-admin/PlatformAdmin';
import PendingAdaptiveSupportPlans from '@/pages/platform-admin/PendingAdaptiveSupportPlans';
import PendingParentInsights from '@/pages/platform-admin/PendingParentInsights';
import { OwnerControl } from '@/pages/owner';
import NotFound from '@/pages/NotFound';

export function AuthenticatedApp() {
  const { user, isLoading } = useAuthContext();
  const { isDemoMode } = useDemoMode();

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // If not authenticated and not in demo mode, redirect to auth
  if (!user && !isDemoMode) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <RBACProvider 
      userId={user?.id ?? null} 
      userName={user?.user_metadata?.full_name ?? null}
      schoolId={null} // Will be determined by user's roles
    >
      <div className="min-h-screen overflow-auto">
      <Routes>
        {/* Access denied route */}
        <Route path="/access-denied" element={<AccessDeniedPage />} />
        
        {/* Teacher Routes - Protected */}
        <Route path="/teacher" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherDashboard />
          </ProtectedRoute>
        } />
        <Route path="/teacher/attendance" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherAttendance />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherClasses />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes/:classId" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherClassDetail />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes/:classId/reports" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherClassReport />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes/:classId/students/:studentId" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherStudentProfile />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes/:classId/actions" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherActions />
          </ProtectedRoute>
        } />
        <Route path="/teacher/classes/:classId/parent-insights" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherParentInsights />
          </ProtectedRoute>
        } />
        <Route path="/teacher/students/:studentId/report" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherStudentReport />
          </ProtectedRoute>
        } />
        <Route path="/teacher/uploads" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherUploads />
          </ProtectedRoute>
        } />
        <Route path="/teacher/insights" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherInsights />
          </ProtectedRoute>
        } />
        <Route path="/teacher/training" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.teacher}>
            <TeacherTraining />
          </ProtectedRoute>
        } />
        
        {/* Parent Routes - Protected */}
        <Route path="/parent/:studentId" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.parent}>
            <ParentDashboard />
          </ProtectedRoute>
        } />
        
        {/* Student Routes - Protected */}
        <Route path="/student/:classId/:studentId/practice" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.student}>
            <StudentPractice />
          </ProtectedRoute>
        } />
        
        {/* School Admin Routes - Protected */}
        <Route path="/admin" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.schoolAdmin}>
            <SchoolAdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/reports" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.schoolAdmin}>
            <AdminReportsDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/term-reports" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.schoolAdmin}>
            <SchoolReports />
          </ProtectedRoute>
        } />
        
        {/* Platform Admin Routes - Protected */}
        <Route path="/platform-admin" element={<PlatformAdmin />} />
        <Route path="/platform-admin/compliance" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminCompliance />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/backups" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminBackups />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/usage" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminUsage />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/security" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminSecurity />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/onboarding" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminOnboarding />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/system-status" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminSystemStatus />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/pilot" element={
          <ProtectedRoute permissions={ROUTE_PERMISSIONS.platformAdmin}>
            <PlatformAdminPilot />
          </ProtectedRoute>
        } />
        <Route path="/platform-admin/pending/adaptive-support" element={<PendingAdaptiveSupportPlans />} />
        <Route path="/platform-admin/pending/parent-insights" element={<PendingParentInsights />} />
        
        {/* Owner Control - Platform Owner Only */}
        <Route path="/owner-control" element={<OwnerControl />} />
        
        {/* Legal Routes - Public */}
        <Route path="/legal/:type" element={<LegalDocument />} />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      </div>
      
      {/* Global offline indicator */}
      <OfflineIndicator />
    </RBACProvider>
  );
}
