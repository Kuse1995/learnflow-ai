/**
 * Parent Message Inbox
 * 
 * Design principles:
 * - Read-only, no interactions beyond reading
 * - Text-first, minimal visual complexity
 * - Extremely lightweight for low-end phones
 * - Fully accessible (WCAG 2.1 AA)
 * 
 * Explicitly excluded:
 * - Reply functionality
 * - Reactions/emojis
 * - Attachments
 * - Message threads
 */

import { format } from "date-fns";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// ============================================================================
// TYPES
// ============================================================================

export interface ParentMessage {
  id: string;
  title: string;
  body: string;
  sentAt: string;
  senderName: string;
  senderType: "teacher" | "school";
  category: string;
  isRead?: boolean;
}

interface ParentMessageInboxProps {
  messages: ParentMessage[];
  isLoading?: boolean;
  studentName?: string;
}

// ============================================================================
// CATEGORY LABELS (Simple, translatable)
// ============================================================================

const CATEGORY_LABELS: Record<string, string> = {
  learning_update: "Learning Update",
  attendance_notice: "Attendance",
  school_announcement: "Announcement",
  support_tip: "Support Tip",
  administrative_notice: "Notice",
  emergency_notice: "Important",
  fee_status: "Fee Update",
};

// ============================================================================
// MESSAGE CARD COMPONENT
// ============================================================================

function MessageCard({ message }: { message: ParentMessage }) {
  const formattedDate = format(new Date(message.sentAt), "d MMM yyyy");
  const formattedTime = format(new Date(message.sentAt), "h:mm a");
  const categoryLabel = CATEGORY_LABELS[message.category] || "Message";
  
  return (
    <article
      className="border-b border-border last:border-b-0 py-4 px-3"
      role="article"
      aria-label={`Message from ${message.senderName}: ${message.title}`}
    >
      {/* Header: Category + Date */}
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
        <span className="font-medium">{categoryLabel}</span>
        <time dateTime={message.sentAt}>
          {formattedDate}
        </time>
      </div>

      {/* Title */}
      <h3 className="text-base font-semibold text-foreground mb-1 leading-tight">
        {message.title}
      </h3>

      {/* Sender */}
      <p className="text-sm text-muted-foreground mb-3">
        From: {message.senderName}
        {message.senderType === "school" && " (School)"}
      </p>

      {/* Message Body */}
      <div 
        className="text-sm text-foreground leading-relaxed whitespace-pre-wrap"
        // Prevent any JS injection by only rendering plain text
      >
        {message.body}
      </div>

      {/* Time sent (for screen readers) */}
      <p className="sr-only">Sent at {formattedTime}</p>
    </article>
  );
}

// ============================================================================
// LOADING SKELETON
// ============================================================================

function MessageSkeleton() {
  return (
    <div className="py-4 px-3 border-b border-border">
      <div className="flex justify-between mb-2">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-3 w-16" />
      </div>
      <Skeleton className="h-5 w-3/4 mb-1" />
      <Skeleton className="h-4 w-1/2 mb-3" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

// ============================================================================
// EMPTY STATE
// ============================================================================

function EmptyInbox() {
  return (
    <div 
      className="py-12 px-4 text-center"
      role="status"
      aria-label="No messages"
    >
      <p className="text-muted-foreground text-sm">
        No messages yet.
      </p>
      <p className="text-muted-foreground text-xs mt-1">
        Messages from your child's teachers will appear here.
      </p>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ParentMessageInbox({ 
  messages, 
  isLoading,
  studentName 
}: ParentMessageInboxProps) {
  return (
    <section 
      className="w-full max-w-lg mx-auto"
      aria-label={studentName ? `Messages about ${studentName}` : "Messages"}
    >
      {/* Header */}
      <header className="px-3 py-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          Messages
        </h2>
        {studentName && (
          <p className="text-sm text-muted-foreground">
            Updates about {studentName}
          </p>
        )}
      </header>

      {/* Message List */}
      <Card className="rounded-none border-x-0 shadow-none bg-background">
        {isLoading ? (
          // Loading state
          <div role="status" aria-label="Loading messages">
            <MessageSkeleton />
            <MessageSkeleton />
            <MessageSkeleton />
            <span className="sr-only">Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <EmptyInbox />
        ) : (
          <div role="feed" aria-label="Message feed">
            {messages.map((message) => (
              <MessageCard key={message.id} message={message} />
            ))}
          </div>
        )}
      </Card>

      {/* Footer note */}
      {!isLoading && messages.length > 0 && (
        <footer className="px-3 py-3 text-center">
          <p className="text-xs text-muted-foreground">
            {messages.length} message{messages.length !== 1 ? "s" : ""}
          </p>
        </footer>
      )}
    </section>
  );
}

// ============================================================================
// ACCESSIBILITY NOTES
// ============================================================================

/**
 * Accessibility Considerations:
 * 
 * 1. Semantic HTML
 *    - Uses <article>, <section>, <header>, <footer>, <time>
 *    - Proper heading hierarchy (h2 for section, h3 for messages)
 * 
 * 2. ARIA Labels
 *    - Section labeled with student name context
 *    - Each message has descriptive aria-label
 *    - Loading and empty states have role="status"
 *    - Feed container uses role="feed"
 * 
 * 3. Screen Reader Support
 *    - Time sent available via sr-only text
 *    - Message count announced
 *    - Loading state clearly indicated
 * 
 * 4. Visual Design
 *    - High contrast text (text-foreground on bg-background)
 *    - Minimum 16px base font size
 *    - Adequate line height (leading-relaxed)
 *    - Clear visual hierarchy
 * 
 * 5. Performance
 *    - No images or icons (text-only)
 *    - No animations or transitions
 *    - Minimal CSS complexity
 *    - No JavaScript interactions
 * 
 * 6. Low-End Phone Support
 *    - No heavy computations
 *    - Simple DOM structure
 *    - No lazy loading (all content visible)
 *    - No infinite scroll (pagination if needed)
 */
