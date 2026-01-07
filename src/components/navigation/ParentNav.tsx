import { BottomNav, type NavItem } from "./BottomNav";
import {
  LayoutGrid,
  Calendar,
  CreditCard,
  User,
} from "lucide-react";

/**
 * Parent navigation configuration.
 * Fixed navigation for parent role - consistent across all parent screens.
 */
const parentNavItems: NavItem[] = [
  { label: "Home", href: "/parent", icon: LayoutGrid },
  { label: "Calendar", href: "/parent/calendar", icon: Calendar },
  { label: "Pay", href: "/parent/payments", icon: CreditCard },
  { label: "Profile", href: "/parent/profile", icon: User },
];

export function ParentNav() {
  return <BottomNav items={parentNavItems} />;
}
