import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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
} from "./pages/teacher";
import { ParentDashboard } from "./pages/parent";
import { StudentPractice } from "./pages/student";
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
      <BrowserRouter>
        <Routes>
          {/* Default redirect to teacher dashboard for now */}
          <Route path="/" element={<Navigate to="/teacher" replace />} />
          
          {/* Teacher Routes */}
          <Route path="/teacher" element={<TeacherDashboard />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/classes" element={<TeacherClasses />} />
          <Route path="/teacher/classes/:classId" element={<TeacherClassDetail />} />
          <Route path="/teacher/classes/:classId/students/:studentId" element={<TeacherStudentProfile />} />
          <Route path="/teacher/classes/:classId/actions" element={<TeacherActions />} />
          <Route path="/teacher/classes/:classId/parent-insights" element={<TeacherParentInsights />} />
          <Route path="/teacher/uploads" element={<TeacherUploads />} />
          <Route path="/teacher/insights" element={<TeacherInsights />} />
          
          {/* Parent Routes */}
          <Route path="/parent/:studentId" element={<ParentDashboard />} />
          
          {/* Student Routes */}
          <Route path="/student/:classId/:studentId/practice" element={<StudentPractice />} />
          
          {/* Platform Admin Routes */}
          <Route path="/platform-admin/compliance" element={<PlatformAdminCompliance />} />
          <Route path="/platform-admin/backups" element={<PlatformAdminBackups />} />
          <Route path="/platform-admin/usage" element={<PlatformAdminUsage />} />
          <Route path="/platform-admin/security" element={<PlatformAdminSecurity />} />
          <Route path="/platform-admin/onboarding" element={<PlatformAdminOnboarding />} />
          <Route path="/platform-admin/system-status" element={<PlatformAdminSystemStatus />} />
          <Route path="/platform-admin/pilot" element={<PlatformAdminPilot />} />
          
          {/* Legal Routes */}
          <Route path="/legal/:type" element={<LegalDocument />} />
          
          {/* Demo page */}
          <Route path="/demo" element={<Index />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
        
        {/* Global offline indicator */}
        <OfflineIndicator />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
