import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

// Types
type MessageCategory = Database["public"]["Enums"]["message_category"];
type DeliveryChannel = Database["public"]["Enums"]["delivery_channel"];
type DeliveryStatus = Database["public"]["Enums"]["delivery_status"];

export interface ParentContact {
  id: string;
  student_id: string;
  parent_name: string;
  relationship: string | null;
  whatsapp_number: string | null;
  sms_number: string | null;
  email: string | null;
  preferred_language: string | null;
  receives_learning_updates: boolean | null;
  receives_attendance_notices: boolean | null;
  receives_fee_updates: boolean | null;
  receives_announcements: boolean | null;
  receives_emergency: boolean | null;
  last_successful_contact_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationRule {
  id: string;
  school_id: string;
  category: MessageCategory;
  requires_approval: boolean;
  max_messages_per_week: number | null;
  allowed_send_hours_start: number | null;
  allowed_send_hours_end: number | null;
  priority_level: number;
  retry_attempts: number | null;
  retry_delay_hours: number | null;
}

export interface MessageTemplate {
  id: string;
  school_id: string;
  category: MessageCategory;
  template_name: string;
  template_body: string;
  is_active: boolean | null;
  requires_teacher_approval: boolean | null;
}

export interface ParentMessage {
  id: string;
  school_id: string;
  parent_contact_id: string;
  student_id: string;
  category: MessageCategory;
  subject: string | null;
  message_body: string;
  priority_level: number;
  requires_approval: boolean | null;
  approved_by: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  attempted_channel: DeliveryChannel | null;
  delivery_status: DeliveryStatus;
  first_attempt_at: string | null;
  last_attempt_at: string | null;
  delivered_at: string | null;
  retry_count: number | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Communication rules - neutral language mappings
export const CATEGORY_LABELS: Record<MessageCategory, string> = {
  learning_update: "Learning Update",
  attendance_notice: "Attendance Notice",
  fee_status: "Account Information",
  school_announcement: "School Announcement",
  emergency_notice: "Important Notice",
};

export const PRIORITY_LABELS: Record<number, string> = {
  1: "Standard",
  2: "Normal",
  3: "Priority",
  4: "Urgent",
};

// Delivery status labels (internal only, never shown to parents)
export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  pending: "Awaiting Send",
  queued: "In Queue",
  sent: "Sent",
  delivered: "Delivered",
  failed: "Not Delivered",
  no_channel: "No Contact Available",
};

// Hook: Get parent contacts for a student
export function useParentContacts(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent-contacts", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("parent_contacts")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ParentContact[];
    },
    enabled: !!studentId,
  });
}

// Hook: Get communication rules for a school
export function useCommunicationRules(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["communication-rules", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("communication_rules")
        .select("*")
        .eq("school_id", schoolId);

      if (error) throw error;
      return data as CommunicationRule[];
    },
    enabled: !!schoolId,
  });
}

// Hook: Get message templates
export function useMessageTemplates(schoolId: string | undefined, category?: MessageCategory) {
  return useQuery({
    queryKey: ["message-templates", schoolId, category],
    queryFn: async () => {
      if (!schoolId) return [];
      let query = supabase
        .from("message_templates")
        .select("*")
        .eq("school_id", schoolId)
        .eq("is_active", true);

      if (category) {
        query = query.eq("category", category);
      }

      const { data, error } = await query.order("template_name");
      if (error) throw error;
      return data as MessageTemplate[];
    },
    enabled: !!schoolId,
  });
}

// Hook: Get messages for a student
export function useParentMessages(studentId: string | undefined) {
  return useQuery({
    queryKey: ["parent-messages", studentId],
    queryFn: async () => {
      if (!studentId) return [];
      const { data, error } = await supabase
        .from("parent_messages")
        .select("*")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ParentMessage[];
    },
    enabled: !!studentId,
  });
}

