import { BottomNav } from "./BottomNav";
import { TEACHER_MOBILE_NAV_ITEMS, TEACHER_SIDEBAR_ITEMS } from "./navigation-config";
import { useIsMobile } from "@/hooks/use-mobile";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Home,
  School,
  ClipboardCheck,
  BookOpen,
  Sparkles,
  MessageSquare,
  Upload,
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
  Home,
  School,
  ClipboardCheck,
  BookOpen,
  Sparkles,
  MessageSquare,
  Upload,
};

interface TeacherLayoutProps {
  children: React.ReactNode;
  schoolName?: string;
}

/**
 * Teacher Layout Component
 * 
 * NAVIGATION RULES:
 * - Web: Left sidebar navigation
 * - Mobile: Bottom navigation (Attendance, Classes, Uploads, Insights)
 */
export function TeacherLayout({ children, schoolName = "School SMS" }: TeacherLayoutProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="min-h-screen bg-background pb-20">
        {children}
        <BottomNav items={TEACHER_MOBILE_NAV_ITEMS} />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="flex min-h-screen w-full">
        <TeacherSidebar schoolName={schoolName} />
        <SidebarInset>
          <TeacherHeader />
          <main className="flex-1 p-6">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function TeacherSidebar({ schoolName }: { schoolName: string }) {
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
                Teacher Portal
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Teaching</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {TEACHER_SIDEBAR_ITEMS.map((item) => {
                const Icon = iconMap[item.icon];
                if (!Icon) return null;

                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild tooltip={item.label}>
                      <NavLink
                        to={item.href}
                        end={item.href === "/teacher"}
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

function TeacherHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 md:px-6">
      <SidebarTrigger />
      <div className="flex-1" />
    </header>
  );
}

/**
 * Simple Teacher Bottom Nav for use in mobile-only contexts
 */
export function TeacherNav() {
  return <BottomNav items={TEACHER_MOBILE_NAV_ITEMS} />;
}
