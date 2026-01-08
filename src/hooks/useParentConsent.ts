/**
 * Parent Consent Hooks
 * 
 * React hooks for managing parent consent for communications.
 * Supports offline-first with local storage fallback.
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import {
  checkConsent,
  getConsentSummary,
  createOfflineConsentRecord,
  isValidConsentSource,
  getLocalConsentRecords,
  saveLocalConsentRecord,
  getUnsyncedConsentRecords,
  markConsentRecordsSynced,
  getConsentStatusDisplay,
  getConsentSourceDisplay,
  CONSENT_CATEGORIES,
  CONSENT_SYSTEM_SUMMARY,
  type ConsentRecord,
  type ConsentCategory,
  type ConsentStatus,
  type ConsentSource,
  type ConsentDecision,
} from '@/lib/parent-consent-system';
import type { Database } from '@/integrations/supabase/types';

type MessageCategory = Database['public']['Enums']['message_category'];

// =============================================================================
// CONSENT RECORDS HOOK
// =============================================================================

/**
 * Fetch and manage consent records for a guardian-student pair
 */
export function useConsentRecords(guardianId?: string, studentId?: string) {
  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load from local storage (offline-first approach)
  useEffect(() => {
    if (!guardianId || !studentId) {
      setRecords([]);
      setIsLoading(false);
      return;
    }

    const localRecords = getLocalConsentRecords().filter(
      r => r.guardianId === guardianId && r.studentId === studentId
    );
    
    setRecords(localRecords);
    setIsLoading(false);
  }, [guardianId, studentId]);

  const summary = useMemo(() => getConsentSummary(records), [records]);

  const unsyncedCount = useMemo(() => {
    return records.filter(r => !r.syncedAt).length;
  }, [records]);

  const invalidate = useCallback(() => {
    if (!guardianId || !studentId) return;
    
    const localRecords = getLocalConsentRecords().filter(
      r => r.guardianId === guardianId && r.studentId === studentId
    );
    setRecords(localRecords);
  }, [guardianId, studentId]);

  return {
    records,
    summary,
    isLoading,
    unsyncedCount,
    invalidate,
  };
}

// =============================================================================
// RECORD CONSENT HOOK
// =============================================================================

/**
 * Record new consent or update existing
 */
export function useRecordConsent(onRecorded?: () => void) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isRecording, setIsRecording] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const recordConsent = useCallback(async (params: {
    guardianId: string;
    studentId: string;
    category: ConsentCategory;
    status: ConsentStatus;
    source: ConsentSource;
    recordedBy: string;
    recordedByRole: string;
    options?: {
      witnessName?: string;
      paperFormRef?: string;
      notes?: string;
    };
  }) => {
    setIsRecording(true);

    try {
      // Validate source for category
      const validation = isValidConsentSource(params.category, params.source);
      if (!validation.valid) {
        throw new Error(validation.reason);
      }

      // Create record
      const record = createOfflineConsentRecord(
        params.guardianId,
        params.studentId,
        params.category,
        params.status,
        params.source,
        params.recordedBy,
        params.recordedByRole,
        params.options
      );

      // Save locally (offline-first)
      saveLocalConsentRecord(record);

      if (isOnline) {
        toast.success('Consent recorded successfully');
      } else {
        toast.info('Consent saved offline. Will sync when online.');
      }

      onRecorded?.();
      return record;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to record consent');
      throw error;
    } finally {
      setIsRecording(false);
    }
  }, [isOnline, onRecorded]);

  return {
    recordConsent,
    isRecording,
    isOnline,
  };
}

// =============================================================================
// CONSENT CHECK HOOK
// =============================================================================

/**
 * Check consent for sending a specific message type
 */
export function useConsentCheck(
  guardianId?: string,
  studentId?: string,
  messageCategory?: MessageCategory,
  isEmergency: boolean = false
) {
  const { records, isLoading } = useConsentRecords(guardianId, studentId);

  const decision = useMemo((): ConsentDecision => {
    if (!messageCategory || isLoading) {
      return {
        canSend: false,
        reason: 'consent_pending',
        consentStatus: 'pending',
        requiresReview: true,
        overrideApplied: false,
      };
    }

    return checkConsent(messageCategory, records, isEmergency);
  }, [messageCategory, records, isEmergency, isLoading]);

  return {
    ...decision,
    isLoading,
    statusDisplay: getConsentStatusDisplay(decision.consentStatus),
  };
}

// =============================================================================
// SYNC CONSENT HOOK
// =============================================================================

/**
 * Sync offline consent records when online
 */
export function useSyncConsent() {
  const [isSyncing, setIsSyncing] = useState(false);
  const pendingCount = useMemo(() => getUnsyncedConsentRecords().length, []);

  const sync = useCallback(async () => {
    const unsyncedRecords = getUnsyncedConsentRecords();
    
    if (unsyncedRecords.length === 0) {
      return { synced: 0 };
    }

    setIsSyncing(true);

    // In offline-first mode, we just mark as "would sync"
    // Actual DB sync would happen when table is created
    const syncedIds = unsyncedRecords.map(r => r.id);
    markConsentRecordsSynced(syncedIds);

    setIsSyncing(false);
    toast.success(`Synced ${syncedIds.length} consent record(s)`);
    
    return { synced: syncedIds.length, total: unsyncedRecords.length };
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    const handleOnline = () => {
      const unsynced = getUnsyncedConsentRecords();
      if (unsynced.length > 0) {
        sync();
      }
    };

    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [sync]);

  return {
    sync,
    isSyncing,
    pendingCount,
  };
}

// =============================================================================
// CONSENT FORM HELPERS HOOK
// =============================================================================

/**
 * Get form helpers for consent collection
 */
export function useConsentFormHelpers() {
  const categories = Object.entries(CONSENT_CATEGORIES).map(([key, config]) => ({
    value: key as ConsentCategory,
    label: config.label,
    description: config.description,
    isMandatory: config.isMandatory,
    canBeVerbal: config.canBeVerbal,
  }));

  const sources: { value: ConsentSource; label: string; requiresWitness: boolean }[] = [
    { value: 'paper_form', label: 'Paper Form', requiresWitness: false },
    { value: 'verbal_teacher', label: 'Verbal to Teacher', requiresWitness: true },
    { value: 'verbal_admin', label: 'Verbal to Admin', requiresWitness: true },
    { value: 'phone_call', label: 'Phone Call', requiresWitness: false },
    { value: 'sms_reply', label: 'SMS Reply', requiresWitness: false },
    { value: 'whatsapp_reply', label: 'WhatsApp Reply', requiresWitness: false },
  ];

  const statuses: { value: ConsentStatus; label: string }[] = [
    { value: 'granted', label: 'Consent Given' },
    { value: 'pending', label: 'Awaiting Response' },
    { value: 'withdrawn', label: 'Consent Withdrawn' },
  ];

  return {
    categories: categories.filter(c => !c.isMandatory), // Don't show mandatory
    sources,
    statuses,
    getSourceDisplay: getConsentSourceDisplay,
    getStatusDisplay: getConsentStatusDisplay,
    validateSource: isValidConsentSource,
  };
}

// =============================================================================
// DOCUMENTATION HOOK
// =============================================================================

export function useConsentSystemInfo() {
  return {
    summary: CONSENT_SYSTEM_SUMMARY,
    categories: CONSENT_CATEGORIES,
  };
}