// Hook: Get pending approval messages
export function usePendingApprovalMessages(schoolId: string | undefined) {
  return useQuery({
    queryKey: ["pending-approval-messages", schoolId],
    queryFn: async () => {
      if (!schoolId) return [];
      const { data, error } = await supabase
        .from("parent_messages")
        .select("*")
        .eq("school_id", schoolId)
        .eq("requires_approval", true)
        .is("approved_at", null)
        .is("rejection_reason", null)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as ParentMessage[];
    },
    enabled: !!schoolId,
  });
}

// Hook: Create parent contact
export function useCreateParentContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contact: Omit<ParentContact, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("parent_contacts")
        .insert(contact)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["parent-contacts", variables.student_id] });
      toast.success("Contact added successfully");
    },
    onError: () => {
      toast.error("Could not add contact");
    },
  });
}

// Hook: Update parent contact
export function useUpdateParentContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ParentContact> & { id: string }) => {
      const { data, error } = await supabase
        .from("parent_contacts")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-contacts", data.student_id] });
      toast.success("Contact updated");
    },
    onError: () => {
      toast.error("Could not update contact");
    },
  });
}

// Hook: Send message (queue for delivery)
export function useSendParentMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (message: {
      school_id: string;
      parent_contact_id: string;
      student_id: string;
      category: MessageCategory;
      subject?: string;
      message_body: string;
      priority_level?: number;
      requires_approval?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("parent_messages")
        .insert({
          ...message,
          priority_level: message.priority_level ?? 2,
          requires_approval: message.requires_approval ?? false,
          delivery_status: message.requires_approval ? "pending" : "queued",
          created_by: (await supabase.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-messages", data.student_id] });
      if (data.requires_approval) {
        toast.success("Message sent for approval");
      } else {
        toast.success("Message queued for delivery");
      }
    },
    onError: () => {
      toast.error("Could not send message");
    },
  });
}

// Hook: Approve message
export function useApproveMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (messageId: string) => {
      const userId = (await supabase.auth.getUser()).data.user?.id;
      const { data, error } = await supabase
        .from("parent_messages")
        .update({
          approved_by: userId,
          approved_at: new Date().toISOString(),
          delivery_status: "queued",
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-messages", data.student_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-messages"] });
      toast.success("Message approved and queued");
    },
    onError: () => {
      toast.error("Could not approve message");
    },
  });
}

// Hook: Reject message
export function useRejectMessage() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ messageId, reason }: { messageId: string; reason: string }) => {
      const { data, error } = await supabase
        .from("parent_messages")
        .update({
          rejection_reason: reason,
          delivery_status: "failed",
        })
        .eq("id", messageId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["parent-messages", data.student_id] });
      queryClient.invalidateQueries({ queryKey: ["pending-approval-messages"] });
      toast.success("Message declined");
    },
    onError: () => {
      toast.error("Could not update message");
    },
  });
}

// Helper: Get available channel for a contact
export function getAvailableChannel(contact: ParentContact): DeliveryChannel | null {
  if (contact.whatsapp_number) return "whatsapp";
  if (contact.sms_number) return "sms";
  if (contact.email) return "email";
  return null;
}

// Helper: Check if parent can receive category
export function canReceiveCategory(contact: ParentContact, category: MessageCategory): boolean {
  switch (category) {
    case "learning_update":
      return contact.receives_learning_updates ?? true;
    case "attendance_notice":
      return contact.receives_attendance_notices ?? true;
    case "fee_status":
      return contact.receives_fee_updates ?? false; // Opt-in only
    case "school_announcement":
      return contact.receives_announcements ?? true;
    case "emergency_notice":
      return contact.receives_emergency ?? true;
    default:
      return false;
  }
}

// Helper: Replace template placeholders
export function fillTemplate(
  template: string,
  data: { student_name?: string; class_name?: string; school_name?: string; [key: string]: string | undefined }
): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => data[key] ?? `{{${key}}}`);
}
