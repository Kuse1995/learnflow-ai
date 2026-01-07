import { BottomNav } from "./BottomNav";
import { STUDENT_NAV_ITEMS } from "./navigation-config";

interface StudentLayoutProps {
  children: React.ReactNode;
}

/**
 * Student Layout Component
 * 
 * NAVIGATION RULES:
 * - Web & Mobile: Bottom navigation only
 * - Items: Learn, Homework, Tutor, Progress
 * 
 * Students ALWAYS use bottom navigation regardless of screen size.
 * This ensures a consistent, mobile-first experience.
 */
export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <div className="min-h-screen bg-background max-w-2xl mx-auto">
      <main className="pb-24">{children}</main>
      <BottomNav items={STUDENT_NAV_ITEMS} />
    </div>
  );
}

/**
 * Simple Student Bottom Nav for standalone use
 */
export function StudentNav() {
  return <BottomNav items={STUDENT_NAV_ITEMS} />;
}
