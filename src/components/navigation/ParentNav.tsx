import { BottomNav } from "./BottomNav";
import { PARENT_NAV_ITEMS } from "./navigation-config";

interface ParentLayoutProps {
  children: React.ReactNode;
}

/**
 * Parent Layout Component
 * 
 * NAVIGATION RULES:
 * - Web & Mobile: Bottom navigation only
 * - Items: Overview, Attendance, Messages
 * 
 * Parents ALWAYS use bottom navigation regardless of screen size.
 * Keeps the experience simple and focused.
 */
export function ParentLayout({ children }: ParentLayoutProps) {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <main className="pb-24">{children}</main>
      <BottomNav items={PARENT_NAV_ITEMS} />
    </div>
  );
}

/**
 * Simple Parent Bottom Nav for standalone use
 */
export function ParentNav() {
  return <BottomNav items={PARENT_NAV_ITEMS} />;
}
