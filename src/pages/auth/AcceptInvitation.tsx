import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { toast } from 'sonner';

type InvitationStatus = 'loading' | 'valid' | 'expired' | 'already_accepted' | 'not_found' | 'error';

interface InvitationData {
  id: string;
  email: string;
  full_name: string | null;
  school_id: string;
  school_name?: string;
  expires_at: string;
  status: string;
}

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  
  const [invitationStatus, setInvitationStatus] = useState<InvitationStatus>('loading');
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Signup form state
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (token) {
      validateInvitation(token);
    }
  }, [token]);

  const validateInvitation = async (inviteToken: string) => {
    try {
      // Fetch invitation details
      const { data: inviteData, error: inviteError } = await supabase
        .from('teacher_invitations')
        .select(`
          id,
          email,
          full_name,
          school_id,
          expires_at,
          status,
          schools!inner(name)
        `)
        .eq('invite_token', inviteToken)
        .single();

      if (inviteError || !inviteData) {
        setInvitationStatus('not_found');
        return;
      }

      // Check if already accepted
      if (inviteData.status === 'accepted') {
        setInvitationStatus('already_accepted');
        return;
      }

      // Check if expired
      if (new Date(inviteData.expires_at) < new Date()) {
        setInvitationStatus('expired');
        return;
      }

      // Check if cancelled
      if (inviteData.status === 'cancelled') {
        setInvitationStatus('not_found');
        return;
      }

      const schoolData = inviteData.schools as unknown as { name: string };
      
      setInvitation({
        id: inviteData.id,
        email: inviteData.email,
        full_name: inviteData.full_name,
        school_id: inviteData.school_id,
        school_name: schoolData?.name,
        expires_at: inviteData.expires_at,
        status: inviteData.status,
      });
      setFullName(inviteData.full_name || '');

      // Check if user already exists
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', inviteData.email)
        .maybeSingle();

      setIsNewUser(!existingUser);
      setInvitationStatus('valid');
    } catch (error) {
      console.error('Error validating invitation:', error);
      setInvitationStatus('error');
    }
  };

  const handleAcceptAsExistingUser = async () => {
    if (!invitation) return;
    
    setIsProcessing(true);
    try {
      // Check if user is logged in
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Redirect to login with return URL
        toast.info('Please log in to accept this invitation');
        navigate(`/auth?returnTo=/invite/${token}`);
        return;
      }

      // Verify email matches
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        toast.error('Please log in with the email address the invitation was sent to');
        return;
      }

      // Create teacher role for user
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          school_id: invitation.school_id,
          role: 'teacher',
        });

      if (roleError) {
        if (roleError.code === '23505') {
          toast.error('You already have a role at this school');
        } else {
          throw roleError;
        }
        return;
      }

      // Update invitation status
      await supabase
        .from('teacher_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      toast.success('Welcome! You have joined the school as a teacher.');
      navigate('/teacher');
    } catch (error) {
      console.error('Error accepting invitation:', error);
      toast.error('Failed to accept invitation');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSignupAndAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsProcessing(true);
    try {
      // Create new user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (authError) throw authError;

      if (!authData.user) {
        toast.error('Failed to create account');
        return;
      }

      // Create teacher role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          school_id: invitation.school_id,
          role: 'teacher',
        });

      if (roleError) throw roleError;

      // Update invitation status
      await supabase
        .from('teacher_invitations')
        .update({ 
          status: 'accepted',
          accepted_at: new Date().toISOString(),
        })
        .eq('id', invitation.id);

      toast.success('Account created! Welcome to the school.');
      navigate('/teacher');
    } catch (error: any) {
      console.error('Error during signup:', error);
      toast.error(error.message || 'Failed to create account');
    } finally {
      setIsProcessing(false);
    }
  };

  if (invitationStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationStatus === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invitation Not Found</CardTitle>
            <CardDescription>
              This invitation link is invalid or has been cancelled.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationStatus === 'expired') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Please contact the school administrator for a new invitation.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationStatus === 'already_accepted') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <CardTitle>Already Accepted</CardTitle>
            <CardDescription>
              This invitation has already been accepted. You can log in to access your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (invitationStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-2" />
            <CardTitle>Something Went Wrong</CardTitle>
            <CardDescription>
              We couldn't process your invitation. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => navigate('/auth')}>Go to Login</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Valid invitation
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 text-primary mx-auto mb-2" />
          <CardTitle>You're Invited!</CardTitle>
          <CardDescription>
            You've been invited to join <strong>{invitation?.school_name}</strong> as a teacher.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertDescription>
              Invitation for: <strong>{invitation?.email}</strong>
            </AlertDescription>
          </Alert>

          {isNewUser ? (
            <form onSubmit={handleSignupAndAccept} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={invitation?.email || ''}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isProcessing}>
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account & Join School'
                )}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground text-center">
                An account with this email already exists. Log in to accept this invitation.
              </p>
              <Button 
                onClick={handleAcceptAsExistingUser} 
                className="w-full"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Log In & Accept Invitation'
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
