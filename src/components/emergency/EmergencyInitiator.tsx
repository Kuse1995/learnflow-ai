/**
 * Emergency Initiator Component
 * 
 * Admin-only form to initiate new emergency notifications
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Info, Send, Shield } from 'lucide-react';
import {
  useInitiateEmergency,
  useBroadcastEmergency,
  useEmergencyAuthorization,
} from '@/hooks/useEmergencyNotifications';
import {
  EmergencyType,
  EmergencySeverity,
  EMERGENCY_CONFIG,
} from '@/lib/emergency-notification-system';

interface EmergencyInitiatorProps {
  schoolId: string;
}

const emergencyTypeLabels: Record<EmergencyType, { label: string; description: string }> = {
  school_closure: {
    label: 'School Closure',
    description: 'Full or partial school closure affecting student attendance',
  },
  safety_incident: {
    label: 'Safety Incident',
    description: 'Security or safety concern requiring immediate parent notification',
  },
  weather_disruption: {
    label: 'Weather Disruption',
    description: 'Weather-related changes to school operations',
  },
  infrastructure_failure: {
    label: 'Infrastructure Failure',
    description: 'Power, water, or building issues affecting school function',
  },
};

const severityLabels: Record<EmergencySeverity, string> = {
  critical: 'Critical - Immediate action required',
  high: 'High - Urgent notification',
  elevated: 'Elevated - Important notice',
};

export function EmergencyInitiator({ schoolId }: EmergencyInitiatorProps) {
  const { canInitiate } = useEmergencyAuthorization();
  const initiateEmergency = useInitiateEmergency();
  const broadcastEmergency = useBroadcastEmergency();
  
  const [step, setStep] = useState<'form' | 'confirm' | 'broadcasting'>('form');
  const [formData, setFormData] = useState({
    type: '' as EmergencyType | '',
    severity: '' as EmergencySeverity | '',
    title: '',
    description: '',
    actionRequired: '',
    safetyInstructions: '',
  });
  const [createdEmergencyId, setCreatedEmergencyId] = useState<string | null>(null);
  
  if (!canInitiate) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Shield className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-lg font-medium">Admin Access Required</p>
          <p className="text-sm text-muted-foreground">
            Only school administrators can initiate emergency notifications
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const selectedConfig = formData.type ? EMERGENCY_CONFIG[formData.type] : null;
  
  const handleSubmit = async () => {
    if (!formData.type || !formData.title || !formData.description) return;
    
    setStep('confirm');
  };
  
  const handleConfirmAndBroadcast = async () => {
    try {
      const emergency = await initiateEmergency.mutateAsync({
        type: formData.type as EmergencyType,
        severity: formData.severity as EmergencySeverity || undefined,
        title: formData.title,
        description: formData.description,
        actionRequired: formData.actionRequired || undefined,
        safetyInstructions: formData.safetyInstructions 
          ? formData.safetyInstructions.split('\n').filter(Boolean)
          : undefined,
        schoolId,
      });
      
      setCreatedEmergencyId(emergency.id);
      setStep('broadcasting');
      
      // Automatically broadcast
      await broadcastEmergency.mutateAsync({
        emergencyId: emergency.id,
        schoolId,
      });
      
    } catch (error) {
      console.error('Failed to initiate emergency:', error);
      setStep('form');
    }
  };
  
  if (step === 'broadcasting') {
    return (
      <Card className="border-primary">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <div className="animate-pulse">
            <Send className="h-12 w-12 text-primary mb-4" />
          </div>
          <p className="text-lg font-medium">Broadcasting Emergency</p>
          <p className="text-sm text-muted-foreground">
            Messages are being sent to all guardians with highest priority
          </p>
          {createdEmergencyId && (
            <p className="text-xs text-muted-foreground mt-2">
              Emergency ID: {createdEmergencyId}
            </p>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (step === 'confirm') {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirm Emergency Broadcast
          </CardTitle>
          <CardDescription>
            This will immediately send notifications to all guardians
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>This action cannot be undone.</strong> All guardians will receive 
              this message via all available channels (WhatsApp, SMS, Email).
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2 p-4 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="destructive">
                {formData.type && emergencyTypeLabels[formData.type as EmergencyType].label}
              </Badge>
              <Badge variant="outline">
                {formData.severity || selectedConfig?.defaultSeverity}
              </Badge>
            </div>
            <h4 className="font-medium">{formData.title}</h4>
            <p className="text-sm text-muted-foreground">{formData.description}</p>
            {formData.actionRequired && (
              <p className="text-sm"><strong>Action:</strong> {formData.actionRequired}</p>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setStep('form')}
            >
              Go Back
            </Button>
            <Button 
              variant="destructive" 
              className="flex-1"
              onClick={handleConfirmAndBroadcast}
              disabled={initiateEmergency.isPending || broadcastEmergency.isPending}
            >
              <Send className="h-4 w-4 mr-2" />
              Confirm & Broadcast
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Initiate Emergency Notification</CardTitle>
        <CardDescription>
          Create a high-priority emergency notification that bypasses normal queues
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Emergency notifications are sent immediately via all channels and require 
            no approval. Use only for genuine emergencies.
          </AlertDescription>
        </Alert>
        
        <div className="grid gap-4">
          {/* Emergency Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Emergency Type *</Label>
            <Select
              value={formData.type}
              onValueChange={(value) => setFormData(prev => ({ 
                ...prev, 
                type: value as EmergencyType,
                severity: '', // Reset severity when type changes
              }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select emergency type" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(emergencyTypeLabels).map(([key, { label, description }]) => (
                  <SelectItem key={key} value={key}>
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted-foreground">{description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Severity Override */}
          {selectedConfig && (
            <div className="space-y-2">
              <Label htmlFor="severity">
                Severity (default: {selectedConfig.defaultSeverity})
              </Label>
              <Select
                value={formData.severity}
                onValueChange={(value) => setFormData(prev => ({ 
                  ...prev, 
                  severity: value as EmergencySeverity 
                }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={`Using default: ${selectedConfig.defaultSeverity}`} />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(severityLabels).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Brief, clear title for the emergency"
            />
          </div>
          
          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Explain what is happening and what parents need to know"
              rows={3}
            />
          </div>
          
          {/* Action Required */}
          <div className="space-y-2">
            <Label htmlFor="actionRequired">Action Required (optional)</Label>
            <Input
              id="actionRequired"
              value={formData.actionRequired}
              onChange={(e) => setFormData(prev => ({ ...prev, actionRequired: e.target.value }))}
              placeholder="e.g., 'Please collect your child by 12:00'"
            />
          </div>
          
          {/* Safety Instructions */}
          {formData.type === 'safety_incident' && (
            <div className="space-y-2">
              <Label htmlFor="safetyInstructions">
                Safety Instructions (one per line)
              </Label>
              <Textarea
                id="safetyInstructions"
                value={formData.safetyInstructions}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  safetyInstructions: e.target.value 
                }))}
                placeholder="Stay calm and wait for further instructions&#10;Do not come to school until notified"
                rows={3}
              />
            </div>
          )}
          
          {/* Config Preview */}
          {selectedConfig && (
            <div className="p-4 bg-muted rounded-lg space-y-2 text-sm">
              <h4 className="font-medium">Delivery Configuration</h4>
              <div className="grid grid-cols-2 gap-2 text-muted-foreground">
                <span>Channels:</span>
                <span>{selectedConfig.channels.join(', ')}</span>
                <span>Max retries:</span>
                <span>{selectedConfig.maxRetryAttempts}</span>
                <span>Retry interval:</span>
                <span>{selectedConfig.retryIntervalMs / 1000}s</span>
                <span>Requires acknowledgment:</span>
                <span>{selectedConfig.requireAcknowledgment ? 'Yes' : 'No'}</span>
              </div>
            </div>
          )}
        </div>
        
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={!formData.type || !formData.title || !formData.description}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Review Emergency
        </Button>
      </CardContent>
    </Card>
  );
}
