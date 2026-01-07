import { cn } from "@/lib/utils";
import { NavLink } from "react-router-dom";
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
  Upload,
  ClipboardList,
  Bot,
  TrendingUp,
  CalendarCheck,
  Bell,
  LucideIcon,
} from "lucide-react";
import { type NavItem } from "./navigation-config";

// Icon mapping for dynamic rendering
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
  Upload,
  ClipboardList,
  Bot,
  TrendingUp,
  CalendarCheck,
  Bell,
};

interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Canonical bottom navigation component.
 * Used by: Student (web+mobile), Parent (web+mobile), Teacher (mobile only)
 * 
 * MAX 4 ITEMS for usability.
 */
export function BottomNav({ items, className }: BottomNavProps) {
  if (items.length > 4) {
    console.warn("BottomNav: Maximum 4 items recommended for usability");
  }

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40",
        "bg-card/95 backdrop-blur-lg border-t",
        "pt-2 pb-safe px-2",
        "shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {items.map((item) => {
          const Icon = iconMap[item.icon];
          if (!Icon) {
            console.warn(`BottomNav: Unknown icon "${item.icon}"`);
            return null;
          }

          return (
            <NavLink
              key={item.href}
              to={item.href}
              end={item.href === "/admin" || item.href === "/teacher" || item.href === "/student" || item.href === "/parent"}
              className={({ isActive }) =>
                cn(
                  "flex flex-col items-center justify-center gap-1 w-16 transition-colors relative",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div
                    className={cn(
                      "p-1.5 rounded-xl transition-colors relative",
                      isActive && "bg-primary/10"
                    )}
                  >
                    <Icon className="h-6 w-6" />
                    {/* Badge for notifications */}
                    {item.badge && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                        {item.badge > 9 ? "9+" : item.badge}
                      </span>
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-[10px]",
                      isActive ? "font-bold" : "font-medium"
                    )}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
