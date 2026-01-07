import { BottomNav, type NavItem } from "./BottomNav";
import {
  LayoutGrid,
  Users,
  GraduationCap,
  CreditCard,
  Settings,
} from "lucide-react";

/**
 * School Admin navigation configuration.
 * Fixed navigation for admin role - consistent across all admin screens.
 */
const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutGrid },
  { label: "Students", href: "/admin/students", icon: Users },
  { label: "Classes", href: "/admin/classes", icon: GraduationCap },
  { label: "Fees", href: "/admin/fees", icon: CreditCard },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export function AdminNav() {
  return <BottomNav items={adminNavItems} />;
}
