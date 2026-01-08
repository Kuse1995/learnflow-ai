/**
 * Delivery State Machine
 * 
 * Handles offline-resilient message delivery with:
 * - Exponential backoff retry logic
 * - Channel fallback (WhatsApp → SMS → Email)
 * - Local queue for offline teachers
 * - Delivery confirmation tracking
 */

import type { Database } from "@/integrations/supabase/types";

type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];

// ============================================================================
// DELIVERY STATES
// ============================================================================

export type DeliveryState =
  | "idle"           // Message created, not yet queued
  | "queued"         // In queue, waiting for processing
  | "processing"     // Currently being delivered
  | "awaiting_retry" // Failed, waiting for retry
  | "sent"           // Sent to provider, awaiting confirmation
  | "delivered"      // Confirmed delivered to recipient
  | "exhausted"      // All channels/retries exhausted
  | "offline_queued"; // Queued locally while offline

export interface DeliveryTransition {
  from: DeliveryState;
  to: DeliveryState;
  event: DeliveryEvent;
  condition?: string;
}

export type DeliveryEvent =
  | "queue"
  | "start_processing"
  | "send_success"
  | "send_failure"
  | "retry_scheduled"
  | "max_retries_exceeded"
  | "delivery_confirmed"
  | "network_offline"
  | "network_online"
  | "all_channels_failed";

// State machine transitions
export const DELIVERY_TRANSITIONS: DeliveryTransition[] = [
  // Normal flow
  { from: "idle", to: "queued", event: "queue" },
  { from: "queued", to: "processing", event: "start_processing" },
  { from: "processing", to: "sent", event: "send_success" },
  { from: "processing", to: "awaiting_retry", event: "send_failure", condition: "retries_remaining" },
  { from: "processing", to: "exhausted", event: "all_channels_failed" },
  { from: "awaiting_retry", to: "queued", event: "retry_scheduled" },
  { from: "sent", to: "delivered", event: "delivery_confirmed" },
  
  // Offline handling
  { from: "idle", to: "offline_queued", event: "network_offline" },
  { from: "queued", to: "offline_queued", event: "network_offline" },
  { from: "offline_queued", to: "queued", event: "network_online" },
  
  // Exhaustion
  { from: "awaiting_retry", to: "exhausted", event: "max_retries_exceeded" },
];

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export interface RetryConfig {
  maxRetriesPerChannel: number;
  maxTotalRetries: number;
  baseDelaySeconds: number;
  maxDelaySeconds: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetriesPerChannel: 2,  // 2 attempts per channel
  maxTotalRetries: 5,       // 5 total attempts across all channels
  baseDelaySeconds: 60,     // Start with 1 minute
  maxDelaySeconds: 3600,    // Cap at 1 hour
  backoffMultiplier: 2,     // Double each time
};

// Priority-based retry configs
export const RETRY_CONFIGS: Record<string, RetryConfig> = {
  emergency: {
    maxRetriesPerChannel: 3,
    maxTotalRetries: 8,
    baseDelaySeconds: 30,
    maxDelaySeconds: 1800, // 30 minutes max
    backoffMultiplier: 1.5,
  },
  high: {
    maxRetriesPerChannel: 2,
    maxTotalRetries: 6,
    baseDelaySeconds: 45,
    maxDelaySeconds: 2700,
    backoffMultiplier: 2,
  },
  normal: DEFAULT_RETRY_CONFIG,
  low: {
    maxRetriesPerChannel: 1,
    maxTotalRetries: 3,
    baseDelaySeconds: 120,
    maxDelaySeconds: 7200,
    backoffMultiplier: 2.5,
  },
};

// ============================================================================
// CHANNEL FALLBACK LOGIC
// ============================================================================

export interface ChannelStatus {
  channel: DeliveryChannel;
  available: boolean;
  attempts: number;
  lastAttemptAt: string | null;
  lastError: string | null;
  exhausted: boolean;
}

export interface ChannelFallbackResult {
  nextChannel: DeliveryChannel | null;
  allExhausted: boolean;
  channelStatuses: ChannelStatus[];
}

// Channel priority order
export const CHANNEL_PRIORITY: DeliveryChannel[] = ["whatsapp", "sms", "email"];

export function getChannelFallback(
  availableChannels: { whatsapp?: string; sms?: string; email?: string },
  attempts: {
    whatsapp_attempted?: boolean;
    whatsapp_failed_at?: string | null;
    sms_attempted?: boolean;
    sms_failed_at?: string | null;
    email_attempted?: boolean;
    email_failed_at?: string | null;
  },
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): ChannelFallbackResult {
  const channelStatuses: ChannelStatus[] = CHANNEL_PRIORITY.map(channel => {
    const hasContact = channel === "whatsapp" 
      ? !!availableChannels.whatsapp 
      : channel === "sms" 
        ? !!availableChannels.sms 
        : !!availableChannels.email;

    const attempted = channel === "whatsapp"
      ? attempts.whatsapp_attempted
      : channel === "sms"
        ? attempts.sms_attempted
        : attempts.email_attempted;

    const failedAt = channel === "whatsapp"
      ? attempts.whatsapp_failed_at
      : channel === "sms"
        ? attempts.sms_failed_at
        : attempts.email_failed_at;

    // Count attempts (simplified - in real implementation, query delivery_attempts)
    const attemptCount = attempted && failedAt ? 1 : 0;

    return {
      channel,
      available: hasContact,
      attempts: attemptCount,
      lastAttemptAt: failedAt || null,
      lastError: null,
      exhausted: attemptCount >= config.maxRetriesPerChannel,
    };
  });

  // Find next available channel
  const nextChannel = channelStatuses.find(
    cs => cs.available && !cs.exhausted
  )?.channel ?? null;

  const allExhausted = channelStatuses
    .filter(cs => cs.available)
    .every(cs => cs.exhausted);

  return { nextChannel, allExhausted, channelStatuses };
}

