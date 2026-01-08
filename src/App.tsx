import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { RBACProvider } from "@/contexts/RBACContext";
import { ProtectedRoute, ROUTE_PERMISSIONS, AccessDeniedPage } from "@/components/rbac";
import DemoLanding from "@/pages/DemoLanding";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
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
} from "./pages/teacher";
import { ParentDashboard } from "./pages/parent";
import { StudentPractice } from "./pages/student";
import { SchoolAdminDashboard, SchoolReports, AdminReportsDashboard } from "./pages/admin";
import { 
  PlatformAdminCompliance, 
  PlatformAdminBackups,
  PlatformAdminUsage,
  PlatformAdminSecurity,
} from "./pages/platform-admin";
import PlatformAdminOnboarding from "./pages/platform-admin/PlatformAdminOnboarding";
import PlatformAdminSystemStatus from "./pages/platform-admin/PlatformAdminSystemStatus";
import PlatformAdminPilot from "./pages/platform-admin/PlatformAdminPilot";
import { LegalDocument } from "./pages/legal";
import { OfflineIndicator } from "./components/common";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds - reduces refetches on slow connections
      retry: 2,
      refetchOnWindowFocus: false, // Reduce network usage
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <DemoModeProvider>
        {/* 
          RBACProvider - temporarily using null userId during development.
          In production, this would come from auth context.
          Demo mode injects credentials automatically.
        */}
        <RBACProvider userId={null} schoolId={null}>
          <BrowserRouter>
            <Routes>
              {/* Default redirect to demo landing for now */}
              <Route path="/" element={<Navigate to="/demo/enter" replace />} />
              
              {/* Demo entry page - Public */}
              <Route path="/demo/enter" element={<DemoLanding />} />
            
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
            
            {/* Legal Routes - Public */}
            <Route path="/legal/:type" element={<LegalDocument />} />
            
            {/* Demo page - Public for development */}
            <Route path="/demo" element={<Navigate to="/demo/enter" replace />} />
            
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          
          {/* Global offline indicator */}
          <OfflineIndicator />
        </BrowserRouter>
      </RBACProvider>
      </DemoModeProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
