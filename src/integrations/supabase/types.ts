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
      classes: {
        Row: {
          created_at: string
          grade: string | null
          id: string
          name: string
          section: string | null
          teacher_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade?: string | null
          id?: string
          name: string
          section?: string | null
          teacher_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string | null
          id?: string
          name?: string
          section?: string | null
          teacher_id?: string | null
          updated_at?: string
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
      [_ in never]: never
    }
    Enums: {
      confidence_trend: "increasing" | "stable" | "declining"
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
      confidence_trend: ["increasing", "stable", "declining"],
    },
  },
} as const
