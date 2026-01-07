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
  TeacherUploads,
  TeacherInsights,
  TeacherActions,
  TeacherParentInsights,
} from "./pages/teacher";
import { ParentDashboard } from "./pages/parent";

const queryClient = new QueryClient();

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
          <Route path="/teacher/classes/:classId/actions" element={<TeacherActions />} />
          <Route path="/teacher/classes/:classId/parent-insights" element={<TeacherParentInsights />} />
          <Route path="/teacher/uploads" element={<TeacherUploads />} />
          <Route path="/teacher/insights" element={<TeacherInsights />} />
          
          {/* Parent Routes */}
          <Route path="/parent/:studentId" element={<ParentDashboard />} />
          
          {/* Demo page */}
          <Route path="/demo" element={<Index />} />
          
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
