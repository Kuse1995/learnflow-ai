import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ShieldAlert, Building2, Zap, ScrollText, Settings } from "lucide-react";

const navItems = [
  { href: "/platform-admin", label: "Dashboard", icon: ShieldAlert },
  { href: "/platform-admin/schools", label: "Schools", icon: Building2 },
  { href: "/platform-admin/ai-controls", label: "AI Controls", icon: Zap },
  { href: "/platform-admin/audit-logs", label: "Audit Logs", icon: ScrollText },
  { href: "/platform-admin/compliance", label: "Compliance", icon: Settings },
];

export function PlatformAdminHeader() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-destructive/5 backdrop-blur supports-[backdrop-filter]:bg-destructive/5">
      {/* Warning Banner */}
      <div className="bg-destructive text-destructive-foreground text-center py-1 px-4 text-sm font-medium">
        ⚠️ PLATFORM ADMIN MODE — Actions here affect ALL schools
      </div>
      
      <div className="container mx-auto flex h-14 items-center gap-6">
        <Link to="/platform-admin" className="flex items-center gap-2 font-bold text-lg">
          <ShieldAlert className="h-5 w-5" />
          Platform Admin
        </Link>

        <nav className="flex items-center gap-1 ml-6">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href || 
              (item.href !== "/platform-admin" && location.pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Exit Admin Mode →
          </Link>
        </div>
      </div>
    </header>
  );
}
