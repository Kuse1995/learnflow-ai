import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDemoMode, DEMO_USERS, DemoRole } from '@/contexts/DemoModeContext';
import { useSystemMode } from '@/hooks/useDemoSuperAdmin';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { GraduationCap, Shield, Users, Beaker, ArrowRight, Crown, Loader2, FlaskConical } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();
  const { enterDemoMode, enterAsSuperAdmin, isDemoMode, exitDemoMode } = useDemoMode();
  const { data: systemMode, isLoading: modeLoading } = useSystemMode();
  
  const [superAdminEmail, setSuperAdminEmail] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSelectRole = (role: DemoRole) => {
    enterDemoMode(role);
    navigate(DEMO_USERS[role].redirectPath);
  };

  const handleSuperAdminAccess = async () => {
    if (!superAdminEmail.trim()) {
      setValidationError('Please enter your email');
      return;
    }
    
    setIsValidating(true);
    setValidationError(null);
    
    const success = await enterAsSuperAdmin(superAdminEmail.trim());
    
    if (success) {
      toast({
        title: 'Super Admin Access Granted',
        description: 'Welcome to Demo Mode with full platform access.',
      });
      navigate('/platform-admin');
    } else {
      setValidationError('Email not authorized for super admin access');
    }
    
    setIsValidating(false);
  };

  const isDemoSystem = systemMode === 'demo';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col">
      {/* Demo Mode Banner */}
      <div className="bg-amber-500 text-amber-950 py-2 px-4 text-center text-sm font-medium flex items-center justify-center gap-2">
        <FlaskConical className="h-4 w-4" />
        <span>DEMO MODE — All data is simulated. No real notifications sent.</span>
        <FlaskConical className="h-4 w-4" />
      </div>

      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Beaker className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">Omanut SMS</span>
            <Badge variant="outline" className="ml-2 bg-amber-100 text-amber-800 border-amber-300">
              Demo
            </Badge>
          </div>
          
          {isDemoMode && (
            <Button variant="outline" size="sm" onClick={() => { exitDemoMode(); navigate('/demo/enter'); }}>
              Exit Demo
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-12 flex flex-col items-center justify-center">
        <div className="max-w-3xl w-full text-center mb-10">
          <Badge variant="secondary" className="mb-4 text-sm">
            {modeLoading ? 'Loading...' : isDemoSystem ? '🧪 Demo Environment Active' : '⚠️ Production Mode'}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight mb-4">
            Welcome to the Demo
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore the School Management System from different perspectives. 
            Select a role below to experience the platform.
          </p>
        </div>

        {/* Super Admin Access Card */}
        {isDemoSystem && (
          <Card className="w-full max-w-md mb-8 border-2 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-700">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-amber-600" />
                Super Admin Access
              </CardTitle>
              <CardDescription>
                Platform owners can access all features without authentication.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="super-admin-email">Email Address</Label>
                <Input
                  id="super-admin-email"
                  type="email"
                  placeholder="your@email.com"
                  value={superAdminEmail}
                  onChange={(e) => { setSuperAdminEmail(e.target.value); setValidationError(null); }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSuperAdminAccess()}
                />
              </div>
              
              {validationError && (
                <Alert variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">{validationError}</AlertDescription>
                </Alert>
              )}
              
              <Button 
                className="w-full" 
                onClick={handleSuperAdminAccess}
                disabled={isValidating}
              >
                {isValidating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Validating...
                  </>
                ) : (
                  <>
                    <Crown className="mr-2 h-4 w-4" />
                    Enter as Super Admin
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

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
        <div className="mt-12 p-6 rounded-xl bg-muted/50 max-w-2xl text-center border-2 border-dashed border-muted-foreground/20">
          <div className="flex items-center justify-center gap-2 mb-2">
            <FlaskConical className="h-5 w-5 text-muted-foreground" />
            <h3 className="font-semibold">About Demo Mode</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            This is a sandboxed environment with sample data from "North Park School (Demo)". 
            All data is isolated – no real notifications are sent, and nothing affects production systems.
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 text-center text-sm text-muted-foreground bg-muted/30">
        <span className="inline-flex items-center gap-1">
          <FlaskConical className="h-3 w-3" />
          Demo data is pre-populated and can be reset by admins.
        </span>
      </footer>
    </div>
  );
}