// ============================================================================
// BACKOFF CALCULATION
// ============================================================================

export function calculateBackoff(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = config.baseDelaySeconds * Math.pow(config.backoffMultiplier, retryCount);
  return Math.min(delay, config.maxDelaySeconds);
}

export function getNextRetryTime(
  retryCount: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Date {
  const delaySeconds = calculateBackoff(retryCount, config);
  return new Date(Date.now() + delaySeconds * 1000);
}

// ============================================================================
// LOCAL OFFLINE QUEUE
// ============================================================================

const OFFLINE_QUEUE_KEY = "stitch_offline_message_queue";

export interface OfflineQueueItem {
  id: string;
  messageId?: string;
  payload: {
    studentId: string;
    parentContactId: string;
    category: string;
    messageBody: string;
    subject?: string;
  };
  targetChannel?: DeliveryChannel;
  priority: number;
  createdAt: string;
  schoolId: string;
  deviceId?: string;
}

export function getOfflineQueue(): OfflineQueueItem[] {
  try {
    const stored = localStorage.getItem(OFFLINE_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function addToOfflineQueue(item: Omit<OfflineQueueItem, "id" | "createdAt">): OfflineQueueItem {
  const queue = getOfflineQueue();
  const newItem: OfflineQueueItem = {
    ...item,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  queue.push(newItem);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
  return newItem;
}

export function removeFromOfflineQueue(id: string): void {
  const queue = getOfflineQueue().filter(item => item.id !== id);
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
}

export function clearOfflineQueue(): void {
  localStorage.removeItem(OFFLINE_QUEUE_KEY);
}

export function getOfflineQueueCount(): number {
  return getOfflineQueue().length;
}

// ============================================================================
// NETWORK STATUS DETECTION
// ============================================================================

export function isOnline(): boolean {
  return navigator.onLine;
}

export function subscribeToNetworkStatus(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);
  
  return () => {
    window.removeEventListener("online", onOnline);
    window.removeEventListener("offline", onOffline);
  };
}

// ============================================================================
// DELIVERY STATUS HELPERS
// ============================================================================

export function mapDbStatusToState(status: DeliveryStatus): DeliveryState {
  switch (status) {
    case "pending": return "idle";
    case "queued": return "queued";
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "failed":
    case "no_channel": return "exhausted";
    default: return "idle";
  }
}

export function mapStateToDbStatus(state: DeliveryState): DeliveryStatus {
  switch (state) {
    case "idle": return "pending";
    case "queued":
    case "processing":
    case "awaiting_retry":
    case "offline_queued": return "queued";
    case "sent": return "sent";
    case "delivered": return "delivered";
    case "exhausted": return "failed";
    default: return "pending";
  }
}

// ============================================================================
// DELIVERY LIFECYCLE DOCUMENTATION
// ============================================================================

export const DELIVERY_LIFECYCLE = {
  stages: [
    {
      state: "idle",
      description: "Message created but not yet submitted for delivery",
      transitions: ["queued (on queue)", "offline_queued (if offline)"],
    },
    {
      state: "queued",
      description: "Message is in the delivery queue, waiting for processing",
      transitions: ["processing (when picked up)", "offline_queued (if network lost)"],
    },
    {
      state: "processing",
      description: "Delivery attempt in progress",
      transitions: ["sent (success)", "awaiting_retry (on failure)", "exhausted (all failed)"],
    },
    {
      state: "awaiting_retry",
      description: "Failed but retry scheduled with backoff",
      transitions: ["queued (when retry time reached)", "exhausted (max retries)"],
    },
    {
      state: "sent",
      description: "Successfully sent to provider, awaiting confirmation",
      transitions: ["delivered (on confirmation)"],
    },
    {
      state: "delivered",
      description: "Final state - message confirmed delivered",
      transitions: [],
    },
    {
      state: "exhausted",
      description: "All delivery attempts failed",
      transitions: ["queued (manual resend by admin)"],
    },
    {
      state: "offline_queued",
      description: "Stored locally while teacher is offline",
      transitions: ["queued (when network restored)"],
    },
  ],
  retryBehavior: {
    strategy: "Exponential backoff with channel fallback",
    maxRetriesPerChannel: 2,
    maxTotalRetries: 5,
    backoffFormula: "delay = base * (multiplier ^ retryCount)",
    channelOrder: ["WhatsApp", "SMS", "Email"],
  },
  offlineHandling: {
    teacherOffline: "Messages queued locally, synced when online",
    parentOffline: "System retries automatically with backoff",
    maxOfflineQueueSize: 100,
  },
} as const;
