import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut, Home, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthContext } from "@/contexts/AuthContext";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthContext();

  useEffect(() => {
    console.info("Coming Soon: User accessed route under development:", location.pathname);
  }, [location.pathname]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted">
      {isAuthenticated && (
        <header className="flex items-center justify-between border-b bg-background px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-2">
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </header>
      )}
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <Clock className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h1 className="mb-4 text-4xl font-bold">Coming Soon</h1>
          <p className="mb-6 text-xl text-muted-foreground">We're working on this feature. Check back soon!</p>
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="h-4 w-4" />
            Return to Home
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
