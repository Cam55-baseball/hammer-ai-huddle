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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string | null
          updated_by: string | null
        }
        Insert: {
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Update: {
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string | null
          updated_by?: string | null
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string | null
          id: string
          metadata: Json | null
          record_id: string | null
          table_name: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          metadata?: Json | null
          record_id?: string | null
          table_name?: string
          user_id?: string
        }
        Relationships: []
      }
      coupon_metadata: {
        Row: {
          coupon_code: string
          created_at: string | null
          custom_name: string | null
          description: string | null
          id: string
          is_ambassador: boolean | null
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          coupon_code: string
          created_at?: string | null
          custom_name?: string | null
          description?: string | null
          id?: string
          is_ambassador?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          coupon_code?: string
          created_at?: string | null
          custom_name?: string | null
          description?: string | null
          id?: string
          is_ambassador?: boolean | null
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      processed_webhook_events: {
        Row: {
          details: Json | null
          event_type: string
          id: string
          processed_at: string | null
          stripe_event_id: string
          user_email: string | null
        }
        Insert: {
          details?: Json | null
          event_type: string
          id?: string
          processed_at?: string | null
          stripe_event_id: string
          user_email?: string | null
        }
        Update: {
          details?: Json | null
          event_type?: string
          id?: string
          processed_at?: string | null
          stripe_event_id?: string
          user_email?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          batting_side: Database["public"]["Enums"]["batting_side"] | null
          bio: string | null
          college_grad_year: number | null
          commitment_status:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email: string | null
          created_at: string | null
          credentials: string[] | null
          enrolled_in_college: boolean | null
          experience_level: string | null
          first_name: string | null
          full_name: string | null
          graduation_year: number | null
          height: string | null
          high_school_grad_year: number | null
          id: string
          independent_league: string | null
          is_foreign_player: boolean | null
          is_free_agent: boolean | null
          is_professional: boolean | null
          last_name: string | null
          mlb_affiliate: string | null
          position: string | null
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          social_tiktok: string | null
          social_twitter: string | null
          social_website: string | null
          social_website_2: string | null
          social_website_3: string | null
          social_website_4: string | null
          social_website_5: string | null
          social_youtube: string | null
          state: string | null
          team_affiliation: string | null
          throwing_hand: Database["public"]["Enums"]["throwing_hand"] | null
          tutorial_completed: boolean | null
          updated_at: string | null
          weight: string | null
          years_affiliated: number | null
        }
        Insert: {
          avatar_url?: string | null
          batting_side?: Database["public"]["Enums"]["batting_side"] | null
          bio?: string | null
          college_grad_year?: number | null
          commitment_status?:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email?: string | null
          created_at?: string | null
          credentials?: string[] | null
          enrolled_in_college?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          height?: string | null
          high_school_grad_year?: number | null
          id: string
          independent_league?: string | null
          is_foreign_player?: boolean | null
          is_free_agent?: boolean | null
          is_professional?: boolean | null
          last_name?: string | null
          mlb_affiliate?: string | null
          position?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_website?: string | null
          social_website_2?: string | null
          social_website_3?: string | null
          social_website_4?: string | null
          social_website_5?: string | null
          social_youtube?: string | null
          state?: string | null
          team_affiliation?: string | null
          throwing_hand?: Database["public"]["Enums"]["throwing_hand"] | null
          tutorial_completed?: boolean | null
          updated_at?: string | null
          weight?: string | null
          years_affiliated?: number | null
        }
        Update: {
          avatar_url?: string | null
          batting_side?: Database["public"]["Enums"]["batting_side"] | null
          bio?: string | null
          college_grad_year?: number | null
          commitment_status?:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email?: string | null
          created_at?: string | null
          credentials?: string[] | null
          enrolled_in_college?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          full_name?: string | null
          graduation_year?: number | null
          height?: string | null
          high_school_grad_year?: number | null
          id?: string
          independent_league?: string | null
          is_foreign_player?: boolean | null
          is_free_agent?: boolean | null
          is_professional?: boolean | null
          last_name?: string | null
          mlb_affiliate?: string | null
          position?: string | null
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          social_tiktok?: string | null
          social_twitter?: string | null
          social_website?: string | null
          social_website_2?: string | null
          social_website_3?: string | null
          social_website_4?: string | null
          social_website_5?: string | null
          social_youtube?: string | null
          state?: string | null
          team_affiliation?: string | null
          throwing_hand?: Database["public"]["Enums"]["throwing_hand"] | null
          tutorial_completed?: boolean | null
          updated_at?: string | null
          weight?: string | null
          years_affiliated?: number | null
        }
        Relationships: []
      }
      scout_applications: {
        Row: {
          created_at: string | null
          email: string
          first_name: string
          id: string
          last_name: string
          organization_letter_url: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sport: string
          status: string
          updated_at: string | null
          user_id: string
          video_submission_url: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name: string
          id?: string
          last_name: string
          organization_letter_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sport: string
          status?: string
          updated_at?: string | null
          user_id: string
          video_submission_url?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string
          id?: string
          last_name?: string
          organization_letter_url?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sport?: string
          status?: string
          updated_at?: string | null
          user_id?: string
          video_submission_url?: string | null
        }
        Relationships: []
      }
      scout_follows: {
        Row: {
          created_at: string | null
          id: string
          player_id: string
          scout_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          player_id: string
          scout_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          player_id?: string
          scout_id?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scout_follows_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_follows_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          coupon_code: string | null
          coupon_name: string | null
          created_at: string | null
          current_period_end: string
          discount_percent: number | null
          has_pending_cancellations: boolean | null
          id: string
          module_subscription_mapping: Json | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed_modules: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_name?: string | null
          created_at?: string | null
          current_period_end?: string
          discount_percent?: number | null
          has_pending_cancellations?: boolean | null
          id?: string
          module_subscription_mapping?: Json | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_modules?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          coupon_name?: string | null
          created_at?: string | null
          current_period_end?: string
          discount_percent?: number | null
          has_pending_cancellations?: boolean | null
          id?: string
          module_subscription_mapping?: Json | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_modules?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      training_data: {
        Row: {
          created_at: string
          data_type: Database["public"]["Enums"]["training_data_type"]
          description: string
          id: string
          mocap_data: Json | null
          module: Database["public"]["Enums"]["module_type"]
          sport: Database["public"]["Enums"]["sport_type"]
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          video_url: string
        }
        Insert: {
          created_at?: string
          data_type: Database["public"]["Enums"]["training_data_type"]
          description: string
          id?: string
          mocap_data?: Json | null
          module: Database["public"]["Enums"]["module_type"]
          sport: Database["public"]["Enums"]["sport_type"]
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          video_url: string
        }
        Update: {
          created_at?: string
          data_type?: Database["public"]["Enums"]["training_data_type"]
          description?: string
          id?: string
          mocap_data?: Json | null
          module?: Database["public"]["Enums"]["module_type"]
          sport?: Database["public"]["Enums"]["sport_type"]
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          video_url?: string
        }
        Relationships: []
      }
      user_progress: {
        Row: {
          average_efficiency_score: number | null
          id: string
          last_activity: string
          module: Database["public"]["Enums"]["module_type"]
          sport: Database["public"]["Enums"]["sport_type"]
          user_id: string
          videos_analyzed: number
        }
        Insert: {
          average_efficiency_score?: number | null
          id?: string
          last_activity?: string
          module: Database["public"]["Enums"]["module_type"]
          sport: Database["public"]["Enums"]["sport_type"]
          user_id: string
          videos_analyzed?: number
        }
        Update: {
          average_efficiency_score?: number | null
          id?: string
          last_activity?: string
          module?: Database["public"]["Enums"]["module_type"]
          sport?: Database["public"]["Enums"]["sport_type"]
          user_id?: string
          videos_analyzed?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          status: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          status?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_workout_progress: {
        Row: {
          block_start_date: string
          completion_percentage: number | null
          created_at: string | null
          current_block: number | null
          current_day_in_block: number | null
          experience_level: string | null
          id: string
          parent_module: string
          program_id: string | null
          sport: string
          sub_module: string
          total_workouts_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_start_date: string
          completion_percentage?: number | null
          created_at?: string | null
          current_block?: number | null
          current_day_in_block?: number | null
          experience_level?: string | null
          id?: string
          parent_module: string
          program_id?: string | null
          sport: string
          sub_module: string
          total_workouts_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_start_date?: string
          completion_percentage?: number | null
          created_at?: string | null
          current_block?: number | null
          current_day_in_block?: number | null
          experience_level?: string | null
          id?: string
          parent_module?: string
          program_id?: string | null
          sport?: string
          sub_module?: string
          total_workouts_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workout_progress_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      video_annotations: {
        Row: {
          annotation_data: string
          annotator_type: string | null
          created_at: string | null
          frame_timestamp: number | null
          id: string
          notes: string | null
          original_frame_data: string
          player_id: string
          scout_id: string | null
          updated_at: string | null
          video_id: string
        }
        Insert: {
          annotation_data: string
          annotator_type?: string | null
          created_at?: string | null
          frame_timestamp?: number | null
          id?: string
          notes?: string | null
          original_frame_data: string
          player_id: string
          scout_id?: string | null
          updated_at?: string | null
          video_id: string
        }
        Update: {
          annotation_data?: string
          annotator_type?: string | null
          created_at?: string | null
          frame_timestamp?: number | null
          id?: string
          notes?: string | null
          original_frame_data?: string
          player_id?: string
          scout_id?: string | null
          updated_at?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_annotations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_annotations_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_annotations_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_pose_analysis: {
        Row: {
          id: string
          landmark_data: Json | null
          processed_at: string | null
          video_id: string
          violation_timestamps: Json | null
        }
        Insert: {
          id?: string
          landmark_data?: Json | null
          processed_at?: string | null
          video_id: string
          violation_timestamps?: Json | null
        }
        Update: {
          id?: string
          landmark_data?: Json | null
          processed_at?: string | null
          video_id?: string
          violation_timestamps?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "video_pose_analysis_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      videos: {
        Row: {
          ai_analysis: Json | null
          analysis_public: boolean | null
          blurhash: string | null
          created_at: string
          efficiency_score: number | null
          id: string
          library_notes: string | null
          library_title: string | null
          mocap_data: Json | null
          module: Database["public"]["Enums"]["module_type"]
          saved_to_library: boolean | null
          session_date: string | null
          shared_with_scouts: boolean | null
          sport: Database["public"]["Enums"]["sport_type"]
          status: Database["public"]["Enums"]["video_status"]
          thumbnail_sizes: Json | null
          thumbnail_url: string | null
          thumbnail_webp_url: string | null
          updated_at: string
          user_id: string
          video_url: string
        }
        Insert: {
          ai_analysis?: Json | null
          analysis_public?: boolean | null
          blurhash?: string | null
          created_at?: string
          efficiency_score?: number | null
          id?: string
          library_notes?: string | null
          library_title?: string | null
          mocap_data?: Json | null
          module: Database["public"]["Enums"]["module_type"]
          saved_to_library?: boolean | null
          session_date?: string | null
          shared_with_scouts?: boolean | null
          sport: Database["public"]["Enums"]["sport_type"]
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_sizes?: Json | null
          thumbnail_url?: string | null
          thumbnail_webp_url?: string | null
          updated_at?: string
          user_id: string
          video_url: string
        }
        Update: {
          ai_analysis?: Json | null
          analysis_public?: boolean | null
          blurhash?: string | null
          created_at?: string
          efficiency_score?: number | null
          id?: string
          library_notes?: string | null
          library_title?: string | null
          mocap_data?: Json | null
          module?: Database["public"]["Enums"]["module_type"]
          saved_to_library?: boolean | null
          session_date?: string | null
          shared_with_scouts?: boolean | null
          sport?: Database["public"]["Enums"]["sport_type"]
          status?: Database["public"]["Enums"]["video_status"]
          thumbnail_sizes?: Json | null
          thumbnail_url?: string | null
          thumbnail_webp_url?: string | null
          updated_at?: string
          user_id?: string
          video_url?: string
        }
        Relationships: []
      }
      workout_completions: {
        Row: {
          completed_date: string | null
          created_at: string | null
          exercise_logs: Json | null
          id: string
          notes: string | null
          progress_id: string | null
          scheduled_date: string
          status: string | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          completed_date?: string | null
          created_at?: string | null
          exercise_logs?: Json | null
          id?: string
          notes?: string | null
          progress_id?: string | null
          scheduled_date: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          completed_date?: string | null
          created_at?: string | null
          exercise_logs?: Json | null
          id?: string
          notes?: string | null
          progress_id?: string | null
          scheduled_date?: string
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_completions_progress_id_fkey"
            columns: ["progress_id"]
            isOneToOne: false
            referencedRelation: "user_workout_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workout_completions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_equipment: {
        Row: {
          category: string | null
          created_at: string | null
          description: string | null
          id: string
          is_required: boolean | null
          name: string
          purchase_link: string | null
          sport: string
          sub_module: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name: string
          purchase_link?: string | null
          sport: string
          sub_module: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_required?: boolean | null
          name?: string
          purchase_link?: string | null
          sport?: string
          sub_module?: string
        }
        Relationships: []
      }
      workout_programs: {
        Row: {
          block_number: number
          created_at: string | null
          description: string | null
          duration_weeks: number | null
          id: string
          parent_module: string
          sport: string
          sub_module: string
          title: string
          updated_at: string | null
        }
        Insert: {
          block_number: number
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          parent_module: string
          sport: string
          sub_module: string
          title: string
          updated_at?: string | null
        }
        Update: {
          block_number?: number
          created_at?: string | null
          description?: string | null
          duration_weeks?: number | null
          id?: string
          parent_module?: string
          sport?: string
          sub_module?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      workout_templates: {
        Row: {
          created_at: string | null
          day_in_cycle: number
          description: string | null
          equipment_needed: string[] | null
          estimated_duration_minutes: number | null
          exercises: Json
          experience_level: string | null
          id: string
          program_id: string | null
          title: string
          workout_type: string
        }
        Insert: {
          created_at?: string | null
          day_in_cycle: number
          description?: string | null
          equipment_needed?: string[] | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          experience_level?: string | null
          id?: string
          program_id?: string | null
          title: string
          workout_type: string
        }
        Update: {
          created_at?: string | null
          day_in_cycle?: number
          description?: string | null
          equipment_needed?: string[] | null
          estimated_duration_minutes?: number | null
          exercises?: Json
          experience_level?: string | null
          id?: string
          program_id?: string | null
          title?: string
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_templates_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      retention_status: {
        Row: {
          newest_record: string | null
          oldest_record: string | null
          records_to_clean: number | null
          table_name: string | null
          total_records: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      archive_old_scout_applications: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      manual_archive_scout_applications: {
        Args: never
        Returns: {
          archived_count: number
          cutoff_date: string
        }[]
      }
      manual_cleanup_webhooks: {
        Args: never
        Returns: {
          cutoff_date: string
          deleted_count: number
        }[]
      }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "owner" | "admin" | "coach" | "player" | "recruiter" | "scout"
      batting_side: "R" | "L" | "B"
      commitment_status: "committed" | "uncommitted"
      module_type: "hitting" | "pitching" | "throwing"
      sport_type: "baseball" | "softball"
      throwing_hand: "R" | "L" | "B"
      training_data_type: "professional_example" | "common_mistake"
      video_status: "uploading" | "processing" | "completed" | "failed"
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
      app_role: ["owner", "admin", "coach", "player", "recruiter", "scout"],
      batting_side: ["R", "L", "B"],
      commitment_status: ["committed", "uncommitted"],
      module_type: ["hitting", "pitching", "throwing"],
      sport_type: ["baseball", "softball"],
      throwing_hand: ["R", "L", "B"],
      training_data_type: ["professional_example", "common_mistake"],
      video_status: ["uploading", "processing", "completed", "failed"],
    },
  },
} as const
