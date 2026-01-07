import { useState, useEffect } from "react";
import { Shield, AlertTriangle, Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useComplianceSettings, useUpdateComplianceSettings, type ComplianceMode } from "@/hooks/useComplianceSettings";
import { useToast } from "@/hooks/use-toast";

interface ComplianceSettingsPanelProps {
  schoolId: string;
}

export function ComplianceSettingsPanel({ schoolId }: ComplianceSettingsPanelProps) {
  const { toast } = useToast();
  const { data: settings, isLoading } = useComplianceSettings(schoolId);
  const updateSettings = useUpdateComplianceSettings();

  const [localMode, setLocalMode] = useState<ComplianceMode>('standard');
  const [localApproval, setLocalApproval] = useState(false);
  const [localAutoGen, setLocalAutoGen] = useState(false);
  const [localConfirmation, setLocalConfirmation] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (settings) {
      setLocalMode(settings.compliance_mode);
      setLocalApproval(settings.require_teacher_approval);
      setLocalAutoGen(settings.disable_auto_generation);
      setLocalConfirmation(settings.require_confirmation_steps);
    }
  }, [settings]);

  useEffect(() => {
    if (settings) {
      const changed = 
        localMode !== settings.compliance_mode ||
        localApproval !== settings.require_teacher_approval ||
        localAutoGen !== settings.disable_auto_generation ||
        localConfirmation !== settings.require_confirmation_steps;
      setHasChanges(changed);
    }
  }, [localMode, localApproval, localAutoGen, localConfirmation, settings]);

  // Auto-apply strict mode settings
  useEffect(() => {
    if (localMode === 'strict') {
      setLocalApproval(true);
      setLocalAutoGen(true);
      setLocalConfirmation(true);
    }
  }, [localMode]);

  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        school_id: schoolId,
        compliance_mode: localMode,
        require_teacher_approval: localApproval,
        disable_auto_generation: localAutoGen,
        require_confirmation_steps: localConfirmation,
      });
      toast({
        title: "Settings saved",
        description: "Compliance settings have been updated",
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to save compliance settings",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Compliance Settings
        </CardTitle>
        <CardDescription>
          Configure how the system handles AI suggestions and data access for your school
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <Label className="text-base">Compliance Mode</Label>
          <p className="text-sm text-muted-foreground mb-3">
            Choose how strictly the system enforces approval workflows
          </p>
          
          <RadioGroup
            value={localMode}
            onValueChange={(v) => setLocalMode(v as ComplianceMode)}
            className="space-y-3"
          >
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
              <RadioGroupItem value="standard" id="standard" className="mt-1" />
              <div>
                <Label htmlFor="standard" className="font-medium cursor-pointer">
                  Standard Mode
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI suggestions are generated automatically and teachers can review them when convenient. 
                  Suitable for most schools.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors border-amber-200 dark:border-amber-800">
              <RadioGroupItem value="strict" id="strict" className="mt-1" />
              <div>
                <Label htmlFor="strict" className="font-medium cursor-pointer flex items-center gap-2">
                  Strict Mode
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                </Label>
                <p className="text-sm text-muted-foreground">
                  AI suggestions require teacher approval before being visible. Auto-generation is disabled.
                  Recommended for regulatory compliance or pilot programs.
                </p>
              </div>
            </div>
          </RadioGroup>
        </div>
        
        <div className="space-y-4 pt-4 border-t">
          <Label className="text-base">Individual Controls</Label>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="approval" className="font-medium">
                Require Teacher Approval
              </Label>
              <p className="text-sm text-muted-foreground">
                AI suggestions must be approved before parents can see them
              </p>
            </div>
            <Switch
              id="approval"
              checked={localApproval}
              onCheckedChange={setLocalApproval}
              disabled={localMode === 'strict'}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="autogen" className="font-medium">
                Disable Auto-Generation
              </Label>
              <p className="text-sm text-muted-foreground">
                AI will only generate content when explicitly requested
              </p>
            </div>
            <Switch
              id="autogen"
              checked={localAutoGen}
              onCheckedChange={setLocalAutoGen}
              disabled={localMode === 'strict'}
            />
          </div>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div>
              <Label htmlFor="confirm" className="font-medium">
                Confirmation Steps
              </Label>
              <p className="text-sm text-muted-foreground">
                Add extra confirmation dialogs for sensitive actions
              </p>
            </div>
            <Switch
              id="confirm"
              checked={localConfirmation}
              onCheckedChange={setLocalConfirmation}
              disabled={localMode === 'strict'}
            />
          </div>
        </div>
        
        {localMode === 'strict' && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              In strict mode, all individual controls are automatically enabled and cannot be changed.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="flex justify-end pt-4">
          <Button 
            onClick={handleSave}
            disabled={!hasChanges || updateSettings.isPending}
          >
            {updateSettings.isPending ? (
              "Saving..."
            ) : hasChanges ? (
              "Save Changes"
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Saved
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
