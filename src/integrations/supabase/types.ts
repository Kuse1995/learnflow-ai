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
          name: string
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
          name: string
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
          name?: string
          plan?: Database["public"]["Enums"]["saas_plan"]
          updated_at?: string
        }
        Relationships: []
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
          id: string
          name: string
          student_id: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          name: string
          student_id: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          class_id?: string | null
          created_at?: string
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
          id: string
          is_production: boolean
          updated_at: string
          updated_by: string | null
          version_tag: string | null
        }
        Insert: {
          debug_mode_enabled?: boolean
          deployed_at?: string | null
          environment?: string
          id?: string
          is_production?: boolean
          updated_at?: string
          updated_by?: string | null
          version_tag?: string | null
        }
        Update: {
          debug_mode_enabled?: boolean
          deployed_at?: string | null
          environment?: string
          id?: string
          is_production?: boolean
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
      get_or_create_usage_metrics: {
        Args: { p_school_id: string }
        Returns: string
      }
      increment_usage_metric: {
        Args: { p_limit: number; p_metric: string; p_school_id: string }
        Returns: Json
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
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
      saas_plan: ["basic", "standard", "premium", "enterprise"],
      subscription_status: ["active", "suspended", "expired", "pending"],
    },
  },
} as const
