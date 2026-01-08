/**
 * Invite Teacher Dialog
 * Allows school admins to invite teachers via email
 */

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Send, Copy, Check, Link } from "lucide-react";
import { useInviteTeacher } from "@/hooks/useSchoolAdmin";
import { Alert, AlertDescription } from "@/components/ui/alert";

const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  fullName: z.string().optional(),
});

type InviteFormData = z.infer<typeof inviteSchema>;

interface InviteTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
}

export function InviteTeacherDialog({
  open,
  onOpenChange,
  schoolId,
  schoolName,
}: InviteTeacherDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{
    inviteUrl: string;
    emailSent: boolean;
    emailError?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const inviteTeacher = useInviteTeacher();

  const form = useForm<InviteFormData>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      fullName: "",
    },
  });

  const onSubmit = async (data: InviteFormData) => {
    setIsSubmitting(true);
    try {
      const result = await inviteTeacher.mutateAsync({
        schoolId,
        email: data.email,
        fullName: data.fullName || undefined,
      });
      // Show the invite URL after creation
      if (result?.invitation?.inviteUrl) {
        setInviteResult({
          inviteUrl: result.invitation.inviteUrl,
          emailSent: result.emailSent ?? false,
          emailError: result.emailError,
        });
      } else {
        form.reset();
        onOpenChange(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyToClipboard = async () => {
    if (inviteResult?.inviteUrl) {
      await navigator.clipboard.writeText(inviteResult.inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setInviteResult(null);
    setCopied(false);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {inviteResult ? "Invitation Created" : "Invite Teacher"}
          </DialogTitle>
          <DialogDescription>
            {inviteResult
              ? "Share this link with the teacher to join your school."
              : `Send an invitation email to join ${schoolName} as a teacher.`}
          </DialogDescription>
        </DialogHeader>

        {inviteResult ? (
          <div className="space-y-4">
            {!inviteResult.emailSent && inviteResult.emailError && (
              <Alert>
                <AlertDescription className="text-sm">
                  Email could not be sent automatically. Please share the invite link manually.
                </AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Link className="h-4 w-4" />
                Invite Link
              </label>
              <div className="flex gap-2">
                <Input
                  value={inviteResult.inviteUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days.
              </p>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="teacher@email.com"
                        type="email"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      They'll receive an invitation link to this email
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name (Optional)</FormLabel>
                    <FormControl>
                      <Input placeholder="John Mwansa" {...field} />
                    </FormControl>
                    <FormDescription>
                      Helps identify the teacher in your list
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
