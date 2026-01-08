import { BottomNav } from "./BottomNav";
import { ADMIN_MOBILE_NAV_ITEMS, ADMIN_NAV_ITEMS } from "./navigation-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  LayoutGrid,
  Users,
  Users2,
  GraduationCap,
  School,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
  LogOut,
  LucideIcon,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
  useSidebar,
} from "@/components/ui/sidebar";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  Users,
  Users2,
  GraduationCap,
  School,
  CreditCard,
  BarChart3,
  Settings,
  Bell,
};

interface AdminLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
}

/**
 * Admin Layout Component
 * 
 * NAVIGATION RULES:
 * - Web: Left sidebar navigation
 * - Mobile: Optional bottom nav for alerts only
 */
export function AdminLayout({ children, schoolName = "School SMS" }: AdminLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background">
        <MobileHeader />
        {children}
        {/* Optional bottom nav for alerts only on mobile */}
        <BottomNav items={ADMIN_MOBILE_NAV_ITEMS} />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <AdminSidebar schoolName={schoolName} />
      <SidebarInset className="flex-1">
        <AdminHeader />
        <main className="flex-1 p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}

function AdminSidebar({ schoolName }: { schoolName: string }) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shrink-0">
            S
          </div>
          {!isCollapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-sidebar-foreground truncate">
                {schoolName}
              </span>
              <span className="text-xs text-sidebar-foreground/70">
                Admin Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {ADMIN_NAV_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                if (!Icon) return null;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/admin"}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 w-full",
                            isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}

function AdminHeader() {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuthContext();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <div className="flex-1" />
      {isAuthenticated && (
        <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      )}
    </header>
  );
}

function MobileHeader() {
  const navigate = useNavigate();
  const { signOut, isAuthenticated } = useAuthContext();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background px-4">
      <span className="font-semibold text-sm">Admin Portal</span>
      {isAuthenticated && (
        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      )}
    </header>
  );
}
