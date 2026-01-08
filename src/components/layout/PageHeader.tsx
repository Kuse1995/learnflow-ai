import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  showBack?: boolean;
  showLogout?: boolean;
  backPath?: string;
  children?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  icon,
  showBack = true,
  showLogout = true,
  backPath,
  children,
}: PageHeaderProps) {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuth();

  const handleBack = () => {
    if (backPath) {
      navigate(backPath);
    } else {
      navigate(-1);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="border-b bg-card">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                className="shrink-0"
              >
                <ArrowLeft className="h-5 w-5" />
                <span className="sr-only">Go back</span>
              </Button>
            )}
            {icon && <div className="shrink-0">{icon}</div>}
            <div>
              <h1 className="text-xl md:text-2xl font-bold">{title}</h1>
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {children}
            {showLogout && isAuthenticated && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
