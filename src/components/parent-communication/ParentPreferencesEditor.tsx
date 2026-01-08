/**
 * Parent Preferences Editor
 * 
 * Allows admins to edit parent communication preferences
 * when parent is offline or unable to manage their own settings.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  MessageSquare, 
  Phone, 
  Mail, 
  Ban, 
  Clock, 
  Shield,
  AlertTriangle,
  History,
} from "lucide-react";
import { 
  useParentPreferences, 
  useUpdatePreferences, 
  usePreferenceHistory,
  toPreferences,
  type PreferenceUpdate 
} from "@/hooks/useParentPreferences";
import { DEFAULT_PREFERENCES, PreferredChannel, CATEGORY_DEFAULTS } from "@/lib/parent-preferences";
import { format } from "date-fns";

interface ParentPreferencesEditorProps {
  parentContactId: string;
  parentName: string;
  isAdmin?: boolean;
}

const CHANNEL_OPTIONS: { value: PreferredChannel; label: string; icon: React.ReactNode }[] = [
  { value: "whatsapp", label: "WhatsApp", icon: <MessageSquare className="h-4 w-4" /> },
  { value: "sms", label: "SMS", icon: <Phone className="h-4 w-4" /> },
  { value: "email", label: "Email", icon: <Mail className="h-4 w-4" /> },
  { value: "none", label: "No messages", icon: <Ban className="h-4 w-4" /> },
];

export function ParentPreferencesEditor({ 
  parentContactId, 
  parentName,
  isAdmin = false 
}: ParentPreferencesEditorProps) {
  const { data: contact, isLoading } = useParentPreferences(parentContactId);
  const { data: history } = usePreferenceHistory(parentContactId);
  const updateMutation = useUpdatePreferences();
  
  const [pendingChanges, setPendingChanges] = useState<PreferenceUpdate>({});
  const [reason, setReason] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading || !contact) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <span className="text-muted-foreground">Loading preferences...</span>
        </CardContent>
      </Card>
    );
  }

  const preferences = toPreferences(contact);
  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleChange = (key: keyof PreferenceUpdate, value: unknown) => {
    setPendingChanges(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    await updateMutation.mutateAsync({
      parentContactId,
      updates: pendingChanges,
      changedByRole: isAdmin ? "admin" : "teacher",
      reason: reason || undefined,
    });
    setPendingChanges({});
    setReason("");
  };

  const handleCancel = () => {
    setPendingChanges({});
    setReason("");
  };

  const getValue = <K extends keyof PreferenceUpdate>(key: K): PreferenceUpdate[K] => {
    return pendingChanges[key] !== undefined 
      ? pendingChanges[key] 
      : preferences[key as keyof typeof preferences] as PreferenceUpdate[K];
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Communication Preferences</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(!showHistory)}
            >
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
          </CardTitle>
          <CardDescription>
            Manage how {parentName} receives messages
            {isAdmin && " (admin editing)"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Global Opt-Out Warning */}
          {preferences.globalOptOut && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This parent has opted out of all communications.
                {preferences.optOutReason && ` Reason: ${preferences.optOutReason}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Preferred Channel */}
          <div className="space-y-2">
            <Label>Preferred Channel</Label>
            <Select
              value={getValue("preferred_channel") ?? preferences.preferredChannel}
              onValueChange={(v) => handleChange("preferred_channel", v as PreferredChannel)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CHANNEL_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div className="flex items-center gap-2">
                      {opt.icon}
                      {opt.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Global Opt-Out */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Global Opt-Out</Label>
              <p className="text-sm text-muted-foreground">
                Stop all non-emergency messages
              </p>
            </div>
            <Switch
              checked={getValue("global_opt_out") ?? preferences.globalOptOut}
              onCheckedChange={(v) => handleChange("global_opt_out", v)}
            />
          </div>

          <Separator />

          {/* Category Preferences */}
          <div className="space-y-4">
            <Label className="text-base">Message Categories</Label>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Learning Updates</span>
                  {CATEGORY_DEFAULTS.learning_update.default && (
                    <Badge variant="outline" className="ml-2 text-xs">Default ON</Badge>
                  )}
                </div>
                <Switch
                  checked={getValue("receives_learning_updates") ?? preferences.receivesLearningUpdates}
                  onCheckedChange={(v) => handleChange("receives_learning_updates", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Attendance Notices</span>
                  {CATEGORY_DEFAULTS.attendance_notice.default && (
                    <Badge variant="outline" className="ml-2 text-xs">Default ON</Badge>
                  )}
                </div>
                <Switch
                  checked={getValue("receives_attendance_notices") ?? preferences.receivesAttendanceNotices}
                  onCheckedChange={(v) => handleChange("receives_attendance_notices", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Account Information</span>
                  <Badge variant="secondary" className="ml-2 text-xs">Opt-in only</Badge>
                </div>
                <Switch
                  checked={getValue("receives_fee_updates") ?? preferences.receivesFeeUpdates}
                  onCheckedChange={(v) => handleChange("receives_fee_updates", v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">Announcements</span>
                  {CATEGORY_DEFAULTS.school_announcement.default && (
                    <Badge variant="outline" className="ml-2 text-xs">Default ON</Badge>
                  )}
                </div>
                <Switch
                  checked={getValue("receives_announcements") ?? preferences.receivesAnnouncements}
                  onCheckedChange={(v) => handleChange("receives_announcements", v)}
                />
              </div>

              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Emergency Notices</span>
                  <Badge variant="default" className="text-xs">Always ON</Badge>
                </div>
                <Switch checked disabled />
              </div>
            </div>
          </div>

          <Separator />

          {/* Quiet Hours */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Quiet Hours
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              No messages sent during these hours (except emergencies)
            </p>
            <div className="flex items-center gap-2">
              <Select
                value={String(getValue("quiet_hours_start") ?? preferences.quietHoursStart)}
                onValueChange={(v) => handleChange("quiet_hours_start", parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">to</span>
              <Select
                value={String(getValue("quiet_hours_end") ?? preferences.quietHoursEnd)}
                onValueChange={(v) => handleChange("quiet_hours_end", parseInt(v))}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => (
                    <SelectItem key={i} value={String(i)}>
                      {i.toString().padStart(2, "0")}:00
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Weekly Limit */}
          <div className="space-y-2">
            <Label>Maximum Messages Per Week</Label>
            <Select
              value={String(getValue("max_messages_per_week") ?? preferences.maxMessagesPerWeek)}
              onValueChange={(v) => handleChange("max_messages_per_week", parseInt(v))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 5, 10, 15, 20].map(n => (
                  <SelectItem key={n} value={String(n)}>
                    {n} messages
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Admin Reason Field */}
          {hasChanges && isAdmin && (
            <>
              <Separator />
              <div className="space-y-2">
                <Label>Reason for Change (Optional)</Label>
                <Textarea
                  placeholder="e.g., Parent requested via phone call"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={2}
                />
              </div>
            </>
          )}

          {/* Action Buttons */}
          {hasChanges && (
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={updateMutation.isPending}>
                Save Changes
              </Button>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          )}

          {/* Last Updated Info */}
          {preferences.preferencesUpdatedAt && (
            <p className="text-xs text-muted-foreground pt-2">
              Last updated: {format(new Date(preferences.preferencesUpdatedAt), "MMM d, yyyy 'at' h:mm a")}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Preference History */}
      {showHistory && history && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="text-sm border-l-2 border-muted pl-3 py-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {entry.change_type.replace("_", " ")}
                    </Badge>
                    <span className="text-muted-foreground">
                      by {entry.changed_by_role}
                    </span>
                  </div>
                  {entry.reason && (
                    <p className="text-muted-foreground mt-1">{entry.reason}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(entry.created_at), "MMM d, yyyy 'at' h:mm a")}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
