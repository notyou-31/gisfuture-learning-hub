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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          body: string | null
          created_at: string
          created_by: string | null
          id: string
          is_pinned: boolean
          title: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          title: string
        }
        Update: {
          body?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_pinned?: boolean
          title?: string
        }
        Relationships: []
      }
      attempts: {
        Row: {
          answers: Json
          archived: boolean
          archived_at: string | null
          archived_by: string | null
          correct_count: number
          id: string
          max_score: number
          score: number
          skipped_count: number
          submitted_at: string
          test_id: string
          time_taken_seconds: number | null
          total_questions: number
          user_id: string
          wrong_count: number
        }
        Insert: {
          answers?: Json
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          correct_count?: number
          id?: string
          max_score?: number
          score?: number
          skipped_count?: number
          submitted_at?: string
          test_id: string
          time_taken_seconds?: number | null
          total_questions?: number
          user_id: string
          wrong_count?: number
        }
        Update: {
          answers?: Json
          archived?: boolean
          archived_at?: string | null
          archived_by?: string | null
          correct_count?: number
          id?: string
          max_score?: number
          score?: number
          skipped_count?: number
          submitted_at?: string
          test_id?: string
          time_taken_seconds?: number | null
          total_questions?: number
          user_id?: string
          wrong_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_phones: {
        Row: {
          blocked_at: string
          blocked_by: string | null
          full_name: string | null
          phone: string
          reason: string | null
        }
        Insert: {
          blocked_at?: string
          blocked_by?: string | null
          full_name?: string | null
          phone: string
          reason?: string | null
        }
        Update: {
          blocked_at?: string
          blocked_by?: string | null
          full_name?: string | null
          phone?: string
          reason?: string | null
        }
        Relationships: []
      }
      chapters: {
        Row: {
          created_at: string
          id: string
          name: string
          sort: number
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          sort?: number
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          sort?: number
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      exams: {
        Row: {
          created_at: string
          created_by: string | null
          exam_date: string
          id: string
          start_time: string | null
          subject_id: string | null
          syllabus: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exam_date: string
          id?: string
          start_time?: string | null
          subject_id?: string | null
          syllabus?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exam_date?: string
          id?: string
          start_time?: string | null
          subject_id?: string | null
          syllabus?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "exams_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      homework: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          file_name: string | null
          file_path: string | null
          id: string
          link_url: string | null
          subject_id: string | null
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          link_url?: string | null
          subject_id?: string | null
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          link_url?: string | null
          subject_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      login_events: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string
          role: Database["public"]["Enums"]["app_role"] | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string
          role?: Database["public"]["Enums"]["app_role"] | null
          user_id?: string | null
        }
        Relationships: []
      }
      passkeys: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          label: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          last_login_at: string | null
          last_seen_at: string | null
          login_count: number
          phone: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number
          phone: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          last_login_at?: string | null
          last_seen_at?: string | null
          login_count?: number
          phone?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_index: number | null
          correct_value: number | null
          created_at: string
          explanation: string | null
          id: string
          marks: number
          negative_marks: number
          options: Json
          prompt: string
          qtype: Database["public"]["Enums"]["question_type"]
          sort: number
          test_id: string
        }
        Insert: {
          correct_index?: number | null
          correct_value?: number | null
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          options?: Json
          prompt: string
          qtype?: Database["public"]["Enums"]["question_type"]
          sort?: number
          test_id: string
        }
        Update: {
          correct_index?: number | null
          correct_value?: number | null
          created_at?: string
          explanation?: string | null
          id?: string
          marks?: number
          negative_marks?: number
          options?: Json
          prompt?: string
          qtype?: Database["public"]["Enums"]["question_type"]
          sort?: number
          test_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      resources: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          file_name: string | null
          file_path: string | null
          id: string
          kind: Database["public"]["Enums"]["resource_type"]
          subject_id: string | null
          title: string
          url: string | null
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          title: string
          url?: string | null
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          file_name?: string | null
          file_path?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["resource_type"]
          subject_id?: string | null
          title?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "resources_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "resources_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          sort: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          sort?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort?: number
        }
        Relationships: []
      }
      tests: {
        Row: {
          chapter_id: string | null
          created_at: string
          created_by: string | null
          description: string | null
          duration_minutes: number
          id: string
          is_published: boolean
          question_count: number
          subject_id: string | null
          title: string
          total_marks: number
        }
        Insert: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          question_count?: number
          subject_id?: string | null
          title: string
          total_marks?: number
        }
        Update: {
          chapter_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          duration_minutes?: number
          id?: string
          is_published?: boolean
          question_count?: number
          subject_id?: string | null
          title?: string
          total_marks?: number
        }
        Relationships: [
          {
            foreignKeyName: "tests_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "chapters"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tests_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_attempt_review: { Args: { _attempt_id: string }; Returns: Json }
      get_leaderboard: {
        Args: { _test_id?: string }
        Returns: {
          accuracy: number
          full_name: string
          rank: number
          tests_taken: number
          total_score: number
        }[]
      }
      get_leaderboard_tests: {
        Args: never
        Returns: {
          id: string
          title: string
        }[]
      }
      get_test_for_student: { Args: { _test_id: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_member: { Args: { _user_id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      submit_attempt: {
        Args: { _answers: Json; _test_id: string; _time_taken: number }
        Returns: string
      }
      touch_last_seen: { Args: never; Returns: boolean }
    }
    Enums: {
      app_role: "super_admin" | "teacher" | "student"
      question_type: "mcq" | "integer"
      resource_type:
        | "video"
        | "notes"
        | "pdf"
        | "ncert"
        | "important"
        | "revision"
        | "practice"
        | "mock"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["super_admin", "teacher", "student"],
      question_type: ["mcq", "integer"],
      resource_type: [
        "video",
        "notes",
        "pdf",
        "ncert",
        "important",
        "revision",
        "practice",
        "mock",
      ],
    },
  },
} as const
