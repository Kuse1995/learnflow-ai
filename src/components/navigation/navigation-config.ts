/**
 * ========================================
 * NAVIGATION RULES - SCHOOL MANAGEMENT SYSTEM
 * ========================================
 * 
 * These navigation patterns MUST NOT be mixed across roles.
 * All future screens MUST reuse the appropriate navigation component.
 * 
 * ┌─────────────┬─────────────────────┬─────────────────────────────────────┐
 * │ ROLE        │ WEB (Desktop)       │ MOBILE                              │
 * ├─────────────┼─────────────────────┼─────────────────────────────────────┤
 * │ Admin       │ Left Sidebar        │ Optional bottom nav (alerts only)   │
 * │ Teacher     │ Left Sidebar        │ Bottom Nav (4 items)                │
 * │ Student     │ Bottom Nav only     │ Bottom Nav only (4 items)           │
 * │ Parent      │ Bottom Nav only     │ Bottom Nav only (3 items)           │
 * └─────────────┴─────────────────────┴─────────────────────────────────────┘
 * 
 * NAV ITEMS PER ROLE:
 * 
 * ADMIN (Sidebar):
 *   - Dashboard
 *   - Students
 *   - Teachers
 *   - Classes
 *   - Fees
 *   - Reports
 *   - Settings
 * 
 * TEACHER:
 *   - Web Sidebar: Home, Classes, Attendance, Library, AI Tools, Messages
 *   - Mobile Bottom: Attendance, Classes, Uploads, Insights
 * 
 * STUDENT (Bottom Nav only):
 *   - Learn
 *   - Homework
 *   - Tutor
 *   - Progress
 * 
 * PARENT (Bottom Nav only):
 *   - Overview
 *   - Attendance
 *   - Messages
 */

export type UserRole = "admin" | "teacher" | "student" | "parent";

export interface NavItem {
  label: string;
  href: string;
  icon: string; // Lucide icon name
  badge?: number; // Optional notification badge
}

// Admin Navigation Items (Sidebar)
export const ADMIN_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: "LayoutGrid" },
  { label: "Students", href: "/admin/students", icon: "Users" },
  { label: "Parents", href: "/admin/parents", icon: "Users2" },
  { label: "Teachers", href: "/admin/teachers", icon: "GraduationCap" },
  { label: "Classes", href: "/admin/classes", icon: "School" },
  { label: "Fees", href: "/admin/fees", icon: "CreditCard" },
  { label: "Reports", href: "/admin/reports", icon: "BarChart3" },
  { label: "Settings", href: "/admin/settings", icon: "Settings" },
];

// Admin Mobile Alert Nav (optional, alerts only)
export const ADMIN_MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Alerts", href: "/admin/alerts", icon: "Bell" },
];

// Teacher Sidebar Items (Web)
export const TEACHER_SIDEBAR_ITEMS: NavItem[] = [
  { label: "Home", href: "/teacher", icon: "Home" },
  { label: "Classes", href: "/teacher/classes", icon: "School" },
  { label: "Attendance", href: "/teacher/attendance", icon: "ClipboardCheck" },
  { label: "Library", href: "/teacher/library", icon: "BookOpen" },
  { label: "AI Tools", href: "/teacher/ai", icon: "Sparkles" },
  { label: "Messages", href: "/teacher/messages", icon: "MessageSquare" },
];

// Teacher Bottom Nav Items (Mobile)
export const TEACHER_MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Attendance", href: "/teacher/attendance", icon: "ClipboardCheck" },
  { label: "Classes", href: "/teacher/classes", icon: "School" },
  { label: "Uploads", href: "/teacher/uploads", icon: "Upload" },
  { label: "Insights", href: "/teacher/insights", icon: "Sparkles" },
];

// Student Navigation Items (Bottom Nav only - same for web and mobile)
export const STUDENT_NAV_ITEMS: NavItem[] = [
  { label: "Learn", href: "/student", icon: "GraduationCap" },
  { label: "Homework", href: "/student/homework", icon: "ClipboardList" },
  { label: "Tutor", href: "/student/tutor", icon: "Bot" },
  { label: "Progress", href: "/student/progress", icon: "TrendingUp" },
];

// Parent Navigation Items (Bottom Nav only - same for web and mobile)
export const PARENT_NAV_ITEMS: NavItem[] = [
  { label: "Overview", href: "/parent", icon: "LayoutGrid" },
  { label: "Attendance", href: "/parent/attendance", icon: "CalendarCheck" },
  { label: "Messages", href: "/parent/messages", icon: "MessageSquare" },
];
