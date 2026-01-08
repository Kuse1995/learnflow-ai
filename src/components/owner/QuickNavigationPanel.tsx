import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import {
  Building2,
  BarChart3,
  FileText,
  Activity,
  Shield,
  ClipboardCheck,
  Database,
  Users,
  GraduationCap,
  Settings,
} from 'lucide-react';

const NAV_LINKS = [
  { to: '/platform-admin/schools', icon: Building2, label: 'Schools', description: 'Full school management' },
  { to: '/platform-admin/usage', icon: BarChart3, label: 'Usage', description: 'Usage metrics dashboard' },
  { to: '/platform-admin/audit-logs', icon: FileText, label: 'Audit Logs', description: 'System audit trail' },
  { to: '/platform-admin/system-status', icon: Activity, label: 'System Status', description: 'Health monitoring' },
  { to: '/platform-admin/security', icon: Shield, label: 'Security', description: 'Security dashboard' },
  { to: '/platform-admin/compliance', icon: ClipboardCheck, label: 'Compliance', description: 'Compliance settings' },
  { to: '/platform-admin/backups', icon: Database, label: 'Backups', description: 'Backup management' },
  { to: '/platform-admin/onboarding', icon: Users, label: 'Onboarding', description: 'School onboarding' },
  { to: '/platform-admin/pilot', icon: GraduationCap, label: 'Pilot', description: 'Pilot deployments' },
  { to: '/platform-admin', icon: Settings, label: 'Dashboard', description: 'Platform admin home' },
];

export function QuickNavigationPanel() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Quick Navigation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex flex-col items-center gap-2 p-3 rounded-lg border bg-card hover:bg-accent transition-colors text-center"
            >
              <link.icon className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
