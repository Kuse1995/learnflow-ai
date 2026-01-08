/**
 * Parent Inbox Hook
 * 
 * Fetches messages for a parent's linked students.
 * Read-only, simple query with minimal transformations.
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ParentMessage } from "@/components/parent-inbox";

interface UseParentInboxOptions {
  studentId?: string;
  guardianId?: string;
  limit?: number;
}

export function useParentInbox({ 
  studentId, 
  guardianId,
  limit = 50 
}: UseParentInboxOptions) {
  return useQuery({
    queryKey: ["parent-inbox", studentId, guardianId, limit],
    queryFn: async (): Promise<ParentMessage[]> => {
      // Build query based on what IDs we have
      let query = supabase
        .from("parent_messages")
        .select(`
          id,
          subject,
          message_body,
          category,
          created_at,
          delivered_at,
          is_ai_generated,
          school_id,
          student_id
        `)
        .in("delivery_status", ["sent", "delivered"])
        .order("created_at", { ascending: false })
        .limit(limit);

      // Filter by student if provided
      if (studentId) {
        query = query.eq("student_id", studentId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Transform to simple format
      return (data || []).map((msg): ParentMessage => ({
        id: msg.id,
        title: msg.subject || getCategoryTitle(msg.category),
        body: msg.message_body,
        sentAt: msg.delivered_at || msg.created_at,
        // AI-generated messages are from "School", otherwise from "Teacher"
        senderName: msg.is_ai_generated ? "School" : "Teacher",
        senderType: msg.is_ai_generated ? "school" : "teacher",
        category: msg.category,
      }));
    },
    enabled: !!(studentId || guardianId),
    staleTime: 60000, // Cache for 1 minute
    refetchOnWindowFocus: false, // Don't refetch on tab focus (saves data)
  });
}

// Simple category to title mapping
function getCategoryTitle(category: string): string {
  const titles: Record<string, string> = {
    learning_update: "Learning Update",
    attendance_notice: "Attendance Notice",
    school_announcement: "School Announcement",
    support_tip: "Support Tip",
    administrative_notice: "Administrative Notice",
    emergency_notice: "Important Notice",
    fee_status: "Fee Update",
  };
  return titles[category] || "Message";
}

/**
 * Hook to get messages for all linked students
 */
export function useParentInboxForGuardian(guardianId: string | undefined) {
  return useQuery({
    queryKey: ["parent-inbox-guardian", guardianId],
    queryFn: async (): Promise<{
      studentId: string;
      studentName: string;
      messages: ParentMessage[];
    }[]> => {
      if (!guardianId) return [];

      // Get linked students
      const { data: links, error: linksError } = await supabase
        .from("guardian_student_links")
        .select(`
          student_id,
          students (
            id,
            name
          )
        `)
        .eq("guardian_id", guardianId)
        .is("deleted_at", null);

      if (linksError) throw linksError;
      if (!links || links.length === 0) return [];

      // Get messages for all students
      const studentIds = links.map(l => l.student_id);
      
      const { data: messages, error: msgError } = await supabase
        .from("parent_messages")
        .select(`
          id,
          subject,
          message_body,
          category,
          created_at,
          delivered_at,
          is_ai_generated,
          student_id
        `)
        .in("student_id", studentIds)
        .in("delivery_status", ["sent", "delivered"])
        .order("created_at", { ascending: false })
        .limit(100);

      if (msgError) throw msgError;

      // Group by student
      const grouped = links.map(link => {
        const studentMessages = (messages || [])
          .filter(m => m.student_id === link.student_id)
          .map((msg): ParentMessage => ({
            id: msg.id,
            title: msg.subject || getCategoryTitle(msg.category),
            body: msg.message_body,
            sentAt: msg.delivered_at || msg.created_at,
            senderName: msg.is_ai_generated ? "School" : "Teacher",
            senderType: msg.is_ai_generated ? "school" : "teacher",
            category: msg.category,
          }));

        return {
          studentId: link.student_id,
          studentName: (link.students as { name: string })?.name || "Student",
          messages: studentMessages,
        };
      });

      return grouped;
    },
    enabled: !!guardianId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });
}
