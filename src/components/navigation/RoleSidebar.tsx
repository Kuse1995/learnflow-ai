import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  School,
  CreditCard,
  BarChart3,
  Settings,
  Home,
  ClipboardCheck,
  BookOpen,
  Sparkles,
  MessageSquare,
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
import { type NavItem } from "./navigation-config";

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  LayoutGrid,
  Users,
  GraduationCap,
  School,
  CreditCard,
  BarChart3,
  Settings,
  Home,
  ClipboardCheck,
  BookOpen,
  Sparkles,
  MessageSquare,
};

interface RoleSidebarProps {
  items: NavItem[];
  role: "admin" | "teacher";
  schoolName?: string;
  children: React.ReactNode;
}

/**
 * Canonical sidebar navigation component.
 * Used by: Admin (web), Teacher (web)
 * 
 * Features:
 * - Collapsible with keyboard shortcut (Ctrl+B)
 * - Active route highlighting
 * - School branding in header
 */
export function RoleSidebar({
  items,
  role,
  schoolName = "School SMS",
  children,
}: RoleSidebarProps) {
  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <SidebarNav items={items} role={role} schoolName={schoolName} />
        <SidebarInset>
          <SidebarNavHeader />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function SidebarNav({
  items,
  role,
  schoolName,
}: {
  items: NavItem[];
  role: "admin" | "teacher";
  schoolName: string;
}) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      {/* Sidebar Header with School Branding */}
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
              <span className="text-xs text-sidebar-foreground/70 capitalize">
                {role} Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => {
                const Icon = iconMap[item.icon];
                if (!Icon) return null;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/admin" || item.href === "/teacher"}
                        className={({ isActive }) =>
                          cn(
                            "flex items-center gap-3 w-full",
                            isActive && "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                          )
                        }
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                        {item.badge && item.badge > 0 && (
                          <span className="ml-auto h-5 min-w-5 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center px-1.5">
                            {item.badge > 99 ? "99+" : item.badge}
                          </span>
                        )}
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

function SidebarNavHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <div className="flex-1" />
    </header>
  );
}

export { SidebarNav, SidebarNavHeader };
