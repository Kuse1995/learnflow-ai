import { useNavigate } from 'react-router-dom';
import { useDemoMode, DEMO_USERS } from '@/contexts/DemoModeContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GraduationCap, Shield, Users, Beaker, ArrowRight } from 'lucide-react';

const roleConfig = {
  teacher: {
    icon: GraduationCap,
    title: 'Teacher',
    description: 'View classes, take attendance, upload assessments, and see AI-generated insights.',
    color: 'bg-blue-500',
  },
  school_admin: {
    icon: Shield,
    title: 'School Admin',
    description: 'Manage school settings, view reports, and control demo data.',
    color: 'bg-purple-500',
  },
  parent: {
    icon: Users,
    title: 'Parent',
    description: 'View your child\'s progress, attendance, and teacher insights.',
    color: 'bg-green-500',
  },
} as const;

export default function DemoLanding() {
  const navigate = useNavigate();
  const { enterDemoMode, isDemoMode, exitDemoMode } = useDemoMode();

  const handleSelectRole = (role: keyof typeof DEMO_USERS) => {
    enterDemoMode(role);
    navigate(DEMO_USERS[role].redirectPath);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Beaker className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Omanut SMS</span>
            <Badge variant="secondary" className="ml-2">Demo</Badge>
          </div>
          
          {isDemoMode && (
            <Button variant="outline" size="sm" onClick={exitDemoMode}>
              Exit Demo
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to the Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore the School Management System from different perspectives. 
            Select a role below to experience the platform.
          </p>
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-3 gap-6 w-full max-w-4xl">
          {(Object.keys(roleConfig) as Array<keyof typeof roleConfig>).map((role) => {
            const config = roleConfig[role];
            const Icon = config.icon;
            
            return (
              <Card 
                key={role}
                className="group hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer border-2 hover:border-primary/50"
                onClick={() => handleSelectRole(role)}
              >
                <CardHeader className="text-center pb-2">
                  <div className={`mx-auto h-16 w-16 rounded-2xl ${config.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>
                  <CardTitle className="text-xl">{config.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <CardDescription className="mb-4">
                    {config.description}
                  </CardDescription>
                  <Button variant="ghost" className="group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    Enter as {config.title}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Demo Info */}
        <div className="mt-12 p-6 rounded-xl bg-muted/50 max-w-2xl text-center">
          <h3 className="font-semibold mb-2">About Demo Mode</h3>
          <p className="text-sm text-muted-foreground">
            This is a sandboxed environment with sample data from "North Park School (Demo)". 
            All data is isolated – no real notifications are sent, and nothing affects production systems.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground">
        Demo data is pre-populated and can be reset by admins.
      </footer>
    </div>
  );
}
