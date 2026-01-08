export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      ai_abuse_attempts: {
        Row: {
          attempt_type: string
          blocked: boolean | null
          class_id: string | null
          created_at: string
          details: Json | null
          feature_type: string
          id: string
          input_hash: string | null
          user_id: string | null
        }
        Insert: {
          attempt_type: string
          blocked?: boolean | null
          class_id?: string | null
          created_at?: string
          details?: Json | null
          feature_type: string
          id?: string
          input_hash?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_type?: string
          blocked?: boolean | null
          class_id?: string | null
          created_at?: string
          details?: Json | null
          feature_type?: string
          id?: string
          input_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_abuse_attempts_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_action_traces: {
        Row: {
          agent_name: string
          audit_log_id: string
          class_id: string | null
          created_at: string
          data_sources: string[] | null
          id: string
          purpose: string
          student_id: string | null
          teacher_responded_at: string | null
          teacher_response: string | null
        }
        Insert: {
          agent_name: string
          audit_log_id: string
          class_id?: string | null
          created_at?: string
          data_sources?: string[] | null
          id?: string
          purpose: string
          student_id?: string | null
          teacher_responded_at?: string | null
          teacher_response?: string | null
        }
        Update: {
          agent_name?: string
          audit_log_id?: string
          class_id?: string | null
          created_at?: string
          data_sources?: string[] | null
          id?: string
          purpose?: string
          student_id?: string | null
          teacher_responded_at?: string | null
          teacher_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_action_traces_audit_log_id_fkey"
            columns: ["audit_log_id"]
            isOneToOne: false
            referencedRelation: "audit_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_traces_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_action_traces_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      app_versions: {
        Row: {
          breaking_change: boolean
          changelog: string[] | null
          deployed_by: string | null
          id: string
          is_current: boolean
          notes: string | null
          released_at: string
          version: string
        }
        Insert: {
          breaking_change?: boolean
          changelog?: string[] | null
          deployed_by?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          released_at?: string
          version: string
        }
        Update: {
          breaking_change?: boolean
          changelog?: string[] | null
          deployed_by?: string | null
          id?: string
          is_current?: boolean
          notes?: string | null
          released_at?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_versions_deployed_by_fkey"
            columns: ["deployed_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          class_id: string
          created_at: string
          date: string
          id: string
          marked_by: string | null
          present: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          id?: string
          marked_by?: string | null
          present?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          id?: string
          marked_by?: string | null
          present?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_integrity_alerts: {
        Row: {
          alert_type: string
          details: Json | null
          detected_at: string
          environment: string
          id: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          alert_type: string
          details?: Json | null
          detected_at?: string
          environment: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          alert_type?: string
          details?: Json | null
          detected_at?: string
          environment?: string
          id?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          created_at: string
          entity_id: string | null
          entity_type: string
          entry_hash: string
          environment: string
          id: string
          metadata: Json | null
          previous_hash: string | null
          summary: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_type: Database["public"]["Enums"]["audit_actor_type"]
          created_at?: string
          entity_id?: string | null
          entity_type: string
          entry_hash: string
          environment?: string
          id?: string
          metadata?: Json | null
          previous_hash?: string | null
          summary: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_type?: Database["public"]["Enums"]["audit_actor_type"]
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          entry_hash?: string
          environment?: string
          id?: string
          metadata?: Json | null
          previous_hash?: string | null
          summary?: string
        }
        Relationships: []
      }
      backup_schedules: {
        Row: {
          backup_type: Database["public"]["Enums"]["backup_type"]
          created_at: string
          enabled: boolean
          id: string
          last_run_at: string | null
          next_run_at: string | null
          schedule_type: string
          school_id: string | null
          scope: Database["public"]["Enums"]["backup_scope"]
          updated_at: string
        }
        Insert: {
          backup_type: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type: string
          school_id?: string | null
          scope?: Database["public"]["Enums"]["backup_scope"]
          updated_at?: string
        }
        Update: {
          backup_type?: Database["public"]["Enums"]["backup_type"]
          created_at?: string
          enabled?: boolean
          id?: string
          last_run_at?: string | null
          next_run_at?: string | null
          schedule_type?: string
          school_id?: string | null
          scope?: Database["public"]["Enums"]["backup_scope"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "backup_schedules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      backups: {
        Row: {
          app_version: string | null
          backup_type: Database["public"]["Enums"]["backup_type"]
          class_id: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          environment: string
          error_message: string | null
          file_size_bytes: number | null
          file_url: string | null
          id: string
          record_counts: Json | null
          school_id: string | null
          scope: Database["public"]["Enums"]["backup_scope"]
          started_at: string | null
          status: Database["public"]["Enums"]["backup_status"]
          student_id: string | null
          version_id: string
        }
        Insert: {
          app_version?: string | null
          backup_type: Database["public"]["Enums"]["backup_type"]
          class_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          record_counts?: Json | null
          school_id?: string | null
          scope: Database["public"]["Enums"]["backup_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["backup_status"]
          student_id?: string | null
          version_id: string
        }
        Update: {
          app_version?: string | null
          backup_type?: Database["public"]["Enums"]["backup_type"]
          class_id?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          environment?: string
          error_message?: string | null
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          record_counts?: Json | null
          school_id?: string | null
          scope?: Database["public"]["Enums"]["backup_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["backup_status"]
          student_id?: string | null
          version_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "backups_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backups_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "backups_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          amount: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          event_type: Database["public"]["Enums"]["billing_event_type"]
          id: string
          notes: string | null
          plan_id: string | null
          previous_plan_id: string | null
          school_id: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          event_type: Database["public"]["Enums"]["billing_event_type"]
          id?: string
          notes?: string | null
          plan_id?: string | null
          previous_plan_id?: string | null
          school_id: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          event_type?: Database["public"]["Enums"]["billing_event_type"]
          id?: string
          notes?: string | null
          plan_id?: string | null
          previous_plan_id?: string | null
          school_id?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_previous_plan_id_fkey"
            columns: ["previous_plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          grade: string | null
          id: string
          name: string
          school_id: string | null
          section: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          grade?: string | null
          id?: string
          name: string
          school_id?: string | null
          section?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          grade?: string | null
          id?: string
          name?: string
          school_id?: string | null
          section?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "classes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_rules: {
        Row: {
          allowed_send_hours_end: number | null
          allowed_send_hours_start: number | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          id: string
          max_messages_per_week: number | null
          priority_level: number
          requires_approval: boolean
          retry_attempts: number | null
          retry_delay_hours: number | null
          school_id: string
          updated_at: string
        }
        Insert: {
          allowed_send_hours_end?: number | null
          allowed_send_hours_start?: number | null
          category: Database["public"]["Enums"]["message_category"]
          created_at?: string
          id?: string
          max_messages_per_week?: number | null
          priority_level?: number
          requires_approval?: boolean
          retry_attempts?: number | null
          retry_delay_hours?: number | null
          school_id: string
          updated_at?: string
        }
        Update: {
          allowed_send_hours_end?: number | null
          allowed_send_hours_start?: number | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          id?: string
          max_messages_per_week?: number | null
          priority_level?: number
          requires_approval?: boolean
          retry_attempts?: number | null
          retry_delay_hours?: number | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_rules_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_settings: {
        Row: {
          compliance_mode: Database["public"]["Enums"]["compliance_mode"]
          disable_auto_generation: boolean
          id: string
          require_confirmation_steps: boolean
          require_teacher_approval: boolean
          school_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          compliance_mode?: Database["public"]["Enums"]["compliance_mode"]
          disable_auto_generation?: boolean
          id?: string
          require_confirmation_steps?: boolean
          require_teacher_approval?: boolean
          school_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          compliance_mode?: Database["public"]["Enums"]["compliance_mode"]
          disable_auto_generation?: boolean
          id?: string
          require_confirmation_steps?: boolean
          require_teacher_approval?: boolean
          school_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_settings_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_attempts: {
        Row: {
          attempt_number: number
          channel: Database["public"]["Enums"]["delivery_channel"]
          completed_at: string | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          latency_ms: number | null
          message_id: string
          network_available: boolean | null
          provider_response: Json | null
          started_at: string
          succeeded: boolean | null
        }
        Insert: {
          attempt_number?: number
          channel: Database["public"]["Enums"]["delivery_channel"]
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message_id: string
          network_available?: boolean | null
          provider_response?: Json | null
          started_at?: string
          succeeded?: boolean | null
        }
        Update: {
          attempt_number?: number
          channel?: Database["public"]["Enums"]["delivery_channel"]
          completed_at?: string | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          message_id?: string
          network_available?: boolean | null
          provider_response?: Json | null
          started_at?: string
          succeeded?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_attempts_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_processor_state: {
        Row: {
          created_at: string
          id: string
          is_healthy: boolean | null
          last_error: string | null
          last_heartbeat_at: string | null
          messages_failed: number | null
          messages_processed: number | null
          processor_type: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_healthy?: boolean | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          messages_failed?: number | null
          messages_processed?: number | null
          processor_type?: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_healthy?: boolean | null
          last_error?: string | null
          last_heartbeat_at?: string | null
          messages_failed?: number | null
          messages_processed?: number | null
          processor_type?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_processor_state_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      deployment_checks: {
        Row: {
          check_name: string
          check_type: string
          created_at: string
          description: string | null
          id: string
          is_blocking: boolean
          last_checked_at: string | null
          result_details: Json | null
          status: string
        }
        Insert: {
          check_name: string
          check_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_blocking?: boolean
          last_checked_at?: string | null
          result_details?: Json | null
          status?: string
        }
        Update: {
          check_name?: string
          check_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_blocking?: boolean
          last_checked_at?: string | null
          result_details?: Json | null
          status?: string
        }
        Relationships: []
      }
      error_codes: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string
          id: string
          resolution_steps: string[] | null
          severity: string | null
          title: string
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description: string
          id?: string
          resolution_steps?: string[] | null
          severity?: string | null
          title: string
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string
          id?: string
          resolution_steps?: string[] | null
          severity?: string | null
          title?: string
        }
        Relationships: []
      }
      feature_adoption_events: {
        Row: {
          count: number
          created_at: string
          event_date: string
          event_type: string
          feature_key: string
          id: string
          metadata: Json | null
          school_id: string | null
        }
        Insert: {
          count?: number
          created_at?: string
          event_date?: string
          event_type: string
          feature_key: string
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Update: {
          count?: number
          created_at?: string
          event_date?: string
          event_type?: string
          feature_key?: string
          id?: string
          metadata?: Json | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_adoption_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled: boolean
          environment: string[] | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string[] | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled?: boolean
          environment?: string[] | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_active: boolean
          is_mandatory: boolean
          name: string
          school_id: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name: string
          school_id: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_active?: boolean
          is_mandatory?: boolean
          name?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_categories_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_payments: {
        Row: {
          amount: number
          assignment_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          currency: string
          id: string
          notes: string | null
          offline_id: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_number: string | null
          recorded_by: string | null
          recorded_offline: boolean
          reference_number: string | null
          school_id: string
          status: Database["public"]["Enums"]["payment_status"]
          student_id: string
          synced_at: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          assignment_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          offline_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_date: string
          payment_method: Database["public"]["Enums"]["payment_method"]
          receipt_number?: string | null
          recorded_by?: string | null
          recorded_offline?: boolean
          reference_number?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id: string
          synced_at?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          assignment_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          offline_id?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_date?: string
          payment_method?: Database["public"]["Enums"]["payment_method"]
          receipt_number?: string | null
          recorded_by?: string | null
          recorded_offline?: boolean
          reference_number?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["payment_status"]
          student_id?: string
          synced_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_payments_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "student_fee_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_payments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_structures: {
        Row: {
          academic_year: number
          amount: number
          category_id: string
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          frequency: Database["public"]["Enums"]["fee_frequency"]
          grade: string | null
          id: string
          is_active: boolean
          late_fee_after_days: number | null
          late_fee_amount: number | null
          notes: string | null
          school_id: string
          term: number | null
          updated_at: string
        }
        Insert: {
          academic_year: number
          amount: number
          category_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          grade?: string | null
          id?: string
          is_active?: boolean
          late_fee_after_days?: number | null
          late_fee_amount?: number | null
          notes?: string | null
          school_id: string
          term?: number | null
          updated_at?: string
        }
        Update: {
          academic_year?: number
          amount?: number
          category_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          frequency?: Database["public"]["Enums"]["fee_frequency"]
          grade?: string | null
          id?: string
          is_active?: boolean
          late_fee_after_days?: number | null
          late_fee_amount?: number | null
          notes?: string | null
          school_id?: string
          term?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fee_structures_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "fee_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fee_structures_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_link_audit_log: {
        Row: {
          action: string
          created_at: string
          guardian_id: string
          id: string
          ip_address: string | null
          link_request_id: string | null
          metadata: Json | null
          new_status: Database["public"]["Enums"]["link_request_status"] | null
          performed_by: string | null
          performed_by_role: string | null
          previous_status:
            | Database["public"]["Enums"]["link_request_status"]
            | null
          reason: string | null
          student_id: string
        }
        Insert: {
          action: string
          created_at?: string
          guardian_id: string
          id?: string
          ip_address?: string | null
          link_request_id?: string | null
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["link_request_status"] | null
          performed_by?: string | null
          performed_by_role?: string | null
          previous_status?:
            | Database["public"]["Enums"]["link_request_status"]
            | null
          reason?: string | null
          student_id: string
        }
        Update: {
          action?: string
          created_at?: string
          guardian_id?: string
          id?: string
          ip_address?: string | null
          link_request_id?: string | null
          metadata?: Json | null
          new_status?: Database["public"]["Enums"]["link_request_status"] | null
          performed_by?: string | null
          performed_by_role?: string | null
          previous_status?:
            | Database["public"]["Enums"]["link_request_status"]
            | null
          reason?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_link_audit_log_link_request_id_fkey"
            columns: ["link_request_id"]
            isOneToOne: false
            referencedRelation: "guardian_link_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_link_incidents: {
        Row: {
          created_at: string
          data_accessed_during_incident: boolean | null
          description: string
          discovered_at: string
          discovered_by: string
          discovered_by_role: string
          guardian_id: string
          id: string
          incident_type: string
          link_id: string | null
          link_removed: boolean | null
          link_request_id: string | null
          parent_notified: boolean | null
          preventive_measures: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          root_cause: string | null
          school_admin_notified: boolean | null
          school_id: string
          severity: string
          status: string
          student_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_accessed_during_incident?: boolean | null
          description: string
          discovered_at?: string
          discovered_by: string
          discovered_by_role: string
          guardian_id: string
          id?: string
          incident_type: string
          link_id?: string | null
          link_removed?: boolean | null
          link_request_id?: string | null
          parent_notified?: boolean | null
          preventive_measures?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          school_admin_notified?: boolean | null
          school_id: string
          severity?: string
          status?: string
          student_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_accessed_during_incident?: boolean | null
          description?: string
          discovered_at?: string
          discovered_by?: string
          discovered_by_role?: string
          guardian_id?: string
          id?: string
          incident_type?: string
          link_id?: string | null
          link_removed?: boolean | null
          link_request_id?: string | null
          parent_notified?: boolean | null
          preventive_measures?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          root_cause?: string | null
          school_admin_notified?: boolean | null
          school_id?: string
          severity?: string
          status?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "guardian_link_incidents_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_incidents_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "guardian_student_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_incidents_link_request_id_fkey"
            columns: ["link_request_id"]
            isOneToOne: false
            referencedRelation: "guardian_link_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_incidents_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_incidents_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_link_requests: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          confirmation_code: string | null
          confirmation_expires_at: string | null
          confirmation_method: string | null
          confirmation_sent_at: string | null
          confirmed_at: string | null
          created_at: string
          duration_type: Database["public"]["Enums"]["link_duration"]
          expires_at: string | null
          guardian_id: string
          id: string
          identity_verified_at: string | null
          identity_verified_by: string | null
          initiated_by: string
          initiated_by_role: string
          permission_tier: Database["public"]["Enums"]["parent_permission_tier"]
          rejection_reason: string | null
          relationship_type: Database["public"]["Enums"]["guardian_role"]
          requires_parent_confirmation: boolean | null
          review_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          school_id: string
          status: Database["public"]["Enums"]["link_request_status"]
          student_id: string
          updated_at: string
          verification_notes: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          confirmation_code?: string | null
          confirmation_expires_at?: string | null
          confirmation_method?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration_type?: Database["public"]["Enums"]["link_duration"]
          expires_at?: string | null
          guardian_id: string
          id?: string
          identity_verified_at?: string | null
          identity_verified_by?: string | null
          initiated_by: string
          initiated_by_role: string
          permission_tier?: Database["public"]["Enums"]["parent_permission_tier"]
          rejection_reason?: string | null
          relationship_type?: Database["public"]["Enums"]["guardian_role"]
          requires_parent_confirmation?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          school_id: string
          status?: Database["public"]["Enums"]["link_request_status"]
          student_id: string
          updated_at?: string
          verification_notes?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          confirmation_code?: string | null
          confirmation_expires_at?: string | null
          confirmation_method?: string | null
          confirmation_sent_at?: string | null
          confirmed_at?: string | null
          created_at?: string
          duration_type?: Database["public"]["Enums"]["link_duration"]
          expires_at?: string | null
          guardian_id?: string
          id?: string
          identity_verified_at?: string | null
          identity_verified_by?: string | null
          initiated_by?: string
          initiated_by_role?: string
          permission_tier?: Database["public"]["Enums"]["parent_permission_tier"]
          rejection_reason?: string | null
          relationship_type?: Database["public"]["Enums"]["guardian_role"]
          requires_parent_confirmation?: boolean | null
          review_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          school_id?: string
          status?: Database["public"]["Enums"]["link_request_status"]
          student_id?: string
          updated_at?: string
          verification_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_link_requests_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_requests_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_link_requests_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_link_retention: {
        Row: {
          created_at: string
          deleted_at: string
          deleted_by: string
          deletion_reason: string
          guardian_id: string
          id: string
          original_link_id: string | null
          permanent_delete_scheduled: boolean | null
          permission_tier: string | null
          recovered_at: string | null
          recovered_by: string | null
          relationship_type: string | null
          retention_until: string
          school_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string
          deleted_by: string
          deletion_reason: string
          guardian_id: string
          id?: string
          original_link_id?: string | null
          permanent_delete_scheduled?: boolean | null
          permission_tier?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          relationship_type?: string | null
          retention_until: string
          school_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string
          deleted_by?: string
          deletion_reason?: string
          guardian_id?: string
          id?: string
          original_link_id?: string | null
          permanent_delete_scheduled?: boolean | null
          permission_tier?: string | null
          recovered_at?: string | null
          recovered_by?: string | null
          relationship_type?: string | null
          retention_until?: string
          school_id?: string
          student_id?: string
        }
        Relationships: []
      }
      guardian_phone_registry: {
        Row: {
          created_at: string
          guardian_id: string
          id: string
          is_shared: boolean | null
          phone_number: string
          phone_type: string
          shared_with_guardian_ids: string[] | null
        }
        Insert: {
          created_at?: string
          guardian_id: string
          id?: string
          is_shared?: boolean | null
          phone_number: string
          phone_type?: string
          shared_with_guardian_ids?: string[] | null
        }
        Update: {
          created_at?: string
          guardian_id?: string
          id?: string
          is_shared?: boolean | null
          phone_number?: string
          phone_type?: string
          shared_with_guardian_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_registry_guardian_fk"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
        ]
      }
      guardian_student_links: {
        Row: {
          can_make_decisions: boolean | null
          can_pickup: boolean | null
          can_receive_emergency: boolean | null
          can_receive_reports: boolean | null
          contact_priority: number | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          guardian_id: string
          id: string
          link_reason: string | null
          receives_all_communications: boolean | null
          relationship_label: string | null
          role: Database["public"]["Enums"]["guardian_role"]
          student_id: string
          updated_at: string
          verification_method: string | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          can_make_decisions?: boolean | null
          can_pickup?: boolean | null
          can_receive_emergency?: boolean | null
          can_receive_reports?: boolean | null
          contact_priority?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          guardian_id: string
          id?: string
          link_reason?: string | null
          receives_all_communications?: boolean | null
          relationship_label?: string | null
          role?: Database["public"]["Enums"]["guardian_role"]
          student_id: string
          updated_at?: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          can_make_decisions?: boolean | null
          can_pickup?: boolean | null
          can_receive_emergency?: boolean | null
          can_receive_reports?: boolean | null
          contact_priority?: number | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          guardian_id?: string
          id?: string
          link_reason?: string | null
          receives_all_communications?: boolean | null
          relationship_label?: string | null
          role?: Database["public"]["Enums"]["guardian_role"]
          student_id?: string
          updated_at?: string
          verification_method?: string | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardian_links_guardian_fk"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guardian_links_student_fk"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      guardians: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          deleted_by: string | null
          display_name: string
          email: string | null
          has_account: boolean | null
          id: string
          internal_id: string | null
          notes: string | null
          preferred_language: string | null
          primary_phone: string | null
          school_id: string
          secondary_phone: string | null
          updated_at: string
          user_id: string | null
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name: string
          email?: string | null
          has_account?: boolean | null
          id?: string
          internal_id?: string | null
          notes?: string | null
          preferred_language?: string | null
          primary_phone?: string | null
          school_id: string
          secondary_phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          display_name?: string
          email?: string | null
          has_account?: boolean | null
          id?: string
          internal_id?: string | null
          notes?: string | null
          preferred_language?: string | null
          primary_phone?: string | null
          school_id?: string
          secondary_phone?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guardians_school_fk"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      help_dismissals: {
        Row: {
          dismissed_at: string
          help_key: string
          id: string
          never_show_again: boolean | null
          teacher_id: string
        }
        Insert: {
          dismissed_at?: string
          help_key: string
          id?: string
          never_show_again?: boolean | null
          teacher_id: string
        }
        Update: {
          dismissed_at?: string
          help_key?: string
          id?: string
          never_show_again?: boolean | null
          teacher_id?: string
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          content: string
          created_at: string | null
          document_type: string
          effective_date: string
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
          version: string
        }
        Insert: {
          content: string
          created_at?: string | null
          document_type: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
          version?: string
        }
        Update: {
          content?: string
          created_at?: string | null
          document_type?: string
          effective_date?: string
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
          version?: string
        }
        Relationships: []
      }
      lesson_differentiation_suggestions: {
        Row: {
          class_id: string
          core_lesson_flow: string[]
          created_at: string
          extension_opportunities: string[]
          id: string
          lesson_duration_minutes: number | null
          lesson_objective: string
          lesson_topic: string
          materials_needed: string[] | null
          optional_variations: string[]
          support_strategies: string[]
          teacher_accepted: boolean
          updated_at: string
        }
        Insert: {
          class_id: string
          core_lesson_flow?: string[]
          created_at?: string
          extension_opportunities?: string[]
          id?: string
          lesson_duration_minutes?: number | null
          lesson_objective: string
          lesson_topic: string
          materials_needed?: string[] | null
          optional_variations?: string[]
          support_strategies?: string[]
          teacher_accepted?: boolean
          updated_at?: string
        }
        Update: {
          class_id?: string
          core_lesson_flow?: string[]
          created_at?: string
          extension_opportunities?: string[]
          id?: string
          lesson_duration_minutes?: number | null
          lesson_objective?: string
          lesson_topic?: string
          materials_needed?: string[] | null
          optional_variations?: string[]
          support_strategies?: string[]
          teacher_accepted?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_differentiation_suggestions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_resources: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          lesson_id: string
          title: string | null
          type: string
          url: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id: string
          title?: string | null
          type: string
          url: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          lesson_id?: string
          title?: string | null
          type?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_resources_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lesson_differentiation_suggestions"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_plan_assignments: {
        Row: {
          assigned_by: string
          created_at: string | null
          duration_type: string
          end_date: string | null
          id: string
          internal_notes: string | null
          is_active: boolean | null
          paused_at: string | null
          paused_reason: string | null
          payment_method: string | null
          payment_reference: string | null
          plan_type: string
          school_id: string
          start_date: string
          updated_at: string | null
        }
        Insert: {
          assigned_by: string
          created_at?: string | null
          duration_type: string
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          paused_at?: string | null
          paused_reason?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_type: string
          school_id: string
          start_date?: string
          updated_at?: string | null
        }
        Update: {
          assigned_by?: string
          created_at?: string | null
          duration_type?: string
          end_date?: string | null
          id?: string
          internal_notes?: string | null
          is_active?: boolean | null
          paused_at?: string | null
          paused_reason?: string | null
          payment_method?: string | null
          payment_reference?: string | null
          plan_type?: string
          school_id?: string
          start_date?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_plan_assignments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      message_approval_log: {
        Row: {
          action: string
          id: string
          ip_address: string | null
          message_id: string
          metadata: Json | null
          new_status: string | null
          performed_at: string
          performed_by: string
          previous_status: string | null
          reason: string | null
          role_at_action: string
        }
        Insert: {
          action: string
          id?: string
          ip_address?: string | null
          message_id: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by: string
          previous_status?: string | null
          reason?: string | null
          role_at_action: string
        }
        Update: {
          action?: string
          id?: string
          ip_address?: string | null
          message_id?: string
          metadata?: Json | null
          new_status?: string | null
          performed_at?: string
          performed_by?: string
          previous_status?: string | null
          reason?: string | null
          role_at_action?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_approval_log_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_edit_history: {
        Row: {
          change_summary: string | null
          edit_type: string
          edited_at: string
          edited_by: string
          id: string
          message_id: string
          metadata: Json | null
          new_body: string | null
          new_subject: string | null
          previous_body: string | null
          previous_subject: string | null
        }
        Insert: {
          change_summary?: string | null
          edit_type: string
          edited_at?: string
          edited_by: string
          id?: string
          message_id: string
          metadata?: Json | null
          new_body?: string | null
          new_subject?: string | null
          previous_body?: string | null
          previous_subject?: string | null
        }
        Update: {
          change_summary?: string | null
          edit_type?: string
          edited_at?: string
          edited_by?: string
          id?: string
          message_id?: string
          metadata?: Json | null
          new_body?: string | null
          new_subject?: string | null
          previous_body?: string | null
          previous_subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "message_edit_history_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_queue: {
        Row: {
          attempts: number | null
          channel: Database["public"]["Enums"]["delivery_channel"]
          created_at: string
          id: string
          last_error: string | null
          max_attempts: number | null
          message_id: string
          priority_level: number
          processed_at: string | null
          scheduled_for: string
        }
        Insert: {
          attempts?: number | null
          channel: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          message_id: string
          priority_level?: number
          processed_at?: string | null
          scheduled_for?: string
        }
        Update: {
          attempts?: number | null
          channel?: Database["public"]["Enums"]["delivery_channel"]
          created_at?: string
          id?: string
          last_error?: string | null
          max_attempts?: number | null
          message_id?: string
          priority_level?: number
          processed_at?: string | null
          scheduled_for?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      message_templates: {
        Row: {
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean | null
          requires_teacher_approval: boolean | null
          school_id: string
          template_body: string
          template_name: string
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["message_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          requires_teacher_approval?: boolean | null
          school_id: string
          template_body: string
          template_name: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          requires_teacher_approval?: boolean | null
          school_id?: string
          template_body?: string
          template_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_templates_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      migration_logs: {
        Row: {
          applied_at: string
          applied_by: string | null
          environment: string
          error_message: string | null
          id: string
          migration_name: string
          notes: string | null
          rollback_executed_at: string | null
          rollback_supported: boolean
          status: string
        }
        Insert: {
          applied_at?: string
          applied_by?: string | null
          environment: string
          error_message?: string | null
          id?: string
          migration_name: string
          notes?: string | null
          rollback_executed_at?: string | null
          rollback_supported?: boolean
          status?: string
        }
        Update: {
          applied_at?: string
          applied_by?: string | null
          environment?: string
          error_message?: string | null
          id?: string
          migration_name?: string
          notes?: string | null
          rollback_executed_at?: string | null
          rollback_supported?: boolean
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "migration_logs_applied_by_fkey"
            columns: ["applied_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_export_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          data: Json
          export_type: string
          id: string
          last_attempt_at: string | null
          retry_count: number
          school_id: string
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          data: Json
          export_type: string
          id?: string
          last_attempt_at?: string | null
          retry_count?: number
          school_id: string
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          data?: Json
          export_type?: string
          id?: string
          last_attempt_at?: string | null
          retry_count?: number
          school_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "offline_export_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      offline_message_queue: {
        Row: {
          created_offline_at: string
          device_id: string | null
          id: string
          is_synced: boolean | null
          last_sync_error: string | null
          message_id: string | null
          payload: Json
          priority: number | null
          school_id: string
          sync_attempts: number | null
          synced_at: string | null
          target_channel: Database["public"]["Enums"]["delivery_channel"] | null
        }
        Insert: {
          created_offline_at?: string
          device_id?: string | null
          id?: string
          is_synced?: boolean | null
          last_sync_error?: string | null
          message_id?: string | null
          payload: Json
          priority?: number | null
          school_id: string
          sync_attempts?: number | null
          synced_at?: string | null
          target_channel?:
            | Database["public"]["Enums"]["delivery_channel"]
            | null
        }
        Update: {
          created_offline_at?: string
          device_id?: string | null
          id?: string
          is_synced?: boolean | null
          last_sync_error?: string | null
          message_id?: string | null
          payload?: Json
          priority?: number | null
          school_id?: string
          sync_attempts?: number | null
          synced_at?: string | null
          target_channel?:
            | Database["public"]["Enums"]["delivery_channel"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "offline_message_queue_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "parent_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offline_message_queue_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_contacts: {
        Row: {
          created_at: string
          email: string | null
          global_opt_out: boolean | null
          id: string
          last_successful_contact_at: string | null
          max_messages_per_week: number | null
          opt_out_at: string | null
          opt_out_reason: string | null
          parent_name: string
          preferences_updated_at: string | null
          preferences_updated_by: string | null
          preferred_channel: string | null
          preferred_language: string | null
          quiet_hours_end: number | null
          quiet_hours_start: number | null
          receives_announcements: boolean | null
          receives_attendance_notices: boolean | null
          receives_emergency: boolean | null
          receives_fee_updates: boolean | null
          receives_learning_updates: boolean | null
          relationship: string | null
          sms_number: string | null
          student_id: string
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          global_opt_out?: boolean | null
          id?: string
          last_successful_contact_at?: string | null
          max_messages_per_week?: number | null
          opt_out_at?: string | null
          opt_out_reason?: string | null
          parent_name: string
          preferences_updated_at?: string | null
          preferences_updated_by?: string | null
          preferred_channel?: string | null
          preferred_language?: string | null
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          receives_announcements?: boolean | null
          receives_attendance_notices?: boolean | null
          receives_emergency?: boolean | null
          receives_fee_updates?: boolean | null
          receives_learning_updates?: boolean | null
          relationship?: string | null
          sms_number?: string | null
          student_id: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          global_opt_out?: boolean | null
          id?: string
          last_successful_contact_at?: string | null
          max_messages_per_week?: number | null
          opt_out_at?: string | null
          opt_out_reason?: string | null
          parent_name?: string
          preferences_updated_at?: string | null
          preferences_updated_by?: string | null
          preferred_channel?: string | null
          preferred_language?: string | null
          quiet_hours_end?: number | null
          quiet_hours_start?: number | null
          receives_announcements?: boolean | null
          receives_attendance_notices?: boolean | null
          receives_emergency?: boolean | null
          receives_fee_updates?: boolean | null
          receives_learning_updates?: boolean | null
          relationship?: string | null
          sms_number?: string | null
          student_id?: string
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_contacts_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_insight_summaries: {
        Row: {
          approved_at: string | null
          class_id: string
          created_at: string
          home_support_tips: string[] | null
          id: string
          source_analysis_ids: string[] | null
          student_id: string
          summary_text: string
          teacher_approved: boolean
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          class_id: string
          created_at?: string
          home_support_tips?: string[] | null
          id?: string
          source_analysis_ids?: string[] | null
          student_id: string
          summary_text: string
          teacher_approved?: boolean
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          class_id?: string
          created_at?: string
          home_support_tips?: string[] | null
          id?: string
          source_analysis_ids?: string[] | null
          student_id?: string
          summary_text?: string
          teacher_approved?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      parent_messages: {
        Row: {
          ai_source_id: string | null
          ai_source_type: string | null
          approved_at: string | null
          approved_by: string | null
          attempted_channel:
            | Database["public"]["Enums"]["delivery_channel"]
            | null
          category: Database["public"]["Enums"]["message_category"]
          created_at: string
          created_by: string | null
          delivered_at: string | null
          delivery_completed_at: string | null
          delivery_started_at: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          edit_count: number | null
          email_attempted: boolean | null
          email_failed_at: string | null
          first_attempt_at: string | null
          id: string
          internal_notes: string | null
          is_ai_generated: boolean | null
          is_locked: boolean | null
          last_attempt_at: string | null
          last_edited_at: string | null
          last_edited_by: string | null
          locked_at: string | null
          locked_by: string | null
          message_body: string
          next_retry_at: string | null
          offline_queue_position: number | null
          original_ai_body: string | null
          parent_contact_id: string
          priority_level: number
          queued_offline: boolean | null
          rejection_reason: string | null
          requires_approval: boolean | null
          retry_backoff_seconds: number | null
          retry_count: number | null
          school_id: string
          sms_attempted: boolean | null
          sms_failed_at: string | null
          student_id: string
          subject: string | null
          submitted_for_approval_at: string | null
          submitted_for_approval_by: string | null
          updated_at: string
          was_edited_before_approval: boolean | null
          whatsapp_attempted: boolean | null
          whatsapp_failed_at: string | null
        }
        Insert: {
          ai_source_id?: string | null
          ai_source_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attempted_channel?:
            | Database["public"]["Enums"]["delivery_channel"]
            | null
          category: Database["public"]["Enums"]["message_category"]
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_completed_at?: string | null
          delivery_started_at?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          edit_count?: number | null
          email_attempted?: boolean | null
          email_failed_at?: string | null
          first_attempt_at?: string | null
          id?: string
          internal_notes?: string | null
          is_ai_generated?: boolean | null
          is_locked?: boolean | null
          last_attempt_at?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          locked_at?: string | null
          locked_by?: string | null
          message_body: string
          next_retry_at?: string | null
          offline_queue_position?: number | null
          original_ai_body?: string | null
          parent_contact_id: string
          priority_level?: number
          queued_offline?: boolean | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          retry_backoff_seconds?: number | null
          retry_count?: number | null
          school_id: string
          sms_attempted?: boolean | null
          sms_failed_at?: string | null
          student_id: string
          subject?: string | null
          submitted_for_approval_at?: string | null
          submitted_for_approval_by?: string | null
          updated_at?: string
          was_edited_before_approval?: boolean | null
          whatsapp_attempted?: boolean | null
          whatsapp_failed_at?: string | null
        }
        Update: {
          ai_source_id?: string | null
          ai_source_type?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attempted_channel?:
            | Database["public"]["Enums"]["delivery_channel"]
            | null
          category?: Database["public"]["Enums"]["message_category"]
          created_at?: string
          created_by?: string | null
          delivered_at?: string | null
          delivery_completed_at?: string | null
          delivery_started_at?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          edit_count?: number | null
          email_attempted?: boolean | null
          email_failed_at?: string | null
          first_attempt_at?: string | null
          id?: string
          internal_notes?: string | null
          is_ai_generated?: boolean | null
          is_locked?: boolean | null
          last_attempt_at?: string | null
          last_edited_at?: string | null
          last_edited_by?: string | null
          locked_at?: string | null
          locked_by?: string | null
          message_body?: string
          next_retry_at?: string | null
          offline_queue_position?: number | null
          original_ai_body?: string | null
          parent_contact_id?: string
          priority_level?: number
          queued_offline?: boolean | null
          rejection_reason?: string | null
          requires_approval?: boolean | null
          retry_backoff_seconds?: number | null
          retry_count?: number | null
          school_id?: string
          sms_attempted?: boolean | null
          sms_failed_at?: string | null
          student_id?: string
          subject?: string | null
          submitted_for_approval_at?: string | null
          submitted_for_approval_by?: string | null
          updated_at?: string
          was_edited_before_approval?: boolean | null
          whatsapp_attempted?: boolean | null
          whatsapp_failed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_messages_parent_contact_id_fkey"
            columns: ["parent_contact_id"]
            isOneToOne: false
            referencedRelation: "parent_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_messages_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_permissions: {
        Row: {
          can_receive_notifications: boolean | null
          can_request_meetings: boolean | null
          can_view_approved_insights: boolean | null
          can_view_attendance: boolean | null
          can_view_fees: boolean | null
          can_view_learning_updates: boolean | null
          can_view_reports: boolean | null
          can_view_timetables: boolean | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          granted_at: string | null
          granted_by: string | null
          guardian_id: string
          id: string
          permission_tier: Database["public"]["Enums"]["parent_permission_tier"]
          student_id: string
          updated_at: string
        }
        Insert: {
          can_receive_notifications?: boolean | null
          can_request_meetings?: boolean | null
          can_view_approved_insights?: boolean | null
          can_view_attendance?: boolean | null
          can_view_fees?: boolean | null
          can_view_learning_updates?: boolean | null
          can_view_reports?: boolean | null
          can_view_timetables?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          guardian_id: string
          id?: string
          permission_tier?: Database["public"]["Enums"]["parent_permission_tier"]
          student_id: string
          updated_at?: string
        }
        Update: {
          can_receive_notifications?: boolean | null
          can_request_meetings?: boolean | null
          can_view_approved_insights?: boolean | null
          can_view_attendance?: boolean | null
          can_view_fees?: boolean | null
          can_view_learning_updates?: boolean | null
          can_view_reports?: boolean | null
          can_view_timetables?: boolean | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          granted_at?: string | null
          granted_by?: string | null
          guardian_id?: string
          id?: string
          permission_tier?: Database["public"]["Enums"]["parent_permission_tier"]
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_permissions_guardian_id_fkey"
            columns: ["guardian_id"]
            isOneToOne: false
            referencedRelation: "guardians"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "parent_permissions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      parent_preference_history: {
        Row: {
          change_type: string
          changed_by: string | null
          changed_by_role: string
          created_at: string
          id: string
          new_value: Json | null
          parent_contact_id: string
          previous_value: Json | null
          reason: string | null
        }
        Insert: {
          change_type: string
          changed_by?: string | null
          changed_by_role: string
          created_at?: string
          id?: string
          new_value?: Json | null
          parent_contact_id: string
          previous_value?: Json | null
          reason?: string | null
        }
        Update: {
          change_type?: string
          changed_by?: string | null
          changed_by_role?: string
          created_at?: string
          id?: string
          new_value?: Json | null
          parent_contact_id?: string
          previous_value?: Json | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parent_preference_history_parent_contact_id_fkey"
            columns: ["parent_contact_id"]
            isOneToOne: false
            referencedRelation: "parent_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_exit_criteria: {
        Row: {
          all_criteria_met: boolean | null
          created_at: string
          current_active_teachers: number | null
          current_error_rate_percent: number | null
          current_uptime_percent: number | null
          error_rate_met: boolean | null
          id: string
          last_evaluated_at: string | null
          marked_complete_at: string | null
          marked_complete_by: string | null
          max_error_rate_percent: number | null
          min_active_teachers: number | null
          notes: string | null
          parent_features_tested: boolean | null
          parent_readiness_met: boolean | null
          parent_satisfaction_score: number | null
          school_id: string
          teacher_usage_met: boolean | null
          updated_at: string
          uptime_met: boolean | null
          uptime_target_percent: number | null
        }
        Insert: {
          all_criteria_met?: boolean | null
          created_at?: string
          current_active_teachers?: number | null
          current_error_rate_percent?: number | null
          current_uptime_percent?: number | null
          error_rate_met?: boolean | null
          id?: string
          last_evaluated_at?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          max_error_rate_percent?: number | null
          min_active_teachers?: number | null
          notes?: string | null
          parent_features_tested?: boolean | null
          parent_readiness_met?: boolean | null
          parent_satisfaction_score?: number | null
          school_id: string
          teacher_usage_met?: boolean | null
          updated_at?: string
          uptime_met?: boolean | null
          uptime_target_percent?: number | null
        }
        Update: {
          all_criteria_met?: boolean | null
          created_at?: string
          current_active_teachers?: number | null
          current_error_rate_percent?: number | null
          current_uptime_percent?: number | null
          error_rate_met?: boolean | null
          id?: string
          last_evaluated_at?: string | null
          marked_complete_at?: string | null
          marked_complete_by?: string | null
          max_error_rate_percent?: number | null
          min_active_teachers?: number | null
          notes?: string | null
          parent_features_tested?: boolean | null
          parent_readiness_met?: boolean | null
          parent_satisfaction_score?: number | null
          school_id?: string
          teacher_usage_met?: boolean | null
          updated_at?: string
          uptime_met?: boolean | null
          uptime_target_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_exit_criteria_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_incident_controls: {
        Row: {
          active_banner_message: string | null
          ai_pause_reason: string | null
          ai_paused: boolean | null
          ai_paused_at: string | null
          ai_paused_by: string | null
          banner_expires_at: string | null
          banner_severity: string | null
          id: string
          read_only_mode: boolean | null
          read_only_reason: string | null
          read_only_started_at: string | null
          school_id: string
          updated_at: string
        }
        Insert: {
          active_banner_message?: string | null
          ai_pause_reason?: string | null
          ai_paused?: boolean | null
          ai_paused_at?: string | null
          ai_paused_by?: string | null
          banner_expires_at?: string | null
          banner_severity?: string | null
          id?: string
          read_only_mode?: boolean | null
          read_only_reason?: string | null
          read_only_started_at?: string | null
          school_id: string
          updated_at?: string
        }
        Update: {
          active_banner_message?: string | null
          ai_pause_reason?: string | null
          ai_paused?: boolean | null
          ai_paused_at?: string | null
          ai_paused_by?: string | null
          banner_expires_at?: string | null
          banner_severity?: string | null
          id?: string
          read_only_mode?: boolean | null
          read_only_reason?: string | null
          read_only_started_at?: string | null
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pilot_incident_controls_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      pilot_metrics_daily: {
        Row: {
          active_teacher_count: number | null
          ai_generation_count: number | null
          analysis_failure_count: number | null
          analysis_success_count: number | null
          created_at: string
          error_count: number | null
          id: string
          metric_date: string
          school_id: string
          teacher_action_count: number | null
          upload_count: number | null
        }
        Insert: {
          active_teacher_count?: number | null
          ai_generation_count?: number | null
          analysis_failure_count?: number | null
          analysis_success_count?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          metric_date: string
          school_id: string
          teacher_action_count?: number | null
          upload_count?: number | null
        }
        Update: {
          active_teacher_count?: number | null
          ai_generation_count?: number | null
          analysis_failure_count?: number | null
          analysis_success_count?: number | null
          created_at?: string
          error_count?: number | null
          id?: string
          metric_date?: string
          school_id?: string
          teacher_action_count?: number | null
          upload_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pilot_metrics_daily_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          ai_limits: Json
          created_at: string
          currency: string | null
          description: string | null
          display_name: string
          features: Json
          id: string
          is_active: boolean
          max_students: number | null
          max_teachers: number | null
          name: string
          price_annual: number | null
          price_monthly: number | null
          sort_order: number
          stripe_price_id: string | null
          stripe_product_id: string | null
          updated_at: string
        }
        Insert: {
          ai_limits?: Json
          created_at?: string
          currency?: string | null
          description?: string | null
          display_name: string
          features?: Json
          id?: string
          is_active?: boolean
          max_students?: number | null
          max_teachers?: number | null
          name: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Update: {
          ai_limits?: Json
          created_at?: string
          currency?: string | null
          description?: string | null
          display_name?: string
          features?: Json
          id?: string
          is_active?: boolean
          max_students?: number | null
          max_teachers?: number | null
          name?: string
          price_annual?: number | null
          price_monthly?: number | null
          sort_order?: number
          stripe_price_id?: string | null
          stripe_product_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      platform_ai_controls: {
        Row: {
          ai_globally_enabled: boolean
          feature_toggles: Json
          id: string
          kill_switch_activated_at: string | null
          kill_switch_activated_by: string | null
          kill_switch_active: boolean
          kill_switch_reason: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          ai_globally_enabled?: boolean
          feature_toggles?: Json
          id?: string
          kill_switch_activated_at?: string | null
          kill_switch_activated_by?: string | null
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          ai_globally_enabled?: boolean
          feature_toggles?: Json
          id?: string
          kill_switch_activated_at?: string | null
          kill_switch_activated_by?: string | null
          kill_switch_active?: boolean
          kill_switch_reason?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_ai_controls_kill_switch_activated_by_fkey"
            columns: ["kill_switch_activated_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_ai_controls_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_audit_logs: {
        Row: {
          action: Database["public"]["Enums"]["platform_audit_action"]
          actor_id: string
          created_at: string
          id: string
          ip_address: string | null
          new_state: Json | null
          previous_state: Json | null
          reason: string | null
          target_school_id: string | null
          target_subscription_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: Database["public"]["Enums"]["platform_audit_action"]
          actor_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          target_school_id?: string | null
          target_subscription_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: Database["public"]["Enums"]["platform_audit_action"]
          actor_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_state?: Json | null
          previous_state?: Json | null
          reason?: string | null
          target_school_id?: string | null
          target_subscription_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_audit_logs_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_target_school_id_fkey"
            columns: ["target_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "platform_audit_logs_target_subscription_id_fkey"
            columns: ["target_subscription_id"]
            isOneToOne: false
            referencedRelation: "school_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      practice_sessions: {
        Row: {
          class_id: string
          completed_at: string | null
          created_at: string
          id: string
          session_length_minutes: number | null
          student_id: string
        }
        Insert: {
          class_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          session_length_minutes?: number | null
          student_id: string
        }
        Update: {
          class_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          session_length_minutes?: number | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_violations: {
        Row: {
          created_at: string
          current_count: number
          feature_type: string
          id: string
          limit_type: string
          limit_value: number
          school_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          current_count: number
          feature_type: string
          id?: string
          limit_type: string
          limit_value: number
          school_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          current_count?: number
          feature_type?: string
          id?: string
          limit_type?: string
          limit_value?: number
          school_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rate_limit_violations_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      restore_jobs: {
        Row: {
          backup_id: string
          completed_at: string | null
          confirmed_at: string | null
          confirmed_by: string | null
          created_at: string
          error_message: string | null
          id: string
          impact_summary: Json | null
          initiated_by: string
          preview_summary: Json | null
          records_restored: Json | null
          scope: Database["public"]["Enums"]["backup_scope"]
          started_at: string | null
          status: Database["public"]["Enums"]["restore_status"]
          target_class_id: string | null
          target_school_id: string | null
          target_student_id: string | null
        }
        Insert: {
          backup_id: string
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          impact_summary?: Json | null
          initiated_by: string
          preview_summary?: Json | null
          records_restored?: Json | null
          scope: Database["public"]["Enums"]["backup_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["restore_status"]
          target_class_id?: string | null
          target_school_id?: string | null
          target_student_id?: string | null
        }
        Update: {
          backup_id?: string
          completed_at?: string | null
          confirmed_at?: string | null
          confirmed_by?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          impact_summary?: Json | null
          initiated_by?: string
          preview_summary?: Json | null
          records_restored?: Json | null
          scope?: Database["public"]["Enums"]["backup_scope"]
          started_at?: string | null
          status?: Database["public"]["Enums"]["restore_status"]
          target_class_id?: string | null
          target_school_id?: string | null
          target_student_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restore_jobs_backup_id_fkey"
            columns: ["backup_id"]
            isOneToOne: false
            referencedRelation: "backups"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_jobs_target_class_id_fkey"
            columns: ["target_class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_jobs_target_school_id_fkey"
            columns: ["target_school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restore_jobs_target_student_id_fkey"
            columns: ["target_student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      rollout_phase_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_phase: Database["public"]["Enums"]["rollout_phase"] | null
          id: string
          reason: string | null
          school_id: string
          to_phase: Database["public"]["Enums"]["rollout_phase"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_phase?: Database["public"]["Enums"]["rollout_phase"] | null
          id?: string
          reason?: string | null
          school_id: string
          to_phase: Database["public"]["Enums"]["rollout_phase"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_phase?: Database["public"]["Enums"]["rollout_phase"] | null
          id?: string
          reason?: string | null
          school_id?: string
          to_phase?: Database["public"]["Enums"]["rollout_phase"]
        }
        Relationships: [
          {
            foreignKeyName: "rollout_phase_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admin_metrics: {
        Row: {
          active_classes_count: number | null
          active_teachers_count: number | null
          adaptive_plans_generated_count: number | null
          created_at: string | null
          id: string
          last_calculated_at: string | null
          parent_insights_approved_count: number | null
          school_id: string
          updated_at: string | null
          uploads_this_term: number | null
        }
        Insert: {
          active_classes_count?: number | null
          active_teachers_count?: number | null
          adaptive_plans_generated_count?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          parent_insights_approved_count?: number | null
          school_id: string
          updated_at?: string | null
          uploads_this_term?: number | null
        }
        Update: {
          active_classes_count?: number | null
          active_teachers_count?: number | null
          adaptive_plans_generated_count?: number | null
          created_at?: string | null
          id?: string
          last_calculated_at?: string | null
          parent_insights_approved_count?: number | null
          school_id?: string
          updated_at?: string | null
          uploads_this_term?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_admin_metrics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_admin_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string | null
          current_step: number | null
          id: string
          school_id: string
          steps_completed: Json | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          school_id: string
          steps_completed?: Json | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          current_step?: number | null
          id?: string
          school_id?: string
          steps_completed?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_admin_onboarding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_ai_controls: {
        Row: {
          ai_enabled: boolean | null
          allowed_features: string[] | null
          enabled_classes: string[] | null
          enabled_grades: string[] | null
          id: string
          pause_reason: string | null
          paused_until: string | null
          school_id: string
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          ai_enabled?: boolean | null
          allowed_features?: string[] | null
          enabled_classes?: string[] | null
          enabled_grades?: string[] | null
          id?: string
          pause_reason?: string | null
          paused_until?: string | null
          school_id: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          ai_enabled?: boolean | null
          allowed_features?: string[] | null
          enabled_classes?: string[] | null
          enabled_grades?: string[] | null
          id?: string
          pause_reason?: string | null
          paused_until?: string | null
          school_id?: string
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_ai_controls_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_change_logs: {
        Row: {
          change_description: string
          change_type: string
          changed_by: string | null
          created_at: string
          id: string
          new_value: Json | null
          previous_value: Json | null
          rollout_phase: Database["public"]["Enums"]["rollout_phase"] | null
          school_id: string
        }
        Insert: {
          change_description: string
          change_type: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          rollout_phase?: Database["public"]["Enums"]["rollout_phase"] | null
          school_id: string
        }
        Update: {
          change_description?: string
          change_type?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          previous_value?: Json | null
          rollout_phase?: Database["public"]["Enums"]["rollout_phase"] | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_change_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_rollout_status: {
        Row: {
          advanced_by: string | null
          created_at: string
          current_phase: Database["public"]["Enums"]["rollout_phase"]
          id: string
          notes: string | null
          phase_started_at: string
          school_id: string
          updated_at: string
        }
        Insert: {
          advanced_by?: string | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["rollout_phase"]
          id?: string
          notes?: string | null
          phase_started_at?: string
          school_id: string
          updated_at?: string
        }
        Update: {
          advanced_by?: string | null
          created_at?: string
          current_phase?: Database["public"]["Enums"]["rollout_phase"]
          id?: string
          notes?: string | null
          phase_started_at?: string
          school_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_rollout_status_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_subscriptions: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string
          expires_at: string | null
          id: string
          notes: string | null
          plan_id: string
          school_id: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          suspended_at: string | null
          suspended_by: string | null
          suspension_reason: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id: string
          school_id: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          plan_id?: string
          school_id?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          suspended_at?: string | null
          suspended_by?: string | null
          suspension_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_subscriptions_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: true
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_subscriptions_suspended_by_fkey"
            columns: ["suspended_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      school_system_history: {
        Row: {
          action_description: string
          action_type: string
          created_at: string | null
          id: string
          new_state: Json | null
          performed_by: string
          performed_by_role: string | null
          previous_state: Json | null
          school_id: string
        }
        Insert: {
          action_description: string
          action_type: string
          created_at?: string | null
          id?: string
          new_state?: Json | null
          performed_by: string
          performed_by_role?: string | null
          previous_state?: Json | null
          school_id: string
        }
        Update: {
          action_description?: string
          action_type?: string
          created_at?: string | null
          id?: string
          new_state?: Json | null
          performed_by?: string
          performed_by_role?: string | null
          previous_state?: Json | null
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "school_system_history_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      school_usage_metrics: {
        Row: {
          adaptive_support_plans_generated: number
          ai_generations: number
          created_at: string
          id: string
          month_year: string
          parent_insights_generated: number
          school_id: string
          total_students: number
          total_teachers: number
          updated_at: string
          uploads_analyzed: number
        }
        Insert: {
          adaptive_support_plans_generated?: number
          ai_generations?: number
          created_at?: string
          id?: string
          month_year: string
          parent_insights_generated?: number
          school_id: string
          total_students?: number
          total_teachers?: number
          updated_at?: string
          uploads_analyzed?: number
        }
        Update: {
          adaptive_support_plans_generated?: number
          ai_generations?: number
          created_at?: string
          id?: string
          month_year?: string
          parent_insights_generated?: number
          school_id?: string
          total_students?: number
          total_teachers?: number
          updated_at?: string
          uploads_analyzed?: number
        }
        Relationships: [
          {
            foreignKeyName: "school_usage_metrics_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          archived_at: string | null
          archived_by: string | null
          billing_end_date: string | null
          billing_notes: string | null
          billing_start_date: string
          billing_status: Database["public"]["Enums"]["billing_status"]
          created_at: string
          id: string
          is_archived: boolean
          is_pilot: boolean | null
          name: string
          pilot_completed_at: string | null
          pilot_notes: string | null
          pilot_started_at: string | null
          plan: Database["public"]["Enums"]["saas_plan"]
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          archived_by?: string | null
          billing_end_date?: string | null
          billing_notes?: string | null
          billing_start_date?: string
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pilot?: boolean | null
          name: string
          pilot_completed_at?: string | null
          pilot_notes?: string | null
          pilot_started_at?: string | null
          plan?: Database["public"]["Enums"]["saas_plan"]
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          archived_by?: string | null
          billing_end_date?: string | null
          billing_notes?: string | null
          billing_start_date?: string
          billing_status?: Database["public"]["Enums"]["billing_status"]
          created_at?: string
          id?: string
          is_archived?: boolean
          is_pilot?: boolean | null
          name?: string
          pilot_completed_at?: string | null
          pilot_notes?: string | null
          pilot_started_at?: string | null
          plan?: Database["public"]["Enums"]["saas_plan"]
          updated_at?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          school_id: string | null
          severity: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          school_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          school_id?: string | null
          severity?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "security_events_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_assignments: {
        Row: {
          assigned_amount: number
          created_at: string
          discount_amount: number | null
          discount_reason: string | null
          fee_structure_id: string
          id: string
          notes: string | null
          student_id: string
          updated_at: string
          waived: boolean
          waiver_approved_by: string | null
          waiver_reason: string | null
        }
        Insert: {
          assigned_amount: number
          created_at?: string
          discount_amount?: number | null
          discount_reason?: string | null
          fee_structure_id: string
          id?: string
          notes?: string | null
          student_id: string
          updated_at?: string
          waived?: boolean
          waiver_approved_by?: string | null
          waiver_reason?: string | null
        }
        Update: {
          assigned_amount?: number
          created_at?: string
          discount_amount?: number | null
          discount_reason?: string | null
          fee_structure_id?: string
          id?: string
          notes?: string | null
          student_id?: string
          updated_at?: string
          waived?: boolean
          waiver_approved_by?: string | null
          waiver_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_assignments_fee_structure_id_fkey"
            columns: ["fee_structure_id"]
            isOneToOne: false
            referencedRelation: "fee_structures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "student_fee_assignments_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_fee_balances: {
        Row: {
          academic_year: number
          balance: number
          id: string
          last_calculated_at: string
          last_payment_date: string | null
          student_id: string
          term: number | null
          total_fees: number
          total_paid: number
          total_waived: number
        }
        Insert: {
          academic_year: number
          balance?: number
          id?: string
          last_calculated_at?: string
          last_payment_date?: string | null
          student_id: string
          term?: number | null
          total_fees?: number
          total_paid?: number
          total_waived?: number
        }
        Update: {
          academic_year?: number
          balance?: number
          id?: string
          last_calculated_at?: string
          last_payment_date?: string | null
          student_id?: string
          term?: number | null
          total_fees?: number
          total_paid?: number
          total_waived?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_fee_balances_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      student_intervention_plans: {
        Row: {
          class_id: string
          confidence_support_notes: string | null
          created_at: string
          focus_areas: string[]
          generated_at: string
          id: string
          recommended_practice_types: string[]
          source_window_days: number
          student_id: string
          support_strategies: string[]
          teacher_acknowledged: boolean
          updated_at: string
        }
        Insert: {
          class_id: string
          confidence_support_notes?: string | null
          created_at?: string
          focus_areas?: string[]
          generated_at?: string
          id?: string
          recommended_practice_types?: string[]
          source_window_days?: number
          student_id: string
          support_strategies?: string[]
          teacher_acknowledged?: boolean
          updated_at?: string
        }
        Update: {
          class_id?: string
          confidence_support_notes?: string | null
          created_at?: string
          focus_areas?: string[]
          generated_at?: string
          id?: string
          recommended_practice_types?: string[]
          source_window_days?: number
          student_id?: string
          support_strategies?: string[]
          teacher_acknowledged?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      student_learning_paths: {
        Row: {
          class_id: string
          created_at: string
          focus_topics: string[]
          generated_at: string
          id: string
          pacing_notes: string | null
          student_id: string
          suggested_activities: string[]
          teacher_acknowledged: boolean
          updated_at: string
        }
        Insert: {
          class_id: string
          created_at?: string
          focus_topics?: string[]
          generated_at?: string
          id?: string
          pacing_notes?: string | null
          student_id: string
          suggested_activities?: string[]
          teacher_acknowledged?: boolean
          updated_at?: string
        }
        Update: {
          class_id?: string
          created_at?: string
          focus_topics?: string[]
          generated_at?: string
          id?: string
          pacing_notes?: string | null
          student_id?: string
          suggested_activities?: string[]
          teacher_acknowledged?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      student_learning_profiles: {
        Row: {
          confidence_trend:
            | Database["public"]["Enums"]["confidence_trend"]
            | null
          created_at: string
          error_patterns: Json | null
          id: string
          last_updated: string
          strengths: string | null
          student_id: string
          weak_topics: string[] | null
        }
        Insert: {
          confidence_trend?:
            | Database["public"]["Enums"]["confidence_trend"]
            | null
          created_at?: string
          error_patterns?: Json | null
          id?: string
          last_updated?: string
          strengths?: string | null
          student_id: string
          weak_topics?: string[] | null
        }
        Update: {
          confidence_trend?:
            | Database["public"]["Enums"]["confidence_trend"]
            | null
          created_at?: string
          error_patterns?: Json | null
          id?: string
          last_updated?: string
          strengths?: string | null
          student_id?: string
          weak_topics?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "student_learning_profiles_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: true
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar_url: string | null
          class_id: string | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          name: string
          student_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name: string
          student_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          name?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string
          created_by: string | null
          email: string
          id: string
          is_active: boolean
          name: string | null
          notes: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          is_active?: boolean
          name?: string | null
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      system_environment: {
        Row: {
          debug_mode_enabled: boolean
          deployed_at: string | null
          environment: string
          hide_experimental_features: boolean | null
          id: string
          is_production: boolean
          rate_limit_multiplier: number | null
          schema_locked: boolean | null
          updated_at: string
          updated_by: string | null
          version_tag: string | null
        }
        Insert: {
          debug_mode_enabled?: boolean
          deployed_at?: string | null
          environment?: string
          hide_experimental_features?: boolean | null
          id?: string
          is_production?: boolean
          rate_limit_multiplier?: number | null
          schema_locked?: boolean | null
          updated_at?: string
          updated_by?: string | null
          version_tag?: string | null
        }
        Update: {
          debug_mode_enabled?: boolean
          deployed_at?: string | null
          environment?: string
          hide_experimental_features?: boolean | null
          id?: string
          is_production?: boolean
          rate_limit_multiplier?: number | null
          schema_locked?: boolean | null
          updated_at?: string
          updated_by?: string | null
          version_tag?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_environment_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "super_admins"
            referencedColumns: ["id"]
          },
        ]
      }
      system_recovery_mode: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          emergency_admin_enabled: boolean
          expected_resolution: string | null
          id: string
          is_active: boolean
          read_only_mode: boolean
          reason: string | null
          updated_at: string
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          emergency_admin_enabled?: boolean
          expected_resolution?: string | null
          id?: string
          is_active?: boolean
          read_only_mode?: boolean
          reason?: string | null
          updated_at?: string
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          emergency_admin_enabled?: boolean
          expected_resolution?: string | null
          id?: string
          is_active?: boolean
          read_only_mode?: boolean
          reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      system_status: {
        Row: {
          component: string
          created_at: string | null
          id: string
          incident_resolved_at: string | null
          incident_started_at: string | null
          last_checked_at: string | null
          message: string | null
          status: string
        }
        Insert: {
          component: string
          created_at?: string | null
          id?: string
          incident_resolved_at?: string | null
          incident_started_at?: string | null
          last_checked_at?: string | null
          message?: string | null
          status?: string
        }
        Update: {
          component?: string
          created_at?: string | null
          id?: string
          incident_resolved_at?: string | null
          incident_started_at?: string | null
          last_checked_at?: string | null
          message?: string | null
          status?: string
        }
        Relationships: []
      }
      teacher_action_logs: {
        Row: {
          action_taken: string
          class_id: string
          created_at: string
          id: string
          reflection_notes: string | null
          topic: string | null
          upload_id: string | null
        }
        Insert: {
          action_taken: string
          class_id: string
          created_at?: string
          id?: string
          reflection_notes?: string | null
          topic?: string | null
          upload_id?: string | null
        }
        Update: {
          action_taken?: string
          class_id?: string
          created_at?: string
          id?: string
          reflection_notes?: string | null
          topic?: string | null
          upload_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_action_logs_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_action_logs_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_class_assignments: {
        Row: {
          class_id: string
          created_at: string | null
          id: string
          is_primary: boolean | null
          teacher_account_id: string
        }
        Insert: {
          class_id: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          teacher_account_id: string
        }
        Update: {
          class_id?: string
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          teacher_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_class_assignments_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_class_assignments_teacher_account_id_fkey"
            columns: ["teacher_account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_feature_first_use: {
        Row: {
          feature_key: string
          first_used_at: string
          id: string
          teacher_id: string
          time_since_signup_hours: number | null
        }
        Insert: {
          feature_key: string
          first_used_at?: string
          id?: string
          teacher_id: string
          time_since_signup_hours?: number | null
        }
        Update: {
          feature_key?: string
          first_used_at?: string
          id?: string
          teacher_id?: string
          time_since_signup_hours?: number | null
        }
        Relationships: []
      }
      teacher_feedback: {
        Row: {
          admin_notes: string | null
          created_at: string
          feature_area: string | null
          feedback_type: string
          id: string
          message: string
          resolved_at: string | null
          resolved_by: string | null
          school_id: string
          status: string | null
          teacher_account_id: string | null
          updated_at: string
          urgency: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          feature_area?: string | null
          feedback_type: string
          id?: string
          message: string
          resolved_at?: string | null
          resolved_by?: string | null
          school_id: string
          status?: string | null
          teacher_account_id?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          feature_area?: string | null
          feedback_type?: string
          id?: string
          message?: string
          resolved_at?: string | null
          resolved_by?: string | null
          school_id?: string
          status?: string | null
          teacher_account_id?: string | null
          updated_at?: string
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_feedback_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teacher_feedback_teacher_account_id_fkey"
            columns: ["teacher_account_id"]
            isOneToOne: false
            referencedRelation: "user_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_onboarding: {
        Row: {
          completed_at: string | null
          created_at: string
          current_step: number
          id: string
          school_id: string | null
          skipped: boolean | null
          started_at: string
          teacher_id: string
          total_steps: number
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          school_id?: string | null
          skipped?: boolean | null
          started_at?: string
          teacher_id: string
          total_steps?: number
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_step?: number
          id?: string
          school_id?: string | null
          skipped?: boolean | null
          started_at?: string
          teacher_id?: string
          total_steps?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_onboarding_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_quick_feedback: {
        Row: {
          admin_notes: string | null
          feature_area: string | null
          feedback_type: string
          id: string
          message: string
          reviewed_at: string | null
          reviewed_by: string | null
          school_id: string | null
          submitted_at: string
          teacher_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          feature_area?: string | null
          feedback_type: string
          id?: string
          message: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          submitted_at?: string
          teacher_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          feature_area?: string | null
          feedback_type?: string
          id?: string
          message?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id?: string | null
          submitted_at?: string
          teacher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teacher_quick_feedback_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_training_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          module_id: string
          progress_percent: number
          started_at: string
          teacher_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id: string
          progress_percent?: number
          started_at?: string
          teacher_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          module_id?: string
          progress_percent?: number
          started_at?: string
          teacher_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teacher_training_progress_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "training_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      term_report_exports: {
        Row: {
          export_format: string
          exported_at: string
          exported_by: string
          file_url: string | null
          id: string
          notes: string | null
          term_report_id: string
        }
        Insert: {
          export_format: string
          exported_at?: string
          exported_by: string
          file_url?: string | null
          id?: string
          notes?: string | null
          term_report_id: string
        }
        Update: {
          export_format?: string
          exported_at?: string
          exported_by?: string
          file_url?: string | null
          id?: string
          notes?: string | null
          term_report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "term_report_exports_term_report_id_fkey"
            columns: ["term_report_id"]
            isOneToOne: false
            referencedRelation: "term_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      term_reports: {
        Row: {
          academic_year: string
          active_classes_count: number
          active_teachers_count: number
          adaptive_plans_generated: number
          admin_notes: string | null
          ai_suggestions_used_count: number
          common_subjects_engaged: Json | null
          created_at: string
          emerging_adoption_areas: Json | null
          end_date: string
          finalized_at: string | null
          finalized_by: string | null
          generated_at: string | null
          generated_by: string | null
          id: string
          least_used_features: Json | null
          most_used_features: Json | null
          parent_insights_approved: number
          parent_insights_count: number
          school_id: string
          start_date: string
          status: string
          support_plans_count: number
          term_name: string
          term_number: number
          updated_at: string
          uploads_analyzed_count: number
        }
        Insert: {
          academic_year: string
          active_classes_count?: number
          active_teachers_count?: number
          adaptive_plans_generated?: number
          admin_notes?: string | null
          ai_suggestions_used_count?: number
          common_subjects_engaged?: Json | null
          created_at?: string
          emerging_adoption_areas?: Json | null
          end_date: string
          finalized_at?: string | null
          finalized_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          least_used_features?: Json | null
          most_used_features?: Json | null
          parent_insights_approved?: number
          parent_insights_count?: number
          school_id: string
          start_date: string
          status?: string
          support_plans_count?: number
          term_name: string
          term_number: number
          updated_at?: string
          uploads_analyzed_count?: number
        }
        Update: {
          academic_year?: string
          active_classes_count?: number
          active_teachers_count?: number
          adaptive_plans_generated?: number
          admin_notes?: string | null
          ai_suggestions_used_count?: number
          common_subjects_engaged?: Json | null
          created_at?: string
          emerging_adoption_areas?: Json | null
          end_date?: string
          finalized_at?: string | null
          finalized_by?: string | null
          generated_at?: string | null
          generated_by?: string | null
          id?: string
          least_used_features?: Json | null
          most_used_features?: Json | null
          parent_insights_approved?: number
          parent_insights_count?: number
          school_id?: string
          start_date?: string
          status?: string
          support_plans_count?: number
          term_name?: string
          term_number?: number
          updated_at?: string
          uploads_analyzed_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "term_reports_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      training_modules: {
        Row: {
          category: string
          content: Json
          created_at: string
          description: string
          duration_minutes: number
          id: string
          is_active: boolean | null
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          category: string
          content?: Json
          created_at?: string
          description: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: string
          content?: Json
          created_at?: string
          description?: string
          duration_minutes?: number
          id?: string
          is_active?: boolean | null
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      upload_analyses: {
        Row: {
          analyzed_at: string | null
          class_id: string
          class_summary: Json | null
          created_at: string
          error_message: string | null
          id: string
          status: string
          student_diagnostics: Json | null
          updated_at: string
          upload_id: string
        }
        Insert: {
          analyzed_at?: string | null
          class_id: string
          class_summary?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          student_diagnostics?: Json | null
          updated_at?: string
          upload_id: string
        }
        Update: {
          analyzed_at?: string | null
          class_id?: string
          class_summary?: Json | null
          created_at?: string
          error_message?: string | null
          id?: string
          status?: string
          student_diagnostics?: Json | null
          updated_at?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_analyses_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_analyses_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: true
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      upload_students: {
        Row: {
          created_at: string
          id: string
          student_id: string
          upload_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          student_id: string
          upload_id: string
        }
        Update: {
          created_at?: string
          id?: string
          student_id?: string
          upload_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "upload_students_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "upload_students_upload_id_fkey"
            columns: ["upload_id"]
            isOneToOne: false
            referencedRelation: "uploads"
            referencedColumns: ["id"]
          },
        ]
      }
      uploads: {
        Row: {
          class_id: string
          created_at: string
          date: string
          deleted_at: string | null
          deleted_by: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id: string
          marking_scheme: string | null
          subject: string
          topic: string
          updated_at: string
          upload_type: string
          uploaded_by: string | null
        }
        Insert: {
          class_id: string
          created_at?: string
          date: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name: string
          file_size: number
          file_type: string
          file_url: string
          id?: string
          marking_scheme?: string | null
          subject: string
          topic: string
          updated_at?: string
          upload_type: string
          uploaded_by?: string | null
        }
        Update: {
          class_id?: string
          created_at?: string
          date?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_name?: string
          file_size?: number
          file_type?: string
          file_url?: string
          id?: string
          marking_scheme?: string | null
          subject?: string
          topic?: string
          updated_at?: string
          upload_type?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploads_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      usage_audit_logs: {
        Row: {
          action_type: string
          created_at: string
          current_usage: number | null
          details: Json | null
          id: string
          limit_value: number | null
          metric_type: string
          plan: string
          school_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          current_usage?: number | null
          details?: Json | null
          id?: string
          limit_value?: number | null
          metric_type: string
          plan: string
          school_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          current_usage?: number | null
          details?: Json | null
          id?: string
          limit_value?: number | null
          metric_type?: string
          plan?: string
          school_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usage_audit_logs_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_accounts: {
        Row: {
          activated_at: string | null
          activated_by: string | null
          created_at: string | null
          email: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          is_activated: boolean | null
          name: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          email: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          is_activated?: boolean | null
          name: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          activated_at?: string | null
          activated_by?: string | null
          created_at?: string | null
          email?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          is_activated?: boolean | null
          name?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_accounts_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          school_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          school_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      student_learning_timeline: {
        Row: {
          class_id: string | null
          event_date: string | null
          event_type: string | null
          metadata: Json | null
          student_id: string | null
          summary_text: string | null
          timeline_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      advance_rollout_phase: {
        Args: { p_reason?: string; p_school_id: string }
        Returns: Database["public"]["Enums"]["rollout_phase"]
      }
      approve_and_lock_message: {
        Args: { p_message_id: string; p_reason?: string }
        Returns: Json
      }
      approve_guardian_link: {
        Args: {
          p_request_id: string
          p_review_notes?: string
          p_send_confirmation?: boolean
        }
        Returns: boolean
      }
      can_access_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_student: {
        Args: { _student_id: string; _user_id: string }
        Returns: boolean
      }
      can_send_to_parent: {
        Args: {
          p_category: Database["public"]["Enums"]["message_category"]
          p_is_emergency?: boolean
          p_parent_contact_id: string
        }
        Returns: Json
      }
      check_relink_warning: {
        Args: { p_guardian_id: string; p_student_id: string }
        Returns: Json
      }
      confirm_guardian_link: {
        Args: { p_confirmation_code: string; p_request_id: string }
        Returns: boolean
      }
      create_audit_log: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_type: Database["public"]["Enums"]["audit_actor_type"]
          p_entity_id: string
          p_entity_type: string
          p_environment?: string
          p_metadata?: Json
          p_summary: string
        }
        Returns: string
      }
      edit_message_draft: {
        Args: {
          p_change_summary?: string
          p_message_id: string
          p_new_body: string
          p_new_subject: string
        }
        Returns: Json
      }
      generate_audit_hash: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_type: string
          p_created_at: string
          p_entity_id: string
          p_entity_type: string
          p_environment: string
          p_metadata: Json
          p_previous_hash: string
          p_summary: string
        }
        Returns: string
      }
      generate_backup_version_id: { Args: never; Returns: string }
      generate_term_report_data: {
        Args: { p_end_date: string; p_school_id: string; p_start_date: string }
        Returns: Json
      }
      get_guardian_accessible_students: {
        Args: { _guardian_id: string }
        Returns: {
          permission_tier: Database["public"]["Enums"]["parent_permission_tier"]
          student_id: string
        }[]
      }
      get_next_queued_message: {
        Args: { p_school_id?: string }
        Returns: {
          channel: Database["public"]["Enums"]["delivery_channel"]
          message_id: string
          priority: number
          recipient_contact: Json
          retry_count: number
        }[]
      }
      get_or_create_usage_metrics: {
        Args: { p_school_id: string }
        Returns: string
      }
      get_parent_delivery_channel: {
        Args: { p_parent_contact_id: string }
        Returns: Database["public"]["Enums"]["delivery_channel"]
      }
      get_parent_permission_tier: {
        Args: { _guardian_id: string; _student_id: string }
        Returns: Database["public"]["Enums"]["parent_permission_tier"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_school_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _school_id: string
          _user_id: string
        }
        Returns: boolean
      }
      increment_usage_metric: {
        Args: { p_limit: number; p_metric: string; p_school_id: string }
        Returns: Json
      }
      initialize_communication_rules: {
        Args: { p_school_id: string }
        Returns: undefined
      }
      initiate_guardian_link: {
        Args: {
          p_confirmation_method?: string
          p_duration_type: Database["public"]["Enums"]["link_duration"]
          p_expires_at?: string
          p_guardian_id: string
          p_permission_tier: Database["public"]["Enums"]["parent_permission_tier"]
          p_relationship_type: Database["public"]["Enums"]["guardian_role"]
          p_requires_confirmation?: boolean
          p_student_id: string
          p_verification_notes?: string
        }
        Returns: string
      }
      is_ai_enabled_for_school: {
        Args: { p_school_id: string }
        Returns: boolean
      }
      is_school_admin: {
        Args: { _school_id: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      log_guardian_link_change: {
        Args: {
          p_action: string
          p_guardian_id: string
          p_link_request_id: string
          p_metadata?: Json
          p_new_status: Database["public"]["Enums"]["link_request_status"]
          p_performed_by: string
          p_performed_by_role: string
          p_previous_status: Database["public"]["Enums"]["link_request_status"]
          p_reason?: string
          p_student_id: string
        }
        Returns: string
      }
      log_preference_change: {
        Args: {
          p_change_type: string
          p_changed_by: string
          p_changed_by_role: string
          p_new_value: Json
          p_parent_contact_id: string
          p_previous_value: Json
          p_reason?: string
        }
        Returns: string
      }
      log_school_history: {
        Args: {
          p_action_description: string
          p_action_type: string
          p_new_state?: Json
          p_previous_state?: Json
          p_school_id: string
        }
        Returns: string
      }
      parent_can_access: {
        Args: { _feature: string; _guardian_id: string; _student_id: string }
        Returns: boolean
      }
      pause_pilot_school_ai: {
        Args: { p_reason: string; p_school_id: string }
        Returns: boolean
      }
      record_delivery_attempt: {
        Args: {
          p_channel: Database["public"]["Enums"]["delivery_channel"]
          p_error_code?: string
          p_error_message?: string
          p_latency_ms?: number
          p_message_id: string
          p_provider_response?: Json
          p_succeeded: boolean
        }
        Returns: string
      }
      recover_guardian_link: {
        Args: { p_reason: string; p_retention_id: string }
        Returns: Json
      }
      reject_guardian_link: {
        Args: { p_reason: string; p_request_id: string }
        Returns: boolean
      }
      reject_message_with_reason: {
        Args: { p_message_id: string; p_reason: string }
        Returns: Json
      }
      restore_student: { Args: { p_student_id: string }; Returns: boolean }
      resume_pilot_school_ai: {
        Args: { p_school_id: string }
        Returns: boolean
      }
      revoke_guardian_link: {
        Args: { p_reason: string; p_request_id: string }
        Returns: boolean
      }
      schedule_message_retry: {
        Args: { p_base_delay_seconds?: number; p_message_id: string }
        Returns: string
      }
      school_at_phase_or_later: {
        Args: {
          p_min_phase: Database["public"]["Enums"]["rollout_phase"]
          p_school_id: string
        }
        Returns: boolean
      }
      soft_delete_student: {
        Args: { p_deleted_by: string; p_student_id: string }
        Returns: boolean
      }
      submit_message_for_approval: {
        Args: { p_message_id: string }
        Returns: Json
      }
      sync_offline_queue: { Args: { p_school_id: string }; Returns: number }
      unlink_guardian_student: {
        Args: {
          p_guardian_id: string
          p_is_mislink?: boolean
          p_reason: string
          p_student_id: string
        }
        Returns: Json
      }
      verify_audit_chain: {
        Args: { p_environment: string }
        Returns: {
          actual_hash: string
          broken_at: string
          expected_hash: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role:
        | "platform_admin"
        | "school_admin"
        | "teacher"
        | "parent"
        | "student"
      audit_actor_type: "system" | "admin" | "teacher" | "ai_agent"
      backup_scope: "system" | "school" | "class" | "student"
      backup_status: "pending" | "in_progress" | "completed" | "failed"
      backup_type: "full" | "incremental" | "manual"
      billing_event_type:
        | "manual_activation"
        | "plan_change"
        | "extension"
        | "credit"
        | "suspension"
        | "reinstatement"
        | "downgrade"
        | "stripe_payment"
        | "stripe_refund"
      billing_status: "active" | "trial" | "suspended"
      compliance_mode: "standard" | "strict"
      confidence_trend: "increasing" | "stable" | "declining"
      delivery_channel: "whatsapp" | "sms" | "email"
      delivery_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "failed"
        | "no_channel"
      fee_frequency: "term" | "annual" | "once_off"
      guardian_role:
        | "primary_guardian"
        | "secondary_guardian"
        | "informational_contact"
      link_duration:
        | "permanent"
        | "temporary_term"
        | "temporary_year"
        | "temporary_custom"
      link_request_status:
        | "pending_review"
        | "pending_confirmation"
        | "confirmed"
        | "activated"
        | "rejected"
        | "expired"
        | "revoked"
      message_category:
        | "learning_update"
        | "attendance_notice"
        | "fee_status"
        | "school_announcement"
        | "emergency_notice"
      parent_permission_tier: "view_only" | "view_notifications" | "full_access"
      payment_method:
        | "cash"
        | "bank_deposit"
        | "mobile_money"
        | "cheque"
        | "other"
      payment_status: "pending" | "confirmed" | "cancelled" | "refunded"
      platform_audit_action:
        | "plan_activated"
        | "plan_changed"
        | "school_suspended"
        | "school_reinstated"
        | "subscription_extended"
        | "ai_toggle_changed"
        | "ai_kill_switch_activated"
        | "ai_kill_switch_deactivated"
        | "super_admin_action"
        | "override_applied"
        | "school_archived"
        | "feature_flag_changed"
        | "deployment_initiated"
        | "rollback_executed"
        | "environment_changed"
      restore_status:
        | "pending"
        | "previewing"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "failed"
        | "cancelled"
      rollout_phase:
        | "phase_0_setup"
        | "phase_1_teachers"
        | "phase_2_students"
        | "phase_3_ai_suggestions"
        | "phase_4_parent_insights"
        | "completed"
      saas_plan: "basic" | "standard" | "premium" | "enterprise"
      subscription_status: "active" | "suspended" | "expired" | "pending"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "platform_admin",
        "school_admin",
        "teacher",
        "parent",
        "student",
      ],
      audit_actor_type: ["system", "admin", "teacher", "ai_agent"],
      backup_scope: ["system", "school", "class", "student"],
      backup_status: ["pending", "in_progress", "completed", "failed"],
      backup_type: ["full", "incremental", "manual"],
      billing_event_type: [
        "manual_activation",
        "plan_change",
        "extension",
        "credit",
        "suspension",
        "reinstatement",
        "downgrade",
        "stripe_payment",
        "stripe_refund",
      ],
      billing_status: ["active", "trial", "suspended"],
      compliance_mode: ["standard", "strict"],
      confidence_trend: ["increasing", "stable", "declining"],
      delivery_channel: ["whatsapp", "sms", "email"],
      delivery_status: [
        "pending",
        "queued",
        "sent",
        "delivered",
        "failed",
        "no_channel",
      ],
      fee_frequency: ["term", "annual", "once_off"],
      guardian_role: [
        "primary_guardian",
        "secondary_guardian",
        "informational_contact",
      ],
      link_duration: [
        "permanent",
        "temporary_term",
        "temporary_year",
        "temporary_custom",
      ],
      link_request_status: [
        "pending_review",
        "pending_confirmation",
        "confirmed",
        "activated",
        "rejected",
        "expired",
        "revoked",
      ],
      message_category: [
        "learning_update",
        "attendance_notice",
        "fee_status",
        "school_announcement",
        "emergency_notice",
      ],
      parent_permission_tier: [
        "view_only",
        "view_notifications",
        "full_access",
      ],
      payment_method: [
        "cash",
        "bank_deposit",
        "mobile_money",
        "cheque",
        "other",
      ],
      payment_status: ["pending", "confirmed", "cancelled", "refunded"],
      platform_audit_action: [
        "plan_activated",
        "plan_changed",
        "school_suspended",
        "school_reinstated",
        "subscription_extended",
        "ai_toggle_changed",
        "ai_kill_switch_activated",
        "ai_kill_switch_deactivated",
        "super_admin_action",
        "override_applied",
        "school_archived",
        "feature_flag_changed",
        "deployment_initiated",
        "rollback_executed",
        "environment_changed",
      ],
      restore_status: [
        "pending",
        "previewing",
        "confirmed",
        "in_progress",
        "completed",
        "failed",
        "cancelled",
      ],
      rollout_phase: [
        "phase_0_setup",
        "phase_1_teachers",
        "phase_2_students",
        "phase_3_ai_suggestions",
        "phase_4_parent_insights",
        "completed",
      ],
      saas_plan: ["basic", "standard", "premium", "enterprise"],
      subscription_status: ["active", "suspended", "expired", "pending"],
    },
  },
} as const
