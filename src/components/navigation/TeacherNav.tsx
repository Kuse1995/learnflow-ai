import { BottomNav, type NavItem } from "./BottomNav";
import {
  Home,
  BookOpen,
  GraduationCap,
  MessageSquare,
} from "lucide-react";

/**
 * Teacher navigation configuration.
 * Fixed navigation for teacher role - consistent across all teacher screens.
 */
const teacherNavItems: NavItem[] = [
  { label: "Home", href: "/teacher", icon: Home },
  { label: "Library", href: "/teacher/library", icon: BookOpen },
  { label: "Classes", href: "/teacher/classes", icon: GraduationCap },
  { label: "Messages", href: "/teacher/messages", icon: MessageSquare },
];

export function TeacherNav() {
  return <BottomNav items={teacherNavItems} />;
}
