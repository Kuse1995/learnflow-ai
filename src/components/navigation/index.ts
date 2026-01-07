// Navigation System Exports
// ===========================
// Import the appropriate layout for each role's pages.

// Configuration (for reference/customization)
export * from "./navigation-config";

// Core Components
export { BottomNav } from "./BottomNav";
export { RoleSidebar } from "./RoleSidebar";

// Role-Specific Layouts (USE THESE IN PAGES)
export { AdminLayout } from "./AdminNav";
export { TeacherLayout, TeacherNav } from "./TeacherNav";
export { StudentLayout, StudentNav } from "./StudentNav";
export { ParentLayout, ParentNav } from "./ParentNav";

/**
 * NAVIGATION RULES SUMMARY
 * ========================
 * 
 * ┌─────────────┬─────────────────────┬─────────────────────────────────────┐
 * │ ROLE        │ WEB (Desktop)       │ MOBILE                              │
 * ├─────────────┼─────────────────────┼─────────────────────────────────────┤
 * │ Admin       │ AdminLayout         │ AdminLayout (bottom nav alerts)     │
 * │ Teacher     │ TeacherLayout       │ TeacherLayout (bottom nav)          │
 * │ Student     │ StudentLayout       │ StudentLayout (same bottom nav)     │
 * │ Parent      │ ParentLayout        │ ParentLayout (same bottom nav)      │
 * └─────────────┴─────────────────────┴─────────────────────────────────────┘
 * 
 * USAGE EXAMPLE:
 * ```tsx
 * // In an admin page:
 * import { AdminLayout } from "@/components/navigation";
 * 
 * export function AdminDashboard() {
 *   return (
 *     <AdminLayout>
 *       <h1>Dashboard Content</h1>
 *     </AdminLayout>
 *   );
 * }
 * 
 * // In a student page:
 * import { StudentLayout } from "@/components/navigation";
 * 
 * export function StudentHome() {
 *   return (
 *     <StudentLayout>
 *       <h1>Student Content</h1>
 *     </StudentLayout>
 *   );
 * }
 * ```
 */
