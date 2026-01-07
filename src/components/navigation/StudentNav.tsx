import { BottomNav, type NavItem } from "./BottomNav";
import {
  GraduationCap,
  ClipboardList,
  Bot,
  TrendingUp,
} from "lucide-react";

/**
 * Student navigation configuration.
 * Fixed navigation for student role - consistent across all student screens.
 */
const studentNavItems: NavItem[] = [
  { label: "Learn", href: "/student", icon: GraduationCap },
  { label: "Homework", href: "/student/homework", icon: ClipboardList },
  { label: "Tutor", href: "/student/tutor", icon: Bot },
  { label: "Progress", href: "/student/progress", icon: TrendingUp },
];

export function StudentNav() {
  return <BottomNav items={studentNavItems} />;
}
