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
      can_access_class: {
        Args: { _class_id: string; _user_id: string }
        Returns: boolean
      }
      can_access_student: {
        Args: { _student_id: string; _user_id: string }
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
      get_or_create_usage_metrics: {
        Args: { p_school_id: string }
        Returns: string
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
      is_ai_enabled_for_school: {
        Args: { p_school_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      pause_pilot_school_ai: {
        Args: { p_reason: string; p_school_id: string }
        Returns: boolean
      }
      restore_student: { Args: { p_student_id: string }; Returns: boolean }
      resume_pilot_school_ai: {
        Args: { p_school_id: string }
        Returns: boolean
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
