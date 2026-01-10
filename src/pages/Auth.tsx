import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Beaker, Loader2, Mail, Lock, User, Sparkles, AlertCircle } from 'lucide-react';
import { z } from 'zod';

const emailSchema = z.string().email('Please enter a valid email address');
const passwordSchema = z.string().min(6, 'Password must be at least 6 characters');

// Super admin email - uses magic link authentication
const SUPER_ADMIN_EMAIL = 'abkanyanta@gmail.com';

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [alreadyRegisteredMessage, setAlreadyRegisteredMessage] = useState<string | null>(null);
  const signinEmailRef = useRef<HTMLInputElement>(null);

  // Check for existing session - redirect to role-based dashboard
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        navigate('/home');
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        navigate('/home');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const validateForm = (isSignUp: boolean): boolean => {
    const newErrors: typeof errors = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    if (isSignUp && !fullName.trim()) {
      newErrors.fullName = 'Please enter your full name';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSuperAdminMagicLink = async () => {
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithOtp({
      email: SUPER_ADMIN_EMAIL,
      options: {
        emailRedirectTo: `${window.location.origin}/home`,
      },
    });

    if (error) {
      toast({
        title: 'Magic link failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      setMagicLinkSent(true);
      toast({
        title: 'Magic link sent!',
        description: `Check ${SUPER_ADMIN_EMAIL} for a login link.`,
      });
    }
    
    setIsLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(false)) return;
    
    setIsLoading(true);
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast({
        title: 'Sign in failed',
        description: error.message === 'Invalid login credentials' 
          ? 'Invalid email or password. Please try again.'
          : error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have been signed in successfully.',
      });
    }
    
    setIsLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;
    
    setIsLoading(true);
    
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      if (error.message.includes('already registered')) {
        // Auto-switch to sign in tab with the email pre-filled
        setAlreadyRegisteredMessage(`This email is already registered. Please sign in below.`);
        setActiveTab('signin');
        // Focus the password field after tab switch
        setTimeout(() => {
          signinEmailRef.current?.focus();
        }, 100);
        toast({
          title: 'Account exists',
          description: 'Switched to sign in. Enter your password to continue.',
        });
      } else {
        toast({
          title: 'Sign up failed',
          description: error.message,
          variant: 'destructive',
        });
      }
    } else {
      toast({
        title: 'Account created!',
        description: 'You can now sign in with your credentials.',
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
          <Beaker className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-bold text-2xl">Omanut SMS</span>
        <Badge variant="secondary">Beta</Badge>
      </div>

      <Card className="w-full max-w-md">
        <Tabs value={activeTab} onValueChange={(value) => {
          setActiveTab(value);
          setAlreadyRegisteredMessage(null);
        }} className="w-full">
          <CardHeader className="pb-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <CardContent>
            {/* Sign In Tab */}
            <TabsContent value="signin" className="mt-0">
              <CardTitle className="text-xl mb-2">Welcome back</CardTitle>
              <CardDescription className="mb-6">
                Sign in to your account to continue
              </CardDescription>

              {alreadyRegisteredMessage && (
                <Alert className="mb-4 border-primary/50 bg-primary/10">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{alreadyRegisteredMessage}</AlertDescription>
                </Alert>
              )}
              
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      ref={signinEmailRef}
                      id="signin-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signin-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </Button>
              </form>
            </TabsContent>

            {/* Sign Up Tab */}
            <TabsContent value="signup" className="mt-0">
              <CardTitle className="text-xl mb-2">Create an account</CardTitle>
              <CardDescription className="mb-6">
                Get started with Omanut SMS
              </CardDescription>
              
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="John Doe"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-destructive">{errors.email}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      disabled={isLoading}
                    />
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password}</p>
                  )}
                </div>
                
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    'Create Account'
                  )}
                </Button>
              </form>
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>

      {/* Super Admin Magic Link */}
      <Card className="w-full max-w-md mt-6 border-primary/20 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            Platform Owner Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {magicLinkSent ? (
            <p className="text-sm text-muted-foreground">
              ✅ Magic link sent to <strong>{SUPER_ADMIN_EMAIL}</strong>. Check your inbox!
            </p>
          ) : (
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleSuperAdminMagicLink}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Mail className="mr-2 h-4 w-4" />
                  Send Magic Link to Owner
                </>
              )}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Demo Mode Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Just exploring? Try the demo without signing up.
        </p>
        <Button variant="outline" onClick={() => navigate('/demo/enter')}>
          Enter Demo Mode
        </Button>
      </div>
    </div>
  );
}
