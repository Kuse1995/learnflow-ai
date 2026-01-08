import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DemoModeProvider } from "@/contexts/DemoModeContext";
import { AuthenticatedApp } from "@/components/auth/AuthenticatedApp";
import DemoLanding from "@/pages/DemoLanding";
import Auth from "@/pages/Auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <DemoModeProvider>
          <BrowserRouter>
            <Routes>
              {/* Public routes */}
              <Route path="/auth" element={<Auth />} />
              <Route path="/demo/enter" element={<DemoLanding />} />
              <Route path="/demo" element={<Navigate to="/demo/enter" replace />} />
              
              {/* Default redirect */}
              <Route path="/" element={<Navigate to="/auth" replace />} />
              
              {/* All authenticated/demo routes */}
              <Route path="/*" element={<AuthenticatedApp />} />
            </Routes>
          </BrowserRouter>
        </DemoModeProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
