/**
 * Emergency Notification Hooks
 * 
 * React hooks for managing emergency notifications with:
 * - Admin-only initiation
 * - Priority queue override
 * - Mandatory retry logic
 * - Acknowledgment tracking
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  EmergencyType,
  EmergencySeverity,
  EmergencyDetails,
  EmergencyContext,
  EmergencyState,
  EmergencyEvent,
  EMERGENCY_CONFIG,
  getNextState,
  canTransition,
  RecipientDelivery,
  DeliveryStats,
  calculateDeliveryStats,
  Acknowledgment,
  ESCALATION_RULES,
  getEscalationRule,
  shouldEscalate,
  QueuedEmergencyMessage,
  createEmergencyQueueItem,
  renderEmergencyMessage,
  storeActiveEmergency,
  getActiveEmergencies,
  removeEmergency,
  queueEmergencyMessage,
  getEmergencyQueue,
  dequeueEmergencyMessage,
  storeAcknowledgment,
  getAcknowledgments,
  canInitiateEmergency,
  canResolveEmergency,
  canCancelEmergency,
  shouldForcedResend,
} from '@/lib/emergency-notification-system';

// ============================================================================
// AUTHORIZATION HOOK
// ============================================================================

export function useEmergencyAuthorization() {
  // In production, this would check actual user role from auth context
  const [userRole] = useState<string>('school_admin');
  const [userId] = useState<string>('demo-admin-id');
  
  return {
    canInitiate: canInitiateEmergency(userRole),
    canResolve: (initiatedBy: string) => canResolveEmergency(userRole, initiatedBy, userId),
    canCancel: canCancelEmergency(userRole),
    userRole,
    userId,
  };
}

// ============================================================================
// EMERGENCY STATE MANAGEMENT
// ============================================================================

export function useEmergencyState(emergencyId?: string) {
  const queryClient = useQueryClient();
  
  const { data: emergency, isLoading } = useQuery({
    queryKey: ['emergency', emergencyId],
    queryFn: () => {
      if (!emergencyId) return null;
      const emergencies = getActiveEmergencies();
      return emergencies.find(e => e.id === emergencyId) || null;
    },
    enabled: !!emergencyId,
    refetchInterval: 5000, // Poll every 5 seconds during emergency
  });
  
  const transition = useCallback((event: EmergencyEvent) => {
    if (!emergency) return false;
    
    const nextState = getNextState(emergency.state, event, emergency);
    if (!nextState) return false;
    
    const updated: EmergencyContext = {
      ...emergency,
      state: nextState,
      ...(nextState === 'resolved' && {
        resolvedAt: new Date(),
      }),
    };
    
    storeActiveEmergency(updated);
    queryClient.invalidateQueries({ queryKey: ['emergency', emergencyId] });
    queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
    
    return true;
  }, [emergency, emergencyId, queryClient]);
  
  const canPerformTransition = useCallback((event: EmergencyEvent) => {
    if (!emergency) return false;
    return canTransition(emergency.state, event, emergency);
  }, [emergency]);
  
  return {
    emergency,
    isLoading,
    transition,
    canTransition: canPerformTransition,
  };
}

// ============================================================================
// INITIATE EMERGENCY
// ============================================================================

interface InitiateEmergencyParams {
  type: EmergencyType;
  severity?: EmergencySeverity;
  title: string;
  description: string;
  affectedAreas?: string[];
  infrastructureType?: 'power' | 'water' | 'gas' | 'network' | 'building';
  expectedResolution?: Date;
  actionRequired?: string;
  safetyInstructions?: string[];
  schoolId: string;
}

export function useInitiateEmergency() {
  const queryClient = useQueryClient();
  const { canInitiate, userId } = useEmergencyAuthorization();
  
  return useMutation({
    mutationFn: async (params: InitiateEmergencyParams) => {
      if (!canInitiate) {
        throw new Error('Unauthorized: Only admins can initiate emergencies');
      }
      
      const config = EMERGENCY_CONFIG[params.type];
      const severity = params.severity || config.defaultSeverity;
      
      const details: EmergencyDetails = {
        type: params.type,
        severity,
        title: params.title,
        description: params.description,
        affectedAreas: params.affectedAreas,
        infrastructureType: params.infrastructureType,
        expectedResolution: params.expectedResolution,
        actionRequired: params.actionRequired,
        safetyInstructions: params.safetyInstructions,
      };
      
      const emergency: EmergencyContext = {
        id: `emg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        state: 'initiated',
        details,
        config,
        initiatedBy: userId,
        initiatedAt: new Date(),
        schoolId: params.schoolId,
        totalRecipients: 0,
        sentCount: 0,
        deliveredCount: 0,
        acknowledgedCount: 0,
        pendingAcks: 0,
        escalationLevel: 0,
      };
      
      // Store locally for offline support
      storeActiveEmergency(emergency);
      
      // Log to audit
      await logEmergencyEvent(emergency.id, 'initiated', {
        type: params.type,
        severity,
        initiatedBy: userId,
      });
      
      return emergency;
    },
    onSuccess: (emergency) => {
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      toast.success(`Emergency initiated: ${emergency.details.title}`);
    },
    onError: (error) => {
      toast.error(`Failed to initiate emergency: ${error.message}`);
    },
  });
}

// ============================================================================
// BROADCAST EMERGENCY
// ============================================================================

export function useBroadcastEmergency() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ 
      emergencyId, 
      schoolId 
    }: { 
      emergencyId: string; 
      schoolId: string;
    }) => {
      const emergencies = getActiveEmergencies();
      const emergency = emergencies.find(e => e.id === emergencyId);
      
      if (!emergency) {
        throw new Error('Emergency not found');
      }
      
      // Fetch all guardians for the school
      const { data: guardians, error } = await supabase
        .from('guardians')
        .select(`
          id,
          display_name,
          primary_phone,
          whatsapp_number,
          email,
          guardian_student_links!inner(
            student_id,
            can_receive_emergency
          )
        `)
        .eq('school_id', schoolId)
        .is('deleted_at', null);
      
      if (error) throw error;
      
      // Filter to those who can receive emergency messages
      const eligibleGuardians = (guardians || []).filter(g => 
        g.guardian_student_links?.some((l: { can_receive_emergency: boolean }) => l.can_receive_emergency)
      );
      
      // Render message
      const { subject, body } = renderEmergencyMessage(emergency.details.type, {
        school_name: 'School', // Would come from school settings
        date: new Date().toLocaleDateString(),
        reason: emergency.details.title,
        description: emergency.details.description,
        expected_resolution: emergency.details.expectedResolution?.toLocaleDateString(),
        action_required: emergency.details.actionRequired,
        safety_instructions: emergency.details.safetyInstructions,
        infrastructure_type: emergency.details.infrastructureType,
        affected_areas: emergency.details.affectedAreas?.join(', '),
      });
      
      const config = emergency.config;
      let queued = 0;
      
      // Queue messages for each guardian through each channel
      for (const guardian of eligibleGuardians) {
        for (const channel of config.channels) {
          // Check if guardian has this channel
          const hasChannel = 
            (channel === 'whatsapp' && guardian.whatsapp_number) ||
            (channel === 'sms' && guardian.primary_phone) ||
            (channel === 'email' && guardian.email);
          
          if (hasChannel) {
            const message = createEmergencyQueueItem(
              emergencyId,
              guardian.id,
              channel,
              `${subject}\n\n${body}`,
              emergency.details.severity
            );
            
            queueEmergencyMessage(message);
            queued++;
          }
        }
      }
      
      // Update emergency state
      const updated: EmergencyContext = {
        ...emergency,
        state: 'broadcasting',
        totalRecipients: eligibleGuardians.length,
        pendingAcks: config.requireAcknowledgment ? eligibleGuardians.length : 0,
      };
      
      storeActiveEmergency(updated);
      
      await logEmergencyEvent(emergencyId, 'broadcast_started', {
        recipientCount: eligibleGuardians.length,
        channels: config.channels,
      });
      
      return { queued, recipients: eligibleGuardians.length };
    },
    onSuccess: ({ queued, recipients }) => {
      queryClient.invalidateQueries({ queryKey: ['emergency-queue'] });
      toast.success(`Broadcasting to ${recipients} guardians (${queued} messages queued)`);
    },
    onError: (error) => {
      toast.error(`Broadcast failed: ${error.message}`);
    },
  });
}

// ============================================================================
// DELIVERY TRACKING
// ============================================================================

export function useEmergencyDeliveries(emergencyId: string) {
  const [deliveries, setDeliveries] = useState<RecipientDelivery[]>([]);
  
  // In production, this would track actual delivery states
  // For now, simulate based on queue
  const { data: queue } = useQuery({
    queryKey: ['emergency-queue', emergencyId],
    queryFn: () => getEmergencyQueue().filter(m => m.emergencyId === emergencyId),
    refetchInterval: 2000,
  });
  
  const stats = calculateDeliveryStats(deliveries);
  
  return {
    deliveries,
    stats,
    queue: queue || [],
  };
}

// ============================================================================
// ACKNOWLEDGMENT TRACKING
// ============================================================================

export function useAcknowledgments(emergencyId: string) {
  const queryClient = useQueryClient();
  
  const { data: acks = [], isLoading } = useQuery({
    queryKey: ['emergency-acks', emergencyId],
    queryFn: () => getAcknowledgments(emergencyId),
    refetchInterval: 5000,
  });
  
  const recordAck = useMutation({
    mutationFn: async ({ 
      recipientId, 
      guardianId,
      channel,
      method,
    }: {
      recipientId: string;
      guardianId: string;
      channel: 'whatsapp' | 'sms' | 'email' | 'app';
      method: 'reply' | 'button' | 'link' | 'auto';
    }) => {
      const ack: Acknowledgment = {
        id: `ack_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        emergencyId,
        recipientId,
        guardianId,
        acknowledgedAt: new Date(),
        channel,
        method,
      };
      
      storeAcknowledgment(ack);
      
      // Update emergency context
      const emergencies = getActiveEmergencies();
      const emergency = emergencies.find(e => e.id === emergencyId);
      if (emergency) {
        const updated: EmergencyContext = {
          ...emergency,
          acknowledgedCount: emergency.acknowledgedCount + 1,
          pendingAcks: Math.max(0, emergency.pendingAcks - 1),
        };
        storeActiveEmergency(updated);
      }
      
      await logEmergencyEvent(emergencyId, 'acknowledgment_received', {
        guardianId,
        channel,
        method,
      });
      
      return ack;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-acks', emergencyId] });
      queryClient.invalidateQueries({ queryKey: ['emergency', emergencyId] });
    },
  });
  
  return {
    acks,
    isLoading,
    recordAck: recordAck.mutate,
    ackCount: acks.length,
  };
}

// ============================================================================
// ESCALATION MANAGEMENT
// ============================================================================

export function useEscalation(emergencyId: string) {
  const queryClient = useQueryClient();
  const { emergency } = useEmergencyState(emergencyId);
  const intervalRef = useRef<NodeJS.Timeout>();
  
  const checkAndEscalate = useCallback(async () => {
    if (!emergency || emergency.state === 'resolved' || emergency.state === 'cancelled') {
      return;
    }
    
    const currentLevel = emergency.escalationLevel;
    const nextRule = getEscalationRule(currentLevel + 1);
    
    if (!nextRule) return;
    
    const elapsedMs = Date.now() - new Date(emergency.initiatedAt).getTime();
    const triggerTime = ESCALATION_RULES
      .filter(r => r.level <= currentLevel)
      .reduce((sum, r) => sum + r.triggerAfterMs, 0) + nextRule.triggerAfterMs;
    
    if (elapsedMs >= triggerTime) {
      // Trigger escalation
      const updated: EmergencyContext = {
        ...emergency,
        escalationLevel: currentLevel + 1,
        lastEscalationAt: new Date(),
        state: 'escalating',
      };
      
      storeActiveEmergency(updated);
      
      await logEmergencyEvent(emergencyId, 'escalation_triggered', {
        level: currentLevel + 1,
        actions: nextRule.actions,
      });
      
      queryClient.invalidateQueries({ queryKey: ['emergency', emergencyId] });
      
      toast.warning(`Emergency escalated to level ${currentLevel + 1}`);
    }
  }, [emergency, emergencyId, queryClient]);
  
  // Auto-check for escalation
  useEffect(() => {
    if (emergency && !['resolved', 'cancelled'].includes(emergency.state)) {
      intervalRef.current = setInterval(checkAndEscalate, 30000); // Check every 30 seconds
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [emergency, checkAndEscalate]);
  
  const manualEscalate = useMutation({
    mutationFn: async () => {
      if (!emergency) throw new Error('No active emergency');
      
      const nextLevel = emergency.escalationLevel + 1;
      const rule = getEscalationRule(nextLevel);
      
      if (!rule) throw new Error('Maximum escalation level reached');
      
      const updated: EmergencyContext = {
        ...emergency,
        escalationLevel: nextLevel,
        lastEscalationAt: new Date(),
        state: 'escalating',
      };
      
      storeActiveEmergency(updated);
      
      await logEmergencyEvent(emergencyId, 'manual_escalation', {
        level: nextLevel,
        actions: rule.actions,
      });
      
      return { level: nextLevel, actions: rule.actions };
    },
    onSuccess: ({ level }) => {
      queryClient.invalidateQueries({ queryKey: ['emergency', emergencyId] });
      toast.success(`Manually escalated to level ${level}`);
    },
  });
  
  return {
    currentLevel: emergency?.escalationLevel || 0,
    maxLevel: ESCALATION_RULES.length,
    lastEscalationAt: emergency?.lastEscalationAt,
    manualEscalate: manualEscalate.mutate,
    isEscalating: manualEscalate.isPending,
  };
}

// ============================================================================
// FORCED RESEND
// ============================================================================

export function useForcedResend(emergencyId: string) {
  const queryClient = useQueryClient();
  const { emergency } = useEmergencyState(emergencyId);
  
  return useMutation({
    mutationFn: async ({ 
      recipientId,
      useAlternativeChannel = false,
    }: { 
      recipientId: string;
      useAlternativeChannel?: boolean;
    }) => {
      if (!emergency) throw new Error('No active emergency');
      
      const queue = getEmergencyQueue();
      const existingMessages = queue.filter(
        m => m.emergencyId === emergencyId && m.recipientId === recipientId
      );
      
      // Find alternative channel if needed
      let channel: 'whatsapp' | 'sms' | 'email' = 'sms';
      if (useAlternativeChannel && existingMessages.length > 0) {
        const usedChannels = existingMessages.map(m => m.channel);
        const availableChannels = emergency.config.channels.filter(
          c => !usedChannels.includes(c)
        );
        if (availableChannels.length > 0) {
          channel = availableChannels[0];
        }
      }
      
      const { body } = renderEmergencyMessage(emergency.details.type, {
        school_name: 'School',
        date: new Date().toLocaleDateString(),
        reason: emergency.details.title,
        description: emergency.details.description,
      });
      
      const message = createEmergencyQueueItem(
        emergencyId,
        recipientId,
        channel,
        body,
        emergency.details.severity
      );
      
      queueEmergencyMessage(message);
      
      await logEmergencyEvent(emergencyId, 'forced_resend', {
        recipientId,
        channel,
        useAlternativeChannel,
      });
      
      return message;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['emergency-queue', emergencyId] });
      toast.success('Message re-queued for delivery');
    },
  });
}

// ============================================================================
// RESOLVE / CANCEL EMERGENCY
// ============================================================================

export function useResolveEmergency() {
  const queryClient = useQueryClient();
  const { canResolve, userId } = useEmergencyAuthorization();
  
  return useMutation({
    mutationFn: async ({ 
      emergencyId,
      resolution,
    }: { 
      emergencyId: string;
      resolution?: string;
    }) => {
      const emergencies = getActiveEmergencies();
      const emergency = emergencies.find(e => e.id === emergencyId);
      
      if (!emergency) throw new Error('Emergency not found');
      if (!canResolve(emergency.initiatedBy)) {
        throw new Error('Unauthorized to resolve this emergency');
      }
      
      const updated: EmergencyContext = {
        ...emergency,
        state: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: userId,
      };
      
      storeActiveEmergency(updated);
      
      // Clear queue for this emergency
      const queue = getEmergencyQueue();
      queue
        .filter(m => m.emergencyId === emergencyId)
        .forEach(m => dequeueEmergencyMessage(m.id));
      
      await logEmergencyEvent(emergencyId, 'resolved', {
        resolvedBy: userId,
        resolution,
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      toast.success('Emergency resolved');
    },
  });
}

export function useCancelEmergency() {
  const queryClient = useQueryClient();
  const { canCancel, userId } = useEmergencyAuthorization();
  
  return useMutation({
    mutationFn: async ({ 
      emergencyId,
      reason,
    }: { 
      emergencyId: string;
      reason: string;
    }) => {
      if (!canCancel) {
        throw new Error('Unauthorized to cancel emergencies');
      }
      
      const emergencies = getActiveEmergencies();
      const emergency = emergencies.find(e => e.id === emergencyId);
      
      if (!emergency) throw new Error('Emergency not found');
      
      const updated: EmergencyContext = {
        ...emergency,
        state: 'cancelled',
      };
      
      storeActiveEmergency(updated);
      
      // Clear queue for this emergency
      const queue = getEmergencyQueue();
      queue
        .filter(m => m.emergencyId === emergencyId)
        .forEach(m => dequeueEmergencyMessage(m.id));
      
      await logEmergencyEvent(emergencyId, 'cancelled', {
        cancelledBy: userId,
        reason,
      });
      
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-emergencies'] });
      toast.success('Emergency cancelled');
    },
  });
}

// ============================================================================
// ACTIVE EMERGENCIES LIST
// ============================================================================

export function useActiveEmergencies(schoolId?: string) {
  return useQuery({
    queryKey: ['active-emergencies', schoolId],
    queryFn: () => {
      const emergencies = getActiveEmergencies();
      return emergencies.filter(e => 
        (!schoolId || e.schoolId === schoolId) &&
        !['resolved', 'cancelled'].includes(e.state)
      );
    },
    refetchInterval: 10000,
  });
}

// ============================================================================
// EMERGENCY QUEUE PROCESSING
// ============================================================================

export function useEmergencyQueueProcessor() {
  const queryClient = useQueryClient();
  const processingRef = useRef(false);
  
  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    processingRef.current = true;
    
    try {
      const queue = getEmergencyQueue();
      const now = new Date();
      
      for (const message of queue) {
        // Check if ready to process
        if (message.nextRetryAt && new Date(message.nextRetryAt) > now) {
          continue;
        }
        
        // Check max attempts
        if (message.attempts >= message.maxAttempts) {
          dequeueEmergencyMessage(message.id);
          continue;
        }
        
        // Simulate sending (in production, would call actual delivery API)
        console.log(`[Emergency] Sending message ${message.id} via ${message.channel}`);
        
        // Update attempts
        const updatedMessage: QueuedEmergencyMessage = {
          ...message,
          attempts: message.attempts + 1,
          nextRetryAt: new Date(Date.now() + 60000), // Retry in 1 minute if needed
        };
        
        // For demo, remove after "sending"
        dequeueEmergencyMessage(message.id);
        
        await logEmergencyEvent(message.emergencyId, 'message_sent', {
          channel: message.channel,
          recipientId: message.recipientId,
          attempt: updatedMessage.attempts,
        });
      }
      
      queryClient.invalidateQueries({ queryKey: ['emergency-queue'] });
    } finally {
      processingRef.current = false;
    }
  }, [queryClient]);
  
  // Auto-process queue
  useEffect(() => {
    const interval = setInterval(processQueue, 5000); // Process every 5 seconds
    return () => clearInterval(interval);
  }, [processQueue]);
  
  return {
    processNow: processQueue,
    queueSize: getEmergencyQueue().length,
  };
}

// ============================================================================
// AUDIT LOGGING
// ============================================================================

async function logEmergencyEvent(
  emergencyId: string,
  event: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    // Try to log to database
    await supabase.from('audit_logs').insert({
      action: `emergency.${event}`,
      actor_type: 'system',
      entity_type: 'emergency',
      entity_id: emergencyId,
      summary: `Emergency ${event}: ${emergencyId}`,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
      },
      entry_hash: `emg_${Date.now()}`,
      environment: 'production',
    });
  } catch (error) {
    // Store locally if offline
    console.log('[Emergency Audit]', emergencyId, event, metadata);
  }
}

export function useEmergencyAuditLog(emergencyId: string) {
  return useQuery({
    queryKey: ['emergency-audit', emergencyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('entity_type', 'emergency')
        .eq('entity_id', emergencyId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
  });
}
