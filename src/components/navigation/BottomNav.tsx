import { cn } from "@/lib/utils";
import { NavLink as RouterNavLink } from "react-router-dom";
import { LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface BottomNavProps {
  items: NavItem[];
  className?: string;
}

/**
 * Canonical bottom navigation component for mobile views.
 * Reused across all roles with different nav items.
 */
export function BottomNav({ items, className }: BottomNavProps) {
  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto",
        "bg-card/95 backdrop-blur-lg border-t",
        "pt-2 pb-safe px-2",
        "shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.05)]",
        className
      )}
    >
      <div className="flex justify-around items-center h-16">
        {items.map((item) => (
          <RouterNavLink
            key={item.href}
            to={item.href}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 w-16 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary"
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    "p-1.5 rounded-xl transition-colors",
                    isActive && "bg-primary/10"
                  )}
                >
                  <item.icon className="h-6 w-6" />
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
          </RouterNavLink>
        ))}
      </div>
    </nav>
  );
}
