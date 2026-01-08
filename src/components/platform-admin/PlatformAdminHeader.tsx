import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ShieldAlert, Building2, Zap, ScrollText, Settings, HardDrive, BarChart3, ShieldCheck, LogOut, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/platform-admin", label: "Dashboard", icon: ShieldAlert },
  { href: "/platform-admin/schools", label: "Schools", icon: Building2 },
  { href: "/platform-admin/ai-controls", label: "AI Controls", icon: Zap },
  { href: "/platform-admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/platform-admin/compliance", label: "Compliance", icon: Settings },
  { href: "/platform-admin/backups", label: "Backups", icon: HardDrive },
  { href: "/platform-admin/usage", label: "Usage", icon: BarChart3 },
  { href: "/platform-admin/security", label: "Security", icon: ShieldCheck },
];

export function PlatformAdminHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuth();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-destructive/5 backdrop-blur supports-[backdrop-filter]:bg-destructive/5">
      {/* Warning Banner */}
      <div className="bg-destructive text-destructive-foreground text-center py-1 px-4 text-sm font-medium">
        ⚠️ PLATFORM ADMIN MODE — Actions here affect ALL schools
      </div>
      
      <div className="container mx-auto flex h-14 items-center gap-6">
        <Button variant="ghost" size="icon" onClick={() => navigate("/")} className="shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        
        <Link to="/platform-admin" className="flex items-center gap-2 font-bold text-lg">
          <ShieldAlert className="h-5 w-5" />
          Platform Admin
        </Link>

        <nav className="flex items-center gap-1 ml-6 overflow-x-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href !== "/platform-admin" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground hidden sm:block"
          >
            Exit Admin Mode
          </Link>
          {isAuthenticated && (
            <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
