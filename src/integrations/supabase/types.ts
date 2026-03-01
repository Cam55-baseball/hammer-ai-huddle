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
      activity_folder_items: {
        Row: {
          assigned_days: number[] | null
          attachments: Json | null
          completion_tracking: boolean | null
          created_at: string | null
          cycle_week: number | null
          description: string | null
          duration_minutes: number | null
          exercises: Json | null
          folder_id: string
          id: string
          item_type: string | null
          notes: string | null
          order_index: number | null
          specific_dates: string[] | null
          template_snapshot: Json | null
          title: string
        }
        Insert: {
          assigned_days?: number[] | null
          attachments?: Json | null
          completion_tracking?: boolean | null
          created_at?: string | null
          cycle_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          exercises?: Json | null
          folder_id: string
          id?: string
          item_type?: string | null
          notes?: string | null
          order_index?: number | null
          specific_dates?: string[] | null
          template_snapshot?: Json | null
          title: string
        }
        Update: {
          assigned_days?: number[] | null
          attachments?: Json | null
          completion_tracking?: boolean | null
          created_at?: string | null
          cycle_week?: number | null
          description?: string | null
          duration_minutes?: number | null
          exercises?: Json | null
          folder_id?: string
          id?: string
          item_type?: string | null
          notes?: string | null
          order_index?: number | null
          specific_dates?: string[] | null
          template_snapshot?: Json | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_folder_items_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "activity_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_folders: {
        Row: {
          coach_edit_allowed: boolean | null
          coach_edit_user_id: string | null
          color: string | null
          created_at: string | null
          cycle_length_weeks: number | null
          cycle_type: string | null
          description: string | null
          end_date: string | null
          frequency_days: number[] | null
          icon: string | null
          id: string
          is_template: boolean | null
          label: string | null
          name: string
          owner_id: string
          owner_type: string
          placement: string | null
          priority_level: number | null
          source_template_id: string | null
          sport: string
          start_date: string | null
          status: string | null
          template_category: string | null
          template_description: string | null
          updated_at: string | null
          use_count: number | null
        }
        Insert: {
          coach_edit_allowed?: boolean | null
          coach_edit_user_id?: string | null
          color?: string | null
          created_at?: string | null
          cycle_length_weeks?: number | null
          cycle_type?: string | null
          description?: string | null
          end_date?: string | null
          frequency_days?: number[] | null
          icon?: string | null
          id?: string
          is_template?: boolean | null
          label?: string | null
          name: string
          owner_id: string
          owner_type: string
          placement?: string | null
          priority_level?: number | null
          source_template_id?: string | null
          sport?: string
          start_date?: string | null
          status?: string | null
          template_category?: string | null
          template_description?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Update: {
          coach_edit_allowed?: boolean | null
          coach_edit_user_id?: string | null
          color?: string | null
          created_at?: string | null
          cycle_length_weeks?: number | null
          cycle_type?: string | null
          description?: string | null
          end_date?: string | null
          frequency_days?: number[] | null
          icon?: string | null
          id?: string
          is_template?: boolean | null
          label?: string | null
          name?: string
          owner_id?: string
          owner_type?: string
          placement?: string | null
          priority_level?: number | null
          source_template_id?: string | null
          sport?: string
          start_date?: string | null
          status?: string | null
          template_category?: string | null
          template_description?: string | null
          updated_at?: string | null
          use_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_folders_source_template_id_fkey"
            columns: ["source_template_id"]
            isOneToOne: false
            referencedRelation: "activity_folders"
            referencedColumns: ["id"]
          },
        ]
      }
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
      athlete_body_goals: {
        Row: {
          created_at: string | null
          goal_type: string
          id: string
          is_active: boolean | null
          started_at: string | null
          starting_weight_lbs: number | null
          target_body_fat_percent: number | null
          target_date: string | null
          target_weight_lbs: number | null
          updated_at: string | null
          user_id: string
          weekly_change_rate: number | null
        }
        Insert: {
          created_at?: string | null
          goal_type: string
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          starting_weight_lbs?: number | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight_lbs?: number | null
          updated_at?: string | null
          user_id: string
          weekly_change_rate?: number | null
        }
        Update: {
          created_at?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean | null
          started_at?: string | null
          starting_weight_lbs?: number | null
          target_body_fat_percent?: number | null
          target_date?: string | null
          target_weight_lbs?: number | null
          updated_at?: string | null
          user_id?: string
          weekly_change_rate?: number | null
        }
        Relationships: []
      }
      athlete_daily_log: {
        Row: {
          cns_load_actual: number | null
          coach_override: boolean | null
          coach_override_by: string | null
          consistency_impact: number | null
          created_at: string | null
          day_status: string
          entry_date: string
          game_logged: boolean | null
          id: string
          injury_body_region: string | null
          injury_expected_days: number | null
          injury_mode: boolean | null
          momentum_impact: number | null
          notes: string | null
          rest_reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cns_load_actual?: number | null
          coach_override?: boolean | null
          coach_override_by?: string | null
          consistency_impact?: number | null
          created_at?: string | null
          day_status?: string
          entry_date: string
          game_logged?: boolean | null
          id?: string
          injury_body_region?: string | null
          injury_expected_days?: number | null
          injury_mode?: boolean | null
          momentum_impact?: number | null
          notes?: string | null
          rest_reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cns_load_actual?: number | null
          coach_override?: boolean | null
          coach_override_by?: string | null
          consistency_impact?: number | null
          created_at?: string | null
          day_status?: string
          entry_date?: string
          game_logged?: boolean | null
          id?: string
          injury_body_region?: string | null
          injury_expected_days?: number | null
          injury_mode?: boolean | null
          momentum_impact?: number | null
          notes?: string | null
          rest_reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      athlete_events: {
        Row: {
          created_at: string | null
          event_date: string
          event_time: string | null
          event_type: string
          id: string
          intensity_level: number | null
          notes: string | null
          sport: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_date: string
          event_time?: string | null
          event_type: string
          id?: string
          intensity_level?: number | null
          notes?: string | null
          sport?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_date?: string
          event_time?: string | null
          event_type?: string
          id?: string
          intensity_level?: number | null
          notes?: string | null
          sport?: string | null
          user_id?: string
        }
        Relationships: []
      }
      athlete_load_tracking: {
        Row: {
          cns_load_total: number | null
          created_at: string | null
          entry_date: string
          fascial_load: Json | null
          id: string
          intensity_avg: number | null
          overlap_warnings: Json | null
          recovery_debt: number | null
          running_ids: string[] | null
          updated_at: string | null
          user_id: string
          volume_load: number | null
          workout_ids: string[] | null
        }
        Insert: {
          cns_load_total?: number | null
          created_at?: string | null
          entry_date?: string
          fascial_load?: Json | null
          id?: string
          intensity_avg?: number | null
          overlap_warnings?: Json | null
          recovery_debt?: number | null
          running_ids?: string[] | null
          updated_at?: string | null
          user_id: string
          volume_load?: number | null
          workout_ids?: string[] | null
        }
        Update: {
          cns_load_total?: number | null
          created_at?: string | null
          entry_date?: string
          fascial_load?: Json | null
          id?: string
          intensity_avg?: number | null
          overlap_warnings?: Json | null
          recovery_debt?: number | null
          running_ids?: string[] | null
          updated_at?: string | null
          user_id?: string
          volume_load?: number | null
          workout_ids?: string[] | null
        }
        Relationships: []
      }
      athlete_mpi_settings: {
        Row: {
          admin_probability_frozen: boolean | null
          admin_progression_locked: boolean | null
          admin_ranking_excluded: boolean | null
          coach_validation_met: boolean | null
          created_at: string
          data_density_level: number | null
          data_span_met: boolean | null
          date_of_birth: string | null
          games_minimum_met: boolean | null
          id: string
          integrity_threshold_met: boolean | null
          is_ambidextrous_thrower: boolean | null
          is_college_verified: boolean | null
          is_pro_verified: boolean | null
          is_switch_hitter: boolean | null
          league_tier: string | null
          primary_batting_side: string | null
          primary_coach_id: string | null
          primary_position: string | null
          primary_throwing_hand: string | null
          ranking_eligible: boolean | null
          secondary_coach_ids: string[] | null
          secondary_position: string | null
          sport: string
          streak_best: number | null
          streak_current: number | null
          updated_at: string
          user_id: string
          verified_stat_profile_id: string | null
        }
        Insert: {
          admin_probability_frozen?: boolean | null
          admin_progression_locked?: boolean | null
          admin_ranking_excluded?: boolean | null
          coach_validation_met?: boolean | null
          created_at?: string
          data_density_level?: number | null
          data_span_met?: boolean | null
          date_of_birth?: string | null
          games_minimum_met?: boolean | null
          id?: string
          integrity_threshold_met?: boolean | null
          is_ambidextrous_thrower?: boolean | null
          is_college_verified?: boolean | null
          is_pro_verified?: boolean | null
          is_switch_hitter?: boolean | null
          league_tier?: string | null
          primary_batting_side?: string | null
          primary_coach_id?: string | null
          primary_position?: string | null
          primary_throwing_hand?: string | null
          ranking_eligible?: boolean | null
          secondary_coach_ids?: string[] | null
          secondary_position?: string | null
          sport: string
          streak_best?: number | null
          streak_current?: number | null
          updated_at?: string
          user_id: string
          verified_stat_profile_id?: string | null
        }
        Update: {
          admin_probability_frozen?: boolean | null
          admin_progression_locked?: boolean | null
          admin_ranking_excluded?: boolean | null
          coach_validation_met?: boolean | null
          created_at?: string
          data_density_level?: number | null
          data_span_met?: boolean | null
          date_of_birth?: string | null
          games_minimum_met?: boolean | null
          id?: string
          integrity_threshold_met?: boolean | null
          is_ambidextrous_thrower?: boolean | null
          is_college_verified?: boolean | null
          is_pro_verified?: boolean | null
          is_switch_hitter?: boolean | null
          league_tier?: string | null
          primary_batting_side?: string | null
          primary_coach_id?: string | null
          primary_position?: string | null
          primary_throwing_hand?: string | null
          ranking_eligible?: boolean | null
          secondary_coach_ids?: string[] | null
          secondary_position?: string | null
          sport?: string
          streak_best?: number | null
          streak_current?: number | null
          updated_at?: string
          user_id?: string
          verified_stat_profile_id?: string | null
        }
        Relationships: []
      }
      athlete_professional_status: {
        Row: {
          ausl_seasons_completed: number | null
          contract_status: string | null
          created_at: string
          current_league: string | null
          current_team: string | null
          hof_activated_at: string | null
          hof_eligible: boolean | null
          id: string
          last_release_date: string | null
          last_resign_date: string | null
          mlb_seasons_completed: number | null
          release_count: number | null
          roster_verified: boolean | null
          roster_verified_by: string | null
          sport: string
          updated_at: string
          user_id: string
        }
        Insert: {
          ausl_seasons_completed?: number | null
          contract_status?: string | null
          created_at?: string
          current_league?: string | null
          current_team?: string | null
          hof_activated_at?: string | null
          hof_eligible?: boolean | null
          id?: string
          last_release_date?: string | null
          last_resign_date?: string | null
          mlb_seasons_completed?: number | null
          release_count?: number | null
          roster_verified?: boolean | null
          roster_verified_by?: string | null
          sport: string
          updated_at?: string
          user_id: string
        }
        Update: {
          ausl_seasons_completed?: number | null
          contract_status?: string | null
          created_at?: string
          current_league?: string | null
          current_team?: string | null
          hof_activated_at?: string | null
          hof_eligible?: boolean | null
          id?: string
          last_release_date?: string | null
          last_resign_date?: string | null
          mlb_seasons_completed?: number | null
          release_count?: number | null
          roster_verified?: boolean | null
          roster_verified_by?: string | null
          sport?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      athlete_roadmap_progress: {
        Row: {
          blocked_reason: string | null
          completed_at: string | null
          created_at: string
          id: string
          milestone_id: string
          progress_pct: number | null
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          milestone_id: string
          progress_pct?: number | null
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          milestone_id?: string
          progress_pct?: number | null
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "athlete_roadmap_progress_milestone_id_fkey"
            columns: ["milestone_id"]
            isOneToOne: false
            referencedRelation: "roadmap_milestones"
            referencedColumns: ["id"]
          },
        ]
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
      calendar_day_orders: {
        Row: {
          created_at: string
          event_date: string
          id: string
          locked: boolean
          order_keys: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_date: string
          id?: string
          locked?: boolean
          order_keys?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_date?: string
          id?: string
          locked?: boolean
          order_keys?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          all_day: boolean | null
          color: string | null
          created_at: string | null
          description: string | null
          end_time: string | null
          event_date: string
          event_type: string
          id: string
          related_id: string | null
          reminder_enabled: boolean | null
          reminder_minutes: number | null
          sport: string | null
          start_time: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date: string
          event_type?: string
          id?: string
          related_id?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          sport?: string | null
          start_time?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          all_day?: boolean | null
          color?: string | null
          created_at?: string | null
          description?: string | null
          end_time?: string | null
          event_date?: string
          event_type?: string
          id?: string
          related_id?: string | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          sport?: string | null
          start_time?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      calendar_skipped_items: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          item_type: string
          skip_days: number[]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          item_type: string
          skip_days?: number[]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          item_type?: string
          skip_days?: number[]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coach_grade_overrides: {
        Row: {
          coach_id: string
          created_at: string
          id: string
          original_grade: number | null
          override_grade: number | null
          override_reason: string | null
          session_id: string
        }
        Insert: {
          coach_id: string
          created_at?: string
          id?: string
          original_grade?: number | null
          override_grade?: number | null
          override_reason?: string | null
          session_id: string
        }
        Update: {
          coach_id?: string
          created_at?: string
          id?: string
          original_grade?: number | null
          override_grade?: number | null
          override_reason?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_grade_overrides_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      custom_activity_logs: {
        Row: {
          actual_duration_minutes: number | null
          completed: boolean | null
          completed_at: string | null
          created_at: string | null
          entry_date: string
          id: string
          notes: string | null
          performance_data: Json | null
          reminder_minutes: number | null
          sort_order: number | null
          start_time: string | null
          template_id: string | null
          user_id: string
        }
        Insert: {
          actual_duration_minutes?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          performance_data?: Json | null
          reminder_minutes?: number | null
          sort_order?: number | null
          start_time?: string | null
          template_id?: string | null
          user_id: string
        }
        Update: {
          actual_duration_minutes?: number | null
          completed?: boolean | null
          completed_at?: string | null
          created_at?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          performance_data?: Json | null
          reminder_minutes?: number | null
          sort_order?: number | null
          start_time?: string | null
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_activity_logs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_activity_templates: {
        Row: {
          activity_type: string
          color: string
          created_at: string | null
          custom_fields: Json | null
          custom_logo_url: string | null
          deleted_at: string | null
          deleted_permanently_at: string | null
          description: string | null
          display_days: number[] | null
          display_nickname: string | null
          display_on_game_plan: boolean | null
          display_time: string | null
          distance_unit: string | null
          distance_value: number | null
          duration_minutes: number | null
          embedded_running_sessions: Json | null
          exercises: Json | null
          icon: string
          id: string
          intensity: string | null
          intervals: Json | null
          is_favorited: boolean | null
          meals: Json | null
          pace_value: string | null
          recurring_active: boolean | null
          recurring_days: Json | null
          reminder_enabled: boolean | null
          reminder_minutes: number | null
          reminder_time: string | null
          specific_dates: string[] | null
          sport: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          color?: string
          created_at?: string | null
          custom_fields?: Json | null
          custom_logo_url?: string | null
          deleted_at?: string | null
          deleted_permanently_at?: string | null
          description?: string | null
          display_days?: number[] | null
          display_nickname?: string | null
          display_on_game_plan?: boolean | null
          display_time?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          duration_minutes?: number | null
          embedded_running_sessions?: Json | null
          exercises?: Json | null
          icon?: string
          id?: string
          intensity?: string | null
          intervals?: Json | null
          is_favorited?: boolean | null
          meals?: Json | null
          pace_value?: string | null
          recurring_active?: boolean | null
          recurring_days?: Json | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          reminder_time?: string | null
          specific_dates?: string[] | null
          sport?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          color?: string
          created_at?: string | null
          custom_fields?: Json | null
          custom_logo_url?: string | null
          deleted_at?: string | null
          deleted_permanently_at?: string | null
          description?: string | null
          display_days?: number[] | null
          display_nickname?: string | null
          display_on_game_plan?: boolean | null
          display_time?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          duration_minutes?: number | null
          embedded_running_sessions?: Json | null
          exercises?: Json | null
          icon?: string
          id?: string
          intensity?: string | null
          intervals?: Json | null
          is_favorited?: boolean | null
          meals?: Json | null
          pace_value?: string | null
          recurring_active?: boolean | null
          recurring_days?: Json | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          reminder_time?: string | null
          specific_dates?: string[] | null
          sport?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      emotion_tracking: {
        Row: {
          action_taken: string | null
          created_at: string | null
          emotion: string
          entry_date: string | null
          grounding_technique_used: string | null
          id: string
          intensity: number | null
          trigger_category: string | null
          trigger_description: string | null
          user_id: string
        }
        Insert: {
          action_taken?: string | null
          created_at?: string | null
          emotion: string
          entry_date?: string | null
          grounding_technique_used?: string | null
          id?: string
          intensity?: number | null
          trigger_category?: string | null
          trigger_description?: string | null
          user_id: string
        }
        Update: {
          action_taken?: string | null
          created_at?: string | null
          emotion?: string
          entry_date?: string | null
          grounding_technique_used?: string | null
          id?: string
          intensity?: number | null
          trigger_category?: string | null
          trigger_description?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folder_assignments: {
        Row: {
          accepted_at: string | null
          declined_at: string | null
          folder_id: string
          id: string
          player_notes: Json | null
          recipient_id: string
          sender_id: string
          sent_at: string | null
          status: string | null
        }
        Insert: {
          accepted_at?: string | null
          declined_at?: string | null
          folder_id: string
          id?: string
          player_notes?: Json | null
          recipient_id: string
          sender_id: string
          sent_at?: string | null
          status?: string | null
        }
        Update: {
          accepted_at?: string | null
          declined_at?: string | null
          folder_id?: string
          id?: string
          player_notes?: Json | null
          recipient_id?: string
          sender_id?: string
          sent_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_assignments_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "activity_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_coach_permissions: {
        Row: {
          coach_user_id: string
          folder_id: string
          granted_at: string
          granted_by: string
          id: string
          permission_level: string
          revoked_at: string | null
        }
        Insert: {
          coach_user_id: string
          folder_id: string
          granted_at?: string
          granted_by: string
          id?: string
          permission_level?: string
          revoked_at?: string | null
        }
        Update: {
          coach_user_id?: string
          folder_id?: string
          granted_at?: string
          granted_by?: string
          id?: string
          permission_level?: string
          revoked_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "folder_coach_permissions_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "activity_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      folder_item_completions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          entry_date: string
          folder_assignment_id: string | null
          folder_item_id: string
          id: string
          notes: string | null
          performance_data: Json | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          entry_date: string
          folder_assignment_id?: string | null
          folder_item_id: string
          id?: string
          notes?: string | null
          performance_data?: Json | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          entry_date?: string
          folder_assignment_id?: string | null
          folder_item_id?: string
          id?: string
          notes?: string | null
          performance_data?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "folder_item_completions_folder_assignment_id_fkey"
            columns: ["folder_assignment_id"]
            isOneToOne: false
            referencedRelation: "folder_assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folder_item_completions_folder_item_id_fkey"
            columns: ["folder_item_id"]
            isOneToOne: false
            referencedRelation: "activity_folder_items"
            referencedColumns: ["id"]
          },
        ]
      }
      game_plan_locked_days: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          locked_at: string | null
          schedule: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          locked_at?: string | null
          schedule?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          locked_at?: string | null
          schedule?: Json
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_plan_skipped_tasks: {
        Row: {
          created_at: string | null
          id: string
          skip_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          skip_date?: string
          task_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          skip_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      game_plan_task_schedule: {
        Row: {
          created_at: string | null
          display_days: number[] | null
          display_time: string | null
          id: string
          reminder_enabled: boolean | null
          reminder_minutes: number | null
          task_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_days?: number[] | null
          display_time?: string | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          task_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_days?: number[] | null
          display_time?: string | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          task_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      game_plan_week_overrides: {
        Row: {
          created_at: string | null
          day_of_week: number
          id: string
          override_schedule: Json
          updated_at: string | null
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          id?: string
          override_schedule?: Json
          updated_at?: string | null
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          id?: string
          override_schedule?: Json
          updated_at?: string | null
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      governance_flags: {
        Row: {
          admin_action: string | null
          admin_notes: string | null
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          source_session_id: string | null
          status: string | null
          tagged_rep_index: number | null
          user_id: string
          video_evidence_url: string | null
        }
        Insert: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_session_id?: string | null
          status?: string | null
          tagged_rep_index?: number | null
          user_id: string
          video_evidence_url?: string | null
        }
        Update: {
          admin_action?: string | null
          admin_notes?: string | null
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          source_session_id?: string | null
          status?: string | null
          tagged_rep_index?: number | null
          user_id?: string
          video_evidence_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "governance_flags_source_session_id_fkey"
            columns: ["source_session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      heat_map_snapshots: {
        Row: {
          blind_zones: Json | null
          computed_at: string
          context_filter: string
          grid_data: Json
          id: string
          map_type: string
          split_key: string
          sport: string
          time_window: string
          total_data_points: number | null
          user_id: string
        }
        Insert: {
          blind_zones?: Json | null
          computed_at?: string
          context_filter?: string
          grid_data?: Json
          id?: string
          map_type: string
          split_key?: string
          sport: string
          time_window: string
          total_data_points?: number | null
          user_id: string
        }
        Update: {
          blind_zones?: Json | null
          computed_at?: string
          context_filter?: string
          grid_data?: Json
          id?: string
          map_type?: string
          split_key?: string
          sport?: string
          time_window?: string
          total_data_points?: number | null
          user_id?: string
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          amount_oz: number
          id: string
          log_date: string | null
          logged_at: string | null
          user_id: string
        }
        Insert: {
          amount_oz: number
          id?: string
          log_date?: string | null
          logged_at?: string | null
          user_id: string
        }
        Update: {
          amount_oz?: number
          id?: string
          log_date?: string | null
          logged_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hydration_settings: {
        Row: {
          created_at: string | null
          daily_goal_oz: number | null
          enabled: boolean | null
          end_time: string | null
          id: string
          reminder_interval_minutes: number | null
          start_time: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          daily_goal_oz?: number | null
          enabled?: boolean | null
          end_time?: string | null
          id?: string
          reminder_interval_minutes?: number | null
          start_time?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          daily_goal_oz?: number | null
          enabled?: boolean | null
          end_time?: string | null
          id?: string
          reminder_interval_minutes?: number | null
          start_time?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      injury_education_content: {
        Row: {
          content_json: Json
          created_at: string | null
          display_order: number | null
          id: string
          injury_id: string | null
          section_type: string
          sport: string | null
          updated_at: string | null
        }
        Insert: {
          content_json?: Json
          created_at?: string | null
          display_order?: number | null
          id?: string
          injury_id?: string | null
          section_type: string
          sport?: string | null
          updated_at?: string | null
        }
        Update: {
          content_json?: Json
          created_at?: string | null
          display_order?: number | null
          id?: string
          injury_id?: string | null
          section_type?: string
          sport?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "injury_education_content_injury_id_fkey"
            columns: ["injury_id"]
            isOneToOne: false
            referencedRelation: "injury_library"
            referencedColumns: ["id"]
          },
        ]
      }
      injury_library: {
        Row: {
          body_area: string
          created_at: string | null
          description: string
          id: string
          impact_on_performance: string | null
          name: string
          severity_range: string
          sport_relevance: string[] | null
          symptoms: string[]
          typical_timeline: string | null
        }
        Insert: {
          body_area: string
          created_at?: string | null
          description: string
          id?: string
          impact_on_performance?: string | null
          name: string
          severity_range?: string
          sport_relevance?: string[] | null
          symptoms?: string[]
          typical_timeline?: string | null
        }
        Update: {
          body_area?: string
          created_at?: string | null
          description?: string
          id?: string
          impact_on_performance?: string | null
          name?: string
          severity_range?: string
          sport_relevance?: string[] | null
          symptoms?: string[]
          typical_timeline?: string | null
        }
        Relationships: []
      }
      lesson_trainers: {
        Row: {
          created_at: string
          facility: string | null
          id: string
          name: string
          specializations: string[] | null
          sport: string | null
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          facility?: string | null
          id?: string
          name: string
          specializations?: string[] | null
          sport?: string | null
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          facility?: string | null
          id?: string
          name?: string
          specializations?: string[] | null
          sport?: string | null
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      meal_templates: {
        Row: {
          created_at: string | null
          id: string
          is_favorite: boolean | null
          meals: Json | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          meals?: Json | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_favorite?: boolean | null
          meals?: Json | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mental_health_journal: {
        Row: {
          content: string
          created_at: string | null
          emotion_tags: string[] | null
          entry_type: string
          id: string
          is_private: boolean | null
          mood_level: number | null
          prompt_id: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          emotion_tags?: string[] | null
          entry_type: string
          id?: string
          is_private?: boolean | null
          mood_level?: number | null
          prompt_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          emotion_tags?: string[] | null
          entry_type?: string
          id?: string
          is_private?: boolean | null
          mood_level?: number | null
          prompt_id?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mental_health_journal_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "mental_health_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
      mental_health_prompts: {
        Row: {
          category: string
          created_at: string | null
          difficulty_level: string | null
          id: string
          is_active: boolean | null
          prompt_text: string
        }
        Insert: {
          category: string
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          prompt_text: string
        }
        Update: {
          category?: string
          created_at?: string | null
          difficulty_level?: string | null
          id?: string
          is_active?: boolean | null
          prompt_text?: string
        }
        Relationships: []
      }
      mind_fuel_challenges: {
        Row: {
          challenge_id: string
          challenge_week: number
          challenge_year: number
          completed_at: string | null
          created_at: string | null
          days_completed: number
          id: string
          last_checkin_at: string | null
          started_at: string
          status: string
          total_days: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          challenge_id: string
          challenge_week: number
          challenge_year: number
          completed_at?: string | null
          created_at?: string | null
          days_completed?: number
          id?: string
          last_checkin_at?: string | null
          started_at?: string
          status?: string
          total_days?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          challenge_id?: string
          challenge_week?: number
          challenge_year?: number
          completed_at?: string | null
          created_at?: string | null
          days_completed?: number
          id?: string
          last_checkin_at?: string | null
          started_at?: string
          status?: string
          total_days?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mind_fuel_daily_tasks: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          task_date: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          task_date?: string
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          task_date?: string
          task_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_fuel_education_progress: {
        Row: {
          completed_at: string
          created_at: string | null
          education_type: string
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          created_at?: string | null
          education_type: string
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          created_at?: string | null
          education_type?: string
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: []
      }
      mind_fuel_lessons: {
        Row: {
          author: string | null
          category: string
          content_type: string
          created_at: string | null
          id: string
          is_ai_generated: boolean | null
          lesson_text: string
          sport: string | null
          subcategory: string
          updated_at: string | null
        }
        Insert: {
          author?: string | null
          category: string
          content_type: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          lesson_text: string
          sport?: string | null
          subcategory: string
          updated_at?: string | null
        }
        Update: {
          author?: string | null
          category?: string
          content_type?: string
          created_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          lesson_text?: string
          sport?: string | null
          subcategory?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      mind_fuel_streaks: {
        Row: {
          badges_earned: string[] | null
          categories_explored: Json | null
          created_at: string | null
          current_streak: number
          id: string
          last_visit_date: string | null
          lessons_collected: number
          longest_streak: number
          total_visits: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges_earned?: string[] | null
          categories_explored?: Json | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_visit_date?: string | null
          lessons_collected?: number
          longest_streak?: number
          total_visits?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges_earned?: string[] | null
          categories_explored?: Json | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_visit_date?: string | null
          lessons_collected?: number
          longest_streak?: number
          total_visits?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      mindfulness_sessions: {
        Row: {
          completed: boolean | null
          created_at: string | null
          duration_seconds: number
          id: string
          mood_after: number | null
          mood_before: number | null
          notes: string | null
          session_date: string | null
          session_type: string
          technique: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          session_date?: string | null
          session_type: string
          technique?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          duration_seconds?: number
          id?: string
          mood_after?: number | null
          mood_before?: number | null
          notes?: string | null
          session_date?: string | null
          session_type?: string
          technique?: string | null
          user_id?: string
        }
        Relationships: []
      }
      monthly_reports: {
        Row: {
          created_at: string | null
          downloaded_at: string | null
          id: string
          report_data: Json
          report_period_end: string
          report_period_start: string
          saved_to_library: boolean | null
          status: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string | null
          downloaded_at?: string | null
          id?: string
          report_data?: Json
          report_period_end: string
          report_period_start: string
          saved_to_library?: boolean | null
          status?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string | null
          downloaded_at?: string | null
          id?: string
          report_data?: Json
          report_period_end?: string
          report_period_start?: string
          saved_to_library?: boolean | null
          status?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      mpi_scores: {
        Row: {
          adjusted_global_score: number | null
          calculation_date: string
          composite_bqi: number | null
          composite_competitive: number | null
          composite_decision: number | null
          composite_fqi: number | null
          composite_pei: number | null
          contract_status_modifier: number | null
          created_at: string
          delta_maturity_index: number | null
          development_prompts: Json | null
          fatigue_correlation_flag: boolean | null
          game_practice_ratio: number | null
          global_percentile: number | null
          global_rank: number | null
          hof_probability: number | null
          hof_tracking_active: boolean | null
          id: string
          integrity_score: number | null
          mlb_season_count: number | null
          pro_probability: number | null
          pro_probability_capped: boolean | null
          segment_pool: string | null
          sport: string
          total_athletes_in_pool: number | null
          trend_delta_30d: number | null
          trend_direction: string | null
          user_id: string
          verified_stat_boost: number | null
        }
        Insert: {
          adjusted_global_score?: number | null
          calculation_date: string
          composite_bqi?: number | null
          composite_competitive?: number | null
          composite_decision?: number | null
          composite_fqi?: number | null
          composite_pei?: number | null
          contract_status_modifier?: number | null
          created_at?: string
          delta_maturity_index?: number | null
          development_prompts?: Json | null
          fatigue_correlation_flag?: boolean | null
          game_practice_ratio?: number | null
          global_percentile?: number | null
          global_rank?: number | null
          hof_probability?: number | null
          hof_tracking_active?: boolean | null
          id?: string
          integrity_score?: number | null
          mlb_season_count?: number | null
          pro_probability?: number | null
          pro_probability_capped?: boolean | null
          segment_pool?: string | null
          sport: string
          total_athletes_in_pool?: number | null
          trend_delta_30d?: number | null
          trend_direction?: string | null
          user_id: string
          verified_stat_boost?: number | null
        }
        Update: {
          adjusted_global_score?: number | null
          calculation_date?: string
          composite_bqi?: number | null
          composite_competitive?: number | null
          composite_decision?: number | null
          composite_fqi?: number | null
          composite_pei?: number | null
          contract_status_modifier?: number | null
          created_at?: string
          delta_maturity_index?: number | null
          development_prompts?: Json | null
          fatigue_correlation_flag?: boolean | null
          game_practice_ratio?: number | null
          global_percentile?: number | null
          global_rank?: number | null
          hof_probability?: number | null
          hof_tracking_active?: boolean | null
          id?: string
          integrity_score?: number | null
          mlb_season_count?: number | null
          pro_probability?: number | null
          pro_probability_capped?: boolean | null
          segment_pool?: string | null
          sport?: string
          total_athletes_in_pool?: number | null
          trend_delta_30d?: number | null
          trend_direction?: string | null
          user_id?: string
          verified_stat_boost?: number | null
        }
        Relationships: []
      }
      nutrition_daily_tips: {
        Row: {
          category: string
          created_at: string | null
          generated_at: string | null
          id: string
          is_ai_generated: boolean | null
          sport: string | null
          tip_text: string
        }
        Insert: {
          category: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          sport?: string | null
          tip_text: string
        }
        Update: {
          category?: string
          created_at?: string | null
          generated_at?: string | null
          id?: string
          is_ai_generated?: boolean | null
          sport?: string | null
          tip_text?: string
        }
        Relationships: []
      }
      nutrition_food_database: {
        Row: {
          barcode: string | null
          brand: string | null
          calories_per_serving: number | null
          carbs_g: number | null
          created_at: string | null
          created_by: string | null
          external_id: string | null
          fats_g: number | null
          fiber_g: number | null
          id: string
          name: string
          protein_g: number | null
          serving_size: string | null
          serving_size_grams: number | null
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          fats_g?: number | null
          fiber_g?: number | null
          id?: string
          name: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          fats_g?: number | null
          fiber_g?: number | null
          id?: string
          name?: string
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
        }
        Relationships: []
      }
      nutrition_meal_templates: {
        Row: {
          created_at: string | null
          description: string | null
          food_items: Json | null
          id: string
          is_favorite: boolean | null
          meal_type: string | null
          name: string
          prep_time_minutes: number | null
          total_calories: number | null
          total_carbs_g: number | null
          total_fats_g: number | null
          total_protein_g: number | null
          updated_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          food_items?: Json | null
          id?: string
          is_favorite?: boolean | null
          meal_type?: string | null
          name: string
          prep_time_minutes?: number | null
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fats_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          food_items?: Json | null
          id?: string
          is_favorite?: boolean | null
          meal_type?: string | null
          name?: string
          prep_time_minutes?: number | null
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fats_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_recipes: {
        Row: {
          cook_time_minutes: number | null
          created_at: string | null
          description: string | null
          id: string
          ingredients: Json
          is_favorite: boolean | null
          last_used_at: string | null
          name: string
          prep_time_minutes: number | null
          servings: number
          total_calories: number | null
          total_carbs_g: number | null
          total_fats_g: number | null
          total_fiber_g: number | null
          total_protein_g: number | null
          updated_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          cook_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          ingredients?: Json
          is_favorite?: boolean | null
          last_used_at?: string | null
          name: string
          prep_time_minutes?: number | null
          servings?: number
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fats_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          cook_time_minutes?: number | null
          created_at?: string | null
          description?: string | null
          id?: string
          ingredients?: Json
          is_favorite?: boolean | null
          last_used_at?: string | null
          name?: string
          prep_time_minutes?: number | null
          servings?: number
          total_calories?: number | null
          total_carbs_g?: number | null
          total_fats_g?: number | null
          total_fiber_g?: number | null
          total_protein_g?: number | null
          updated_at?: string | null
          use_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      nutrition_streaks: {
        Row: {
          badges_earned: string[] | null
          created_at: string | null
          current_streak: number
          hydration_streak: number | null
          id: string
          last_hydration_date: string | null
          last_meal_log_date: string | null
          last_supplement_date: string | null
          last_visit_date: string | null
          longest_streak: number
          meal_logging_streak: number | null
          supplement_streak: number | null
          tips_collected: number
          total_visits: number
          updated_at: string | null
          user_id: string
          weekly_consistency_score: number | null
        }
        Insert: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number
          hydration_streak?: number | null
          id?: string
          last_hydration_date?: string | null
          last_meal_log_date?: string | null
          last_supplement_date?: string | null
          last_visit_date?: string | null
          longest_streak?: number
          meal_logging_streak?: number | null
          supplement_streak?: number | null
          tips_collected?: number
          total_visits?: number
          updated_at?: string | null
          user_id: string
          weekly_consistency_score?: number | null
        }
        Update: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number
          hydration_streak?: number | null
          id?: string
          last_hydration_date?: string | null
          last_meal_log_date?: string | null
          last_supplement_date?: string | null
          last_visit_date?: string | null
          longest_streak?: number
          meal_logging_streak?: number | null
          supplement_streak?: number | null
          tips_collected?: number
          total_visits?: number
          updated_at?: string | null
          user_id?: string
          weekly_consistency_score?: number | null
        }
        Relationships: []
      }
      organization_members: {
        Row: {
          id: string
          invitation_status: string | null
          invited_email: string | null
          joined_at: string
          organization_id: string
          removed_at: string | null
          role_in_org: string
          status: string | null
          user_id: string
        }
        Insert: {
          id?: string
          invitation_status?: string | null
          invited_email?: string | null
          joined_at?: string
          organization_id: string
          removed_at?: string | null
          role_in_org?: string
          status?: string | null
          user_id: string
        }
        Update: {
          id?: string
          invitation_status?: string | null
          invited_email?: string | null
          joined_at?: string
          organization_id?: string
          removed_at?: string | null
          role_in_org?: string
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          invite_code: string | null
          invite_expires_at: string | null
          logo_url: string | null
          name: string
          org_type: string
          owner_user_id: string
          sport: string
          updated_at: string
          verified: boolean | null
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          logo_url?: string | null
          name: string
          org_type: string
          owner_user_id: string
          sport: string
          updated_at?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string | null
          invite_expires_at?: string | null
          logo_url?: string | null
          name?: string
          org_type?: string
          owner_user_id?: string
          sport?: string
          updated_at?: string
          verified?: boolean | null
          verified_by?: string | null
        }
        Relationships: []
      }
      performance_sessions: {
        Row: {
          batting_side_used: string | null
          calendar_event_id: string | null
          coach_grade: number | null
          coach_id: string | null
          composite_indexes: Json | null
          created_at: string
          data_density_level: number | null
          deleted_at: string | null
          drill_blocks: Json
          edited_at: string | null
          effective_grade: number | null
          fatigue_state_at_session: Json | null
          id: string
          intent_compliance_pct: number | null
          is_locked: boolean | null
          is_retroactive: boolean | null
          micro_layer_data: Json | null
          module: string | null
          notes: string | null
          opponent_level: string | null
          opponent_name: string | null
          organization_id: string | null
          player_grade: number | null
          season_context: string | null
          session_date: string
          session_type: string
          sport: string
          throwing_hand_used: string | null
          updated_at: string
          user_id: string
          voice_notes: string[] | null
        }
        Insert: {
          batting_side_used?: string | null
          calendar_event_id?: string | null
          coach_grade?: number | null
          coach_id?: string | null
          composite_indexes?: Json | null
          created_at?: string
          data_density_level?: number | null
          deleted_at?: string | null
          drill_blocks?: Json
          edited_at?: string | null
          effective_grade?: number | null
          fatigue_state_at_session?: Json | null
          id?: string
          intent_compliance_pct?: number | null
          is_locked?: boolean | null
          is_retroactive?: boolean | null
          micro_layer_data?: Json | null
          module?: string | null
          notes?: string | null
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          player_grade?: number | null
          season_context?: string | null
          session_date?: string
          session_type: string
          sport: string
          throwing_hand_used?: string | null
          updated_at?: string
          user_id: string
          voice_notes?: string[] | null
        }
        Update: {
          batting_side_used?: string | null
          calendar_event_id?: string | null
          coach_grade?: number | null
          coach_id?: string | null
          composite_indexes?: Json | null
          created_at?: string
          data_density_level?: number | null
          deleted_at?: string | null
          drill_blocks?: Json
          edited_at?: string | null
          effective_grade?: number | null
          fatigue_state_at_session?: Json | null
          id?: string
          intent_compliance_pct?: number | null
          is_locked?: boolean | null
          is_retroactive?: boolean | null
          micro_layer_data?: Json | null
          module?: string | null
          notes?: string | null
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          player_grade?: number | null
          season_context?: string | null
          session_date?: string
          session_type?: string
          sport?: string
          throwing_hand_used?: string | null
          updated_at?: string
          user_id?: string
          voice_notes?: string[] | null
        }
        Relationships: []
      }
      physio_adult_tracking: {
        Row: {
          created_at: string
          cycle_day: number | null
          cycle_phase: string | null
          id: string
          libido_level: number | null
          mood_stability: number | null
          period_active: boolean | null
          sleep_quality_impact: number | null
          symptom_tags: string[] | null
          tracking_date: string
          updated_at: string
          user_id: string
          wellness_consistency: boolean | null
          wellness_consistency_text: string | null
        }
        Insert: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: string | null
          id?: string
          libido_level?: number | null
          mood_stability?: number | null
          period_active?: boolean | null
          sleep_quality_impact?: number | null
          symptom_tags?: string[] | null
          tracking_date?: string
          updated_at?: string
          user_id: string
          wellness_consistency?: boolean | null
          wellness_consistency_text?: string | null
        }
        Update: {
          created_at?: string
          cycle_day?: number | null
          cycle_phase?: string | null
          id?: string
          libido_level?: number | null
          mood_stability?: number | null
          period_active?: boolean | null
          sleep_quality_impact?: number | null
          symptom_tags?: string[] | null
          tracking_date?: string
          updated_at?: string
          user_id?: string
          wellness_consistency?: boolean | null
          wellness_consistency_text?: string | null
        }
        Relationships: []
      }
      physio_daily_reports: {
        Row: {
          calendar_score: number | null
          created_at: string
          fuel_score: number | null
          id: string
          load_score: number | null
          readiness_score: number | null
          regulation_color: string
          regulation_score: number
          report_date: string
          report_headline: string | null
          report_sections: Json | null
          restriction_score: number | null
          sleep_score: number | null
          stress_score: number | null
          suggestion_responses: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          calendar_score?: number | null
          created_at?: string
          fuel_score?: number | null
          id?: string
          load_score?: number | null
          readiness_score?: number | null
          regulation_color?: string
          regulation_score?: number
          report_date?: string
          report_headline?: string | null
          report_sections?: Json | null
          restriction_score?: number | null
          sleep_score?: number | null
          stress_score?: number | null
          suggestion_responses?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          calendar_score?: number | null
          created_at?: string
          fuel_score?: number | null
          id?: string
          load_score?: number | null
          readiness_score?: number | null
          regulation_color?: string
          regulation_score?: number
          report_date?: string
          report_headline?: string | null
          report_sections?: Json | null
          restriction_score?: number | null
          sleep_score?: number | null
          stress_score?: number | null
          suggestion_responses?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      physio_health_profiles: {
        Row: {
          active_illness: string | null
          adult_features_enabled: boolean
          allergies: string[] | null
          biological_sex: string | null
          blood_type: string | null
          contraceptive_type: string | null
          contraceptive_use: boolean | null
          created_at: string
          date_of_birth: string | null
          dietary_style: string | null
          food_intolerances: string[] | null
          id: string
          illness_started_at: string | null
          injury_history: string[] | null
          medical_conditions: string[] | null
          medications: string[] | null
          setup_completed: boolean
          supplements: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_illness?: string | null
          adult_features_enabled?: boolean
          allergies?: string[] | null
          biological_sex?: string | null
          blood_type?: string | null
          contraceptive_type?: string | null
          contraceptive_use?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          dietary_style?: string | null
          food_intolerances?: string[] | null
          id?: string
          illness_started_at?: string | null
          injury_history?: string[] | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          setup_completed?: boolean
          supplements?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_illness?: string | null
          adult_features_enabled?: boolean
          allergies?: string[] | null
          biological_sex?: string | null
          blood_type?: string | null
          contraceptive_type?: string | null
          contraceptive_use?: boolean | null
          created_at?: string
          date_of_birth?: string | null
          dietary_style?: string | null
          food_intolerances?: string[] | null
          id?: string
          illness_started_at?: string | null
          injury_history?: string[] | null
          medical_conditions?: string[] | null
          medications?: string[] | null
          setup_completed?: boolean
          supplements?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      player_notes: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          player_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          player_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          player_id?: string
          updated_at?: string
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
          act_score: number | null
          activity_level: string | null
          avatar_url: string | null
          batting_side: Database["public"]["Enums"]["batting_side"] | null
          bio: string | null
          college_grad_year: number | null
          color_preferences: Json | null
          commitment_status:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email: string | null
          created_at: string | null
          credentials: string[] | null
          currently_in_high_school: boolean | null
          date_of_birth: string | null
          enrolled_in_college: boolean | null
          experience_level: string | null
          first_name: string | null
          full_name: string | null
          gpa: number | null
          graduation_year: number | null
          height: string | null
          height_inches: number | null
          high_school_grad_year: number | null
          id: string
          independent_league: string | null
          is_ambidextrous_thrower: boolean | null
          is_foreign_player: boolean | null
          is_free_agent: boolean | null
          is_professional: boolean | null
          is_switch_hitter: boolean | null
          last_name: string | null
          mlb_affiliate: string | null
          ncaa_id: string | null
          position: string | null
          preferred_language: string | null
          primary_batting_side: string | null
          primary_throwing_hand: string | null
          sat_score: number | null
          sex: string | null
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
          act_score?: number | null
          activity_level?: string | null
          avatar_url?: string | null
          batting_side?: Database["public"]["Enums"]["batting_side"] | null
          bio?: string | null
          college_grad_year?: number | null
          color_preferences?: Json | null
          commitment_status?:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email?: string | null
          created_at?: string | null
          credentials?: string[] | null
          currently_in_high_school?: boolean | null
          date_of_birth?: string | null
          enrolled_in_college?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gpa?: number | null
          graduation_year?: number | null
          height?: string | null
          height_inches?: number | null
          high_school_grad_year?: number | null
          id: string
          independent_league?: string | null
          is_ambidextrous_thrower?: boolean | null
          is_foreign_player?: boolean | null
          is_free_agent?: boolean | null
          is_professional?: boolean | null
          is_switch_hitter?: boolean | null
          last_name?: string | null
          mlb_affiliate?: string | null
          ncaa_id?: string | null
          position?: string | null
          preferred_language?: string | null
          primary_batting_side?: string | null
          primary_throwing_hand?: string | null
          sat_score?: number | null
          sex?: string | null
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
          act_score?: number | null
          activity_level?: string | null
          avatar_url?: string | null
          batting_side?: Database["public"]["Enums"]["batting_side"] | null
          bio?: string | null
          college_grad_year?: number | null
          color_preferences?: Json | null
          commitment_status?:
            | Database["public"]["Enums"]["commitment_status"]
            | null
          contact_email?: string | null
          created_at?: string | null
          credentials?: string[] | null
          currently_in_high_school?: boolean | null
          date_of_birth?: string | null
          enrolled_in_college?: boolean | null
          experience_level?: string | null
          first_name?: string | null
          full_name?: string | null
          gpa?: number | null
          graduation_year?: number | null
          height?: string | null
          height_inches?: number | null
          high_school_grad_year?: number | null
          id?: string
          independent_league?: string | null
          is_ambidextrous_thrower?: boolean | null
          is_foreign_player?: boolean | null
          is_free_agent?: boolean | null
          is_professional?: boolean | null
          is_switch_hitter?: boolean | null
          last_name?: string | null
          mlb_affiliate?: string | null
          ncaa_id?: string | null
          position?: string | null
          preferred_language?: string | null
          primary_batting_side?: string | null
          primary_throwing_hand?: string | null
          sat_score?: number | null
          sex?: string | null
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
      roadmap_milestones: {
        Row: {
          badge_icon: string | null
          badge_name: string | null
          created_at: string
          id: string
          milestone_name: string
          milestone_order: number | null
          module: string
          requirements: Json
          sport: string
        }
        Insert: {
          badge_icon?: string | null
          badge_name?: string | null
          created_at?: string
          id?: string
          milestone_name: string
          milestone_order?: number | null
          module: string
          requirements?: Json
          sport: string
        }
        Update: {
          badge_icon?: string | null
          badge_name?: string | null
          created_at?: string
          id?: string
          milestone_name?: string
          milestone_order?: number | null
          module?: string
          requirements?: Json
          sport?: string
        }
        Relationships: []
      }
      running_presets: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_minutes: number | null
          id: string
          is_system: boolean | null
          name: string
          preset_data: Json
          sport: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_system?: boolean | null
          name: string
          preset_data?: Json
          sport?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          id?: string
          is_system?: boolean | null
          name?: string
          preset_data?: Json
          sport?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      running_sessions: {
        Row: {
          actual_time: string | null
          cns_load: number | null
          completed: boolean | null
          completed_at: string | null
          contacts: number | null
          created_at: string | null
          distance_unit: string | null
          distance_value: number | null
          environment_notes: string | null
          fatigue_state: string | null
          ground_contacts_total: number | null
          id: string
          intent: string
          intervals: Json | null
          notes: string | null
          pre_run_stiffness: number | null
          reps: number | null
          run_type: string
          shoe_type: string | null
          surface: string | null
          template_id: string | null
          time_goal: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          actual_time?: string | null
          cns_load?: number | null
          completed?: boolean | null
          completed_at?: string | null
          contacts?: number | null
          created_at?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          environment_notes?: string | null
          fatigue_state?: string | null
          ground_contacts_total?: number | null
          id?: string
          intent?: string
          intervals?: Json | null
          notes?: string | null
          pre_run_stiffness?: number | null
          reps?: number | null
          run_type?: string
          shoe_type?: string | null
          surface?: string | null
          template_id?: string | null
          time_goal?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          actual_time?: string | null
          cns_load?: number | null
          completed?: boolean | null
          completed_at?: string | null
          contacts?: number | null
          created_at?: string | null
          distance_unit?: string | null
          distance_value?: number | null
          environment_notes?: string | null
          fatigue_state?: string | null
          ground_contacts_total?: number | null
          id?: string
          intent?: string
          intervals?: Json | null
          notes?: string | null
          pre_run_stiffness?: number | null
          reps?: number | null
          run_type?: string
          shoe_type?: string | null
          surface?: string | null
          template_id?: string | null
          time_goal?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "running_sessions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_applications: {
        Row: {
          applying_as: string | null
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
          applying_as?: string | null
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
          applying_as?: string | null
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
      scout_evaluations: {
        Row: {
          athlete_id: string
          created_at: string
          evaluation_date: string
          game_context: string | null
          id: string
          notes: string | null
          overall_grade: number | null
          scout_id: string
          sport: string
          tool_grades: Json
        }
        Insert: {
          athlete_id: string
          created_at?: string
          evaluation_date: string
          game_context?: string | null
          id?: string
          notes?: string | null
          overall_grade?: number | null
          scout_id: string
          sport: string
          tool_grades?: Json
        }
        Update: {
          athlete_id?: string
          created_at?: string
          evaluation_date?: string
          game_context?: string | null
          id?: string
          notes?: string | null
          overall_grade?: number | null
          scout_id?: string
          sport?: string
          tool_grades?: Json
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
            foreignKeyName: "scout_follows_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_follows_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_follows_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      scout_video_reviews: {
        Row: {
          id: string
          player_id: string
          reviewed_at: string
          scout_id: string
          video_id: string
        }
        Insert: {
          id?: string
          player_id: string
          reviewed_at?: string
          scout_id: string
          video_id: string
        }
        Update: {
          id?: string
          player_id?: string
          reviewed_at?: string
          scout_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scout_video_reviews_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_video_reviews_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scout_video_reviews_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "videos"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_activity_templates: {
        Row: {
          accepted_template_id: string | null
          id: string
          locked_fields: string[] | null
          message: string | null
          recipient_id: string
          responded_at: string | null
          sender_id: string
          sent_at: string | null
          status: string
          template_id: string
          template_snapshot: Json
        }
        Insert: {
          accepted_template_id?: string | null
          id?: string
          locked_fields?: string[] | null
          message?: string | null
          recipient_id: string
          responded_at?: string | null
          sender_id: string
          sent_at?: string | null
          status?: string
          template_id: string
          template_snapshot: Json
        }
        Update: {
          accepted_template_id?: string | null
          id?: string
          locked_fields?: string[] | null
          message?: string | null
          recipient_id?: string
          responded_at?: string | null
          sender_id?: string
          sent_at?: string | null
          status?: string
          template_id?: string
          template_snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sent_activity_templates_accepted_template_id_fkey"
            columns: ["accepted_template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_activity_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_activity_templates: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          is_public: boolean | null
          share_code: string
          template_id: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_code: string
          template_id?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          is_public?: boolean | null
          share_code?: string
          template_id?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_activity_templates_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      shopping_lists: {
        Row: {
          created_at: string | null
          date_range_end: string | null
          date_range_start: string | null
          id: string
          is_active: boolean | null
          items: Json | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          name?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_range_end?: string | null
          date_range_start?: string | null
          id?: string
          is_active?: boolean | null
          items?: Json | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      speed_goals: {
        Row: {
          adjustment_history: Json | null
          created_at: string
          current_track: string
          goal_distances: Json | null
          id: string
          last_adjustment_date: string | null
          personal_bests: Json | null
          program_status: string
          sport: string
          updated_at: string
          user_id: string
          weeks_without_improvement: number | null
        }
        Insert: {
          adjustment_history?: Json | null
          created_at?: string
          current_track?: string
          goal_distances?: Json | null
          id?: string
          last_adjustment_date?: string | null
          personal_bests?: Json | null
          program_status?: string
          sport: string
          updated_at?: string
          user_id: string
          weeks_without_improvement?: number | null
        }
        Update: {
          adjustment_history?: Json | null
          created_at?: string
          current_track?: string
          goal_distances?: Json | null
          id?: string
          last_adjustment_date?: string | null
          personal_bests?: Json | null
          program_status?: string
          sport?: string
          updated_at?: string
          user_id?: string
          weeks_without_improvement?: number | null
        }
        Relationships: []
      }
      speed_partner_timings: {
        Row: {
          created_at: string
          distance: string
          id: string
          session_id: string
          time_seconds: number
          timed_by: string
          user_id: string
        }
        Insert: {
          created_at?: string
          distance: string
          id?: string
          session_id: string
          time_seconds: number
          timed_by?: string
          user_id: string
        }
        Update: {
          created_at?: string
          distance?: string
          id?: string
          session_id?: string
          time_seconds?: number
          timed_by?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "speed_partner_timings_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "speed_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      speed_sessions: {
        Row: {
          body_feel_after: string | null
          body_feel_before: string | null
          created_at: string
          distances: Json | null
          drill_log: Json | null
          id: string
          is_break_day: boolean | null
          notes: string | null
          pain_areas: Json | null
          readiness_score: number | null
          rpe: number | null
          session_date: string
          session_number: number
          sleep_rating: number | null
          sport: string
          user_id: string
        }
        Insert: {
          body_feel_after?: string | null
          body_feel_before?: string | null
          created_at?: string
          distances?: Json | null
          drill_log?: Json | null
          id?: string
          is_break_day?: boolean | null
          notes?: string | null
          pain_areas?: Json | null
          readiness_score?: number | null
          rpe?: number | null
          session_date?: string
          session_number: number
          sleep_rating?: number | null
          sport: string
          user_id: string
        }
        Update: {
          body_feel_after?: string | null
          body_feel_before?: string | null
          created_at?: string
          distances?: Json | null
          drill_log?: Json | null
          id?: string
          is_break_day?: boolean | null
          notes?: string | null
          pain_areas?: Json | null
          readiness_score?: number | null
          rpe?: number | null
          session_date?: string
          session_number?: number
          sleep_rating?: number | null
          sport?: string
          user_id?: string
        }
        Relationships: []
      }
      stress_assessments: {
        Row: {
          assessment_date: string | null
          assessment_type: string
          created_at: string | null
          id: string
          recommendations: string[] | null
          responses: Json | null
          score: number
          severity: string | null
          user_id: string
        }
        Insert: {
          assessment_date?: string | null
          assessment_type: string
          created_at?: string | null
          id?: string
          recommendations?: string[] | null
          responses?: Json | null
          score: number
          severity?: string | null
          user_id: string
        }
        Update: {
          assessment_date?: string | null
          assessment_type?: string
          created_at?: string | null
          id?: string
          recommendations?: string[] | null
          responses?: Json | null
          score?: number
          severity?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sub_module_progress: {
        Row: {
          created_at: string | null
          current_cycle: number | null
          current_week: number | null
          day_completion_times: Json | null
          equipment_checklist: Json | null
          exercise_progress: Json | null
          experience_level: string | null
          id: string
          last_activity: string | null
          last_workout_date: string | null
          loops_completed: number | null
          module: string
          program_status: string
          sport: string
          started_at: string | null
          streak_last_updated: string | null
          sub_module: string
          total_workouts_completed: number | null
          updated_at: string | null
          user_id: string
          week_progress: Json | null
          weight_log: Json | null
          workout_streak_current: number | null
          workout_streak_longest: number | null
        }
        Insert: {
          created_at?: string | null
          current_cycle?: number | null
          current_week?: number | null
          day_completion_times?: Json | null
          equipment_checklist?: Json | null
          exercise_progress?: Json | null
          experience_level?: string | null
          id?: string
          last_activity?: string | null
          last_workout_date?: string | null
          loops_completed?: number | null
          module: string
          program_status?: string
          sport: string
          started_at?: string | null
          streak_last_updated?: string | null
          sub_module: string
          total_workouts_completed?: number | null
          updated_at?: string | null
          user_id: string
          week_progress?: Json | null
          weight_log?: Json | null
          workout_streak_current?: number | null
          workout_streak_longest?: number | null
        }
        Update: {
          created_at?: string | null
          current_cycle?: number | null
          current_week?: number | null
          day_completion_times?: Json | null
          equipment_checklist?: Json | null
          exercise_progress?: Json | null
          experience_level?: string | null
          id?: string
          last_activity?: string | null
          last_workout_date?: string | null
          loops_completed?: number | null
          module?: string
          program_status?: string
          sport?: string
          started_at?: string | null
          streak_last_updated?: string | null
          sub_module?: string
          total_workouts_completed?: number | null
          updated_at?: string | null
          user_id?: string
          week_progress?: Json | null
          weight_log?: Json | null
          workout_streak_current?: number | null
          workout_streak_longest?: number | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          coupon_code: string | null
          coupon_name: string | null
          created_at: string | null
          current_period_end: string
          discount_percent: number | null
          grandfathered_at: string | null
          grandfathered_price: string | null
          has_pending_cancellations: boolean | null
          id: string
          module_subscription_mapping: Json | null
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscribed_modules: string[] | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          coupon_code?: string | null
          coupon_name?: string | null
          created_at?: string | null
          current_period_end?: string
          discount_percent?: number | null
          grandfathered_at?: string | null
          grandfathered_price?: string | null
          has_pending_cancellations?: boolean | null
          id?: string
          module_subscription_mapping?: Json | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_modules?: string[] | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          coupon_code?: string | null
          coupon_name?: string | null
          created_at?: string | null
          current_period_end?: string
          discount_percent?: number | null
          grandfathered_at?: string | null
          grandfathered_price?: string | null
          has_pending_cancellations?: boolean | null
          id?: string
          module_subscription_mapping?: Json | null
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscribed_modules?: string[] | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_adaptive_difficulty: {
        Row: {
          accuracy_history: Json | null
          current_difficulty: number | null
          drill_type: string
          id: string
          recommended_adjustment: string | null
          speed_history: Json | null
          sport: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          accuracy_history?: Json | null
          current_difficulty?: number | null
          drill_type: string
          id?: string
          recommended_adjustment?: string | null
          speed_history?: Json | null
          sport: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          accuracy_history?: Json | null
          current_difficulty?: number | null
          drill_type?: string
          id?: string
          recommended_adjustment?: string | null
          speed_history?: Json | null
          sport?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_daily_checklist: {
        Row: {
          all_complete: boolean | null
          checklist_items: Json
          completed_at: string | null
          created_at: string | null
          entry_date: string
          id: string
          user_id: string
        }
        Insert: {
          all_complete?: boolean | null
          checklist_items?: Json
          completed_at?: string | null
          created_at?: string | null
          entry_date: string
          id?: string
          user_id: string
        }
        Update: {
          all_complete?: boolean | null
          checklist_items?: Json
          completed_at?: string | null
          created_at?: string | null
          entry_date?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_daily_drill_selection: {
        Row: {
          created_at: string | null
          id: string
          selected_drills: Json
          selection_date: string
          selection_reasons: Json | null
          sport: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          selected_drills: Json
          selection_date: string
          selection_reasons?: Json | null
          sport?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          selected_drills?: Json
          selection_date?: string
          selection_reasons?: Json | null
          sport?: string
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_drill_results: {
        Row: {
          accuracy_percent: number | null
          completed_at: string | null
          difficulty_level: number | null
          drill_metrics: Json | null
          drill_type: string
          false_positives: number | null
          fatigue_score: number | null
          id: string
          reaction_time_ms: number | null
          session_id: string
          tier: string
          user_id: string
        }
        Insert: {
          accuracy_percent?: number | null
          completed_at?: string | null
          difficulty_level?: number | null
          drill_metrics?: Json | null
          drill_type: string
          false_positives?: number | null
          fatigue_score?: number | null
          id?: string
          reaction_time_ms?: number | null
          session_id: string
          tier: string
          user_id: string
        }
        Update: {
          accuracy_percent?: number | null
          completed_at?: string | null
          difficulty_level?: number | null
          drill_metrics?: Json | null
          drill_type?: string
          false_positives?: number | null
          fatigue_score?: number | null
          id?: string
          reaction_time_ms?: number | null
          session_id?: string
          tier?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tex_vision_drill_results_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "tex_vision_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      tex_vision_metrics: {
        Row: {
          anticipation_quotient: number | null
          coordination_efficiency: number | null
          early_late_bias: number | null
          id: string
          left_right_bias: number | null
          metrics_history: Json | null
          neuro_reaction_index: number | null
          plateau_detected_at: string | null
          sport: string
          stress_resilience_score: number | null
          updated_at: string | null
          user_id: string
          visual_processing_speed: number | null
        }
        Insert: {
          anticipation_quotient?: number | null
          coordination_efficiency?: number | null
          early_late_bias?: number | null
          id?: string
          left_right_bias?: number | null
          metrics_history?: Json | null
          neuro_reaction_index?: number | null
          plateau_detected_at?: string | null
          sport: string
          stress_resilience_score?: number | null
          updated_at?: string | null
          user_id: string
          visual_processing_speed?: number | null
        }
        Update: {
          anticipation_quotient?: number | null
          coordination_efficiency?: number | null
          early_late_bias?: number | null
          id?: string
          left_right_bias?: number | null
          metrics_history?: Json | null
          neuro_reaction_index?: number | null
          plateau_detected_at?: string | null
          sport?: string
          stress_resilience_score?: number | null
          updated_at?: string | null
          user_id?: string
          visual_processing_speed?: number | null
        }
        Relationships: []
      }
      tex_vision_personal_bests: {
        Row: {
          achieved_at: string | null
          best_accuracy_percent: number | null
          best_reaction_time_ms: number | null
          best_streak: number | null
          drill_type: string
          id: string
          tier: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          achieved_at?: string | null
          best_accuracy_percent?: number | null
          best_reaction_time_ms?: number | null
          best_streak?: number | null
          drill_type: string
          id?: string
          tier: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          achieved_at?: string | null
          best_accuracy_percent?: number | null
          best_reaction_time_ms?: number | null
          best_streak?: number | null
          drill_type?: string
          id?: string
          tier?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_progress: {
        Row: {
          created_at: string | null
          current_tier: string | null
          id: string
          last_session_date: string | null
          sport: string
          streak_current: number | null
          streak_longest: number | null
          total_sessions_completed: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_tier?: string | null
          id?: string
          last_session_date?: string | null
          sport: string
          streak_current?: number | null
          streak_longest?: number | null
          total_sessions_completed?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_tier?: string | null
          id?: string
          last_session_date?: string | null
          sport?: string
          streak_current?: number | null
          streak_longest?: number | null
          total_sessions_completed?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_s2_diagnostics: {
        Row: {
          comparison_vs_prior: Json | null
          completed_at: string | null
          decision_efficiency_score: number | null
          fatigue_index_score: number | null
          id: string
          impulse_control_score: number | null
          next_test_date: string | null
          overall_score: number | null
          peripheral_awareness_score: number | null
          processing_speed_score: number | null
          processing_under_load_score: number | null
          sport: string
          test_date: string
          user_id: string
          visual_motor_integration_score: number | null
          visual_tracking_score: number | null
        }
        Insert: {
          comparison_vs_prior?: Json | null
          completed_at?: string | null
          decision_efficiency_score?: number | null
          fatigue_index_score?: number | null
          id?: string
          impulse_control_score?: number | null
          next_test_date?: string | null
          overall_score?: number | null
          peripheral_awareness_score?: number | null
          processing_speed_score?: number | null
          processing_under_load_score?: number | null
          sport: string
          test_date: string
          user_id: string
          visual_motor_integration_score?: number | null
          visual_tracking_score?: number | null
        }
        Update: {
          comparison_vs_prior?: Json | null
          completed_at?: string | null
          decision_efficiency_score?: number | null
          fatigue_index_score?: number | null
          id?: string
          impulse_control_score?: number | null
          next_test_date?: string | null
          overall_score?: number | null
          peripheral_awareness_score?: number | null
          processing_speed_score?: number | null
          processing_under_load_score?: number | null
          sport?: string
          test_date?: string
          user_id?: string
          visual_motor_integration_score?: number | null
          visual_tracking_score?: number | null
        }
        Relationships: []
      }
      tex_vision_sessions: {
        Row: {
          completed_at: string | null
          created_at: string | null
          drills_completed: number
          duration_minutes: number
          fatigue_ended: boolean | null
          id: string
          reflection_text: string | null
          session_date: string
          sport: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          drills_completed: number
          duration_minutes: number
          fatigue_ended?: boolean | null
          id?: string
          reflection_text?: string | null
          session_date: string
          sport: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          drills_completed?: number
          duration_minutes?: number
          fatigue_ended?: boolean | null
          id?: string
          reflection_text?: string | null
          session_date?: string
          sport?: string
          user_id?: string
        }
        Relationships: []
      }
      tex_vision_unlocks: {
        Row: {
          id: string
          sport: string
          unlock_type: string
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          sport: string
          unlock_type: string
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          sport?: string
          unlock_type?: string
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      thought_logs: {
        Row: {
          automatic_thought: string
          balanced_thought: string | null
          cognitive_distortion: string[] | null
          created_at: string | null
          emotion_intensity: number | null
          emotions: string[] | null
          evidence_against: string | null
          evidence_for: string | null
          id: string
          outcome_emotion: string | null
          outcome_intensity: number | null
          situation: string
          user_id: string
        }
        Insert: {
          automatic_thought: string
          balanced_thought?: string | null
          cognitive_distortion?: string[] | null
          created_at?: string | null
          emotion_intensity?: number | null
          emotions?: string[] | null
          evidence_against?: string | null
          evidence_for?: string | null
          id?: string
          outcome_emotion?: string | null
          outcome_intensity?: number | null
          situation: string
          user_id: string
        }
        Update: {
          automatic_thought?: string
          balanced_thought?: string | null
          cognitive_distortion?: string[] | null
          created_at?: string | null
          emotion_intensity?: number | null
          emotions?: string[] | null
          evidence_against?: string | null
          evidence_for?: string | null
          id?: string
          outcome_emotion?: string | null
          outcome_intensity?: number | null
          situation?: string
          user_id?: string
        }
        Relationships: []
      }
      timeline_schedule_templates: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          schedule: Json
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          schedule?: Json
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          schedule?: Json
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
      user_food_history: {
        Row: {
          created_at: string | null
          food_id: string
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          use_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          food_id: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          use_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          food_id?: string
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          use_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_food_history_food_id_fkey"
            columns: ["food_id"]
            isOneToOne: false
            referencedRelation: "nutrition_food_database"
            referencedColumns: ["id"]
          },
        ]
      }
      user_injury_progress: {
        Row: {
          badges_earned: string[] | null
          created_at: string | null
          current_streak: number
          id: string
          last_visit_date: string | null
          longest_streak: number
          quizzes_passed: string[] | null
          sections_completed: string[] | null
          total_sections_viewed: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_visit_date?: string | null
          longest_streak?: number
          quizzes_passed?: string[] | null
          sections_completed?: string[] | null
          total_sections_viewed?: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number
          id?: string
          last_visit_date?: string | null
          longest_streak?: number
          quizzes_passed?: string[] | null
          sections_completed?: string[] | null
          total_sections_viewed?: number
          updated_at?: string | null
          user_id?: string
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
      user_report_cycles: {
        Row: {
          created_at: string | null
          cycle_start_date: string
          id: string
          next_report_date: string
          reports_generated: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          cycle_start_date: string
          id?: string
          next_report_date: string
          reports_generated?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          cycle_start_date?: string
          id?: string
          next_report_date?: string
          reports_generated?: number | null
          updated_at?: string | null
          user_id?: string
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
      user_viewed_lessons: {
        Row: {
          id: string
          lesson_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          lesson_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          lesson_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_viewed_lessons_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "mind_fuel_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      user_viewed_tips: {
        Row: {
          id: string
          tip_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          tip_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          tip_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_viewed_tips_tip_id_fkey"
            columns: ["tip_id"]
            isOneToOne: false
            referencedRelation: "nutrition_daily_tips"
            referencedColumns: ["id"]
          },
        ]
      }
      vault_entries: {
        Row: {
          created_at: string | null
          entry_date: string
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_date?: string
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_favorite_meals: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          fats_g: number | null
          hydration_oz: number | null
          id: string
          last_used_at: string | null
          meal_name: string
          meal_type: string | null
          protein_g: number | null
          supplements: Json | null
          usage_count: number | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fats_g?: number | null
          hydration_oz?: number | null
          id?: string
          last_used_at?: string | null
          meal_name: string
          meal_type?: string | null
          protein_g?: number | null
          supplements?: Json | null
          usage_count?: number | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          fats_g?: number | null
          hydration_oz?: number | null
          id?: string
          last_used_at?: string | null
          meal_name?: string
          meal_type?: string | null
          protein_g?: number | null
          supplements?: Json | null
          usage_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
      vault_focus_quizzes: {
        Row: {
          appetite: string | null
          balance_duration_seconds: number | null
          balance_left_seconds: number | null
          balance_right_seconds: number | null
          bedtime_goal: string | null
          created_at: string | null
          daily_intentions: string | null
          daily_motivation: string | null
          discipline_level: number | null
          emotional_state: number
          entry_date: string
          hours_slept: number | null
          id: string
          mental_energy: number | null
          mental_readiness: number
          mood_level: number | null
          movement_restriction: Json | null
          pain_increases_with_movement: boolean | null
          pain_location: string[] | null
          pain_movement_per_area: Json | null
          pain_scale: number | null
          pain_scales: Json | null
          pain_tissue_types: Json | null
          perceived_recovery: number | null
          physical_readiness: number
          quiz_type: string
          reaction_time_ms: number | null
          reaction_time_score: number | null
          reflection_did_well: string | null
          reflection_improve: string | null
          reflection_learned: string | null
          reflection_motivation: string | null
          resting_hr: number | null
          sleep_quality: number | null
          sleep_time: string | null
          stress_level: number | null
          stress_sources: string[] | null
          training_intent: string[] | null
          user_id: string
          wake_time: string | null
          wake_time_goal: string | null
          weight_lbs: number | null
        }
        Insert: {
          appetite?: string | null
          balance_duration_seconds?: number | null
          balance_left_seconds?: number | null
          balance_right_seconds?: number | null
          bedtime_goal?: string | null
          created_at?: string | null
          daily_intentions?: string | null
          daily_motivation?: string | null
          discipline_level?: number | null
          emotional_state: number
          entry_date?: string
          hours_slept?: number | null
          id?: string
          mental_energy?: number | null
          mental_readiness: number
          mood_level?: number | null
          movement_restriction?: Json | null
          pain_increases_with_movement?: boolean | null
          pain_location?: string[] | null
          pain_movement_per_area?: Json | null
          pain_scale?: number | null
          pain_scales?: Json | null
          pain_tissue_types?: Json | null
          perceived_recovery?: number | null
          physical_readiness: number
          quiz_type: string
          reaction_time_ms?: number | null
          reaction_time_score?: number | null
          reflection_did_well?: string | null
          reflection_improve?: string | null
          reflection_learned?: string | null
          reflection_motivation?: string | null
          resting_hr?: number | null
          sleep_quality?: number | null
          sleep_time?: string | null
          stress_level?: number | null
          stress_sources?: string[] | null
          training_intent?: string[] | null
          user_id: string
          wake_time?: string | null
          wake_time_goal?: string | null
          weight_lbs?: number | null
        }
        Update: {
          appetite?: string | null
          balance_duration_seconds?: number | null
          balance_left_seconds?: number | null
          balance_right_seconds?: number | null
          bedtime_goal?: string | null
          created_at?: string | null
          daily_intentions?: string | null
          daily_motivation?: string | null
          discipline_level?: number | null
          emotional_state?: number
          entry_date?: string
          hours_slept?: number | null
          id?: string
          mental_energy?: number | null
          mental_readiness?: number
          mood_level?: number | null
          movement_restriction?: Json | null
          pain_increases_with_movement?: boolean | null
          pain_location?: string[] | null
          pain_movement_per_area?: Json | null
          pain_scale?: number | null
          pain_scales?: Json | null
          pain_tissue_types?: Json | null
          perceived_recovery?: number | null
          physical_readiness?: number
          quiz_type?: string
          reaction_time_ms?: number | null
          reaction_time_score?: number | null
          reflection_did_well?: string | null
          reflection_improve?: string | null
          reflection_learned?: string | null
          reflection_motivation?: string | null
          resting_hr?: number | null
          sleep_quality?: number | null
          sleep_time?: string | null
          stress_level?: number | null
          stress_sources?: string[] | null
          training_intent?: string[] | null
          user_id?: string
          wake_time?: string | null
          wake_time_goal?: string | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      vault_free_notes: {
        Row: {
          created_at: string | null
          entry_date: string
          id: string
          note_text: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_date?: string
          id?: string
          note_text: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: string
          note_text?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_meal_plans: {
        Row: {
          created_at: string | null
          estimated_calories: number | null
          estimated_carbs_g: number | null
          estimated_fats_g: number | null
          estimated_protein_g: number | null
          food_items: Json | null
          id: string
          is_completed: boolean | null
          meal_name: string | null
          meal_type: string | null
          notes: string | null
          planned_date: string
          time_slot: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          estimated_calories?: number | null
          estimated_carbs_g?: number | null
          estimated_fats_g?: number | null
          estimated_protein_g?: number | null
          food_items?: Json | null
          id?: string
          is_completed?: boolean | null
          meal_name?: string | null
          meal_type?: string | null
          notes?: string | null
          planned_date: string
          time_slot?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          estimated_calories?: number | null
          estimated_carbs_g?: number | null
          estimated_fats_g?: number | null
          estimated_protein_g?: number | null
          food_items?: Json | null
          id?: string
          is_completed?: boolean | null
          meal_name?: string | null
          meal_type?: string | null
          notes?: string | null
          planned_date?: string
          time_slot?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_nutrition_goals: {
        Row: {
          calorie_goal: number | null
          carbs_goal: number | null
          created_at: string | null
          fats_goal: number | null
          fiber_goal: number | null
          goal_adjustment_percent: number | null
          hydration_goal: number | null
          id: string
          protein_goal: number | null
          sodium_limit: number | null
          sugar_limit: number | null
          supplement_goals: Json | null
          tdee_calculated: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calorie_goal?: number | null
          carbs_goal?: number | null
          created_at?: string | null
          fats_goal?: number | null
          fiber_goal?: number | null
          goal_adjustment_percent?: number | null
          hydration_goal?: number | null
          id?: string
          protein_goal?: number | null
          sodium_limit?: number | null
          sugar_limit?: number | null
          supplement_goals?: Json | null
          tdee_calculated?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calorie_goal?: number | null
          carbs_goal?: number | null
          created_at?: string | null
          fats_goal?: number | null
          fiber_goal?: number | null
          goal_adjustment_percent?: number | null
          hydration_goal?: number | null
          id?: string
          protein_goal?: number | null
          sodium_limit?: number | null
          sugar_limit?: number | null
          supplement_goals?: Json | null
          tdee_calculated?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_nutrition_logs: {
        Row: {
          calories: number | null
          carbs_g: number | null
          created_at: string | null
          digestion_notes: string | null
          energy_level: number | null
          entry_date: string
          fats_g: number | null
          hydration_oz: number | null
          id: string
          logged_at: string | null
          meal_time: string | null
          meal_title: string | null
          meal_type: string | null
          micros: Json | null
          protein_g: number | null
          supplements: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          digestion_notes?: string | null
          energy_level?: number | null
          entry_date?: string
          fats_g?: number | null
          hydration_oz?: number | null
          id?: string
          logged_at?: string | null
          meal_time?: string | null
          meal_title?: string | null
          meal_type?: string | null
          micros?: Json | null
          protein_g?: number | null
          supplements?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          digestion_notes?: string | null
          energy_level?: number | null
          entry_date?: string
          fats_g?: number | null
          hydration_oz?: number | null
          id?: string
          logged_at?: string | null
          meal_time?: string | null
          meal_title?: string | null
          meal_type?: string | null
          micros?: Json | null
          protein_g?: number | null
          supplements?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_performance_tests: {
        Row: {
          created_at: string | null
          id: string
          module: string
          next_entry_date: string | null
          previous_results: Json | null
          results: Json
          six_week_goals_text: string | null
          sport: string
          test_date: string
          test_type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module: string
          next_entry_date?: string | null
          previous_results?: Json | null
          results?: Json
          six_week_goals_text?: string | null
          sport: string
          test_date?: string
          test_type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: string
          next_entry_date?: string | null
          previous_results?: Json | null
          results?: Json
          six_week_goals_text?: string | null
          sport?: string
          test_date?: string
          test_type?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_progress_photos: {
        Row: {
          arm_measurement: number | null
          bmi: number | null
          body_fat_percent: number | null
          chest_measurement: number | null
          created_at: string | null
          id: string
          leg_measurement: number | null
          next_entry_date: string | null
          notes: string | null
          photo_date: string
          photo_urls: Json | null
          user_id: string
          waist_measurement: number | null
          weight_lbs: number | null
        }
        Insert: {
          arm_measurement?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          chest_measurement?: number | null
          created_at?: string | null
          id?: string
          leg_measurement?: number | null
          next_entry_date?: string | null
          notes?: string | null
          photo_date?: string
          photo_urls?: Json | null
          user_id: string
          waist_measurement?: number | null
          weight_lbs?: number | null
        }
        Update: {
          arm_measurement?: number | null
          bmi?: number | null
          body_fat_percent?: number | null
          chest_measurement?: number | null
          created_at?: string | null
          id?: string
          leg_measurement?: number | null
          next_entry_date?: string | null
          notes?: string | null
          photo_date?: string
          photo_urls?: Json | null
          user_id?: string
          waist_measurement?: number | null
          weight_lbs?: number | null
        }
        Relationships: []
      }
      vault_recaps: {
        Row: {
          downloaded_at: string | null
          generated_at: string | null
          id: string
          recap_data: Json
          recap_period_end: string
          recap_period_start: string
          saved_to_library: boolean | null
          strength_change_percent: number | null
          total_weight_lifted: number | null
          unlocked_progress_reports_at: string | null
          user_id: string
        }
        Insert: {
          downloaded_at?: string | null
          generated_at?: string | null
          id?: string
          recap_data?: Json
          recap_period_end: string
          recap_period_start: string
          saved_to_library?: boolean | null
          strength_change_percent?: number | null
          total_weight_lifted?: number | null
          unlocked_progress_reports_at?: string | null
          user_id: string
        }
        Update: {
          downloaded_at?: string | null
          generated_at?: string | null
          id?: string
          recap_data?: Json
          recap_period_end?: string
          recap_period_start?: string
          saved_to_library?: boolean | null
          strength_change_percent?: number | null
          total_weight_lifted?: number | null
          unlocked_progress_reports_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_saved_drills: {
        Row: {
          drill_description: string | null
          drill_name: string
          id: string
          module_origin: string
          saved_at: string | null
          sport: string
          user_id: string
        }
        Insert: {
          drill_description?: string | null
          drill_name: string
          id?: string
          module_origin: string
          saved_at?: string | null
          sport: string
          user_id: string
        }
        Update: {
          drill_description?: string | null
          drill_name?: string
          id?: string
          module_origin?: string
          saved_at?: string | null
          sport?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_saved_tips: {
        Row: {
          id: string
          module_origin: string
          saved_at: string | null
          tip_category: string | null
          tip_text: string
          user_id: string
        }
        Insert: {
          id?: string
          module_origin: string
          saved_at?: string | null
          tip_category?: string | null
          tip_text: string
          user_id: string
        }
        Update: {
          id?: string
          module_origin?: string
          saved_at?: string | null
          tip_category?: string | null
          tip_text?: string
          user_id?: string
        }
        Relationships: []
      }
      vault_scout_grades: {
        Row: {
          breaking_ball_grade: number | null
          control_grade: number | null
          defense_grade: number | null
          delivery_grade: number | null
          fastball_grade: number | null
          grade_type: string
          graded_at: string | null
          hitting_grade: number | null
          id: string
          leadership_grade: number | null
          long_term_goals_text: string | null
          next_prompt_date: string | null
          notes: string | null
          offspeed_grade: number | null
          power_grade: number | null
          rise_ball_grade: number | null
          self_efficacy_grade: number | null
          speed_grade: number | null
          throwing_grade: number | null
          user_id: string
        }
        Insert: {
          breaking_ball_grade?: number | null
          control_grade?: number | null
          defense_grade?: number | null
          delivery_grade?: number | null
          fastball_grade?: number | null
          grade_type?: string
          graded_at?: string | null
          hitting_grade?: number | null
          id?: string
          leadership_grade?: number | null
          long_term_goals_text?: string | null
          next_prompt_date?: string | null
          notes?: string | null
          offspeed_grade?: number | null
          power_grade?: number | null
          rise_ball_grade?: number | null
          self_efficacy_grade?: number | null
          speed_grade?: number | null
          throwing_grade?: number | null
          user_id: string
        }
        Update: {
          breaking_ball_grade?: number | null
          control_grade?: number | null
          defense_grade?: number | null
          delivery_grade?: number | null
          fastball_grade?: number | null
          grade_type?: string
          graded_at?: string | null
          hitting_grade?: number | null
          id?: string
          leadership_grade?: number | null
          long_term_goals_text?: string | null
          next_prompt_date?: string | null
          notes?: string | null
          offspeed_grade?: number | null
          power_grade?: number | null
          rise_ball_grade?: number | null
          self_efficacy_grade?: number | null
          speed_grade?: number | null
          throwing_grade?: number | null
          user_id?: string
        }
        Relationships: []
      }
      vault_streaks: {
        Row: {
          badges_earned: string[] | null
          created_at: string | null
          current_streak: number | null
          id: string
          journal_streak: number | null
          last_entry_date: string | null
          longest_streak: number | null
          nutrition_streak: number | null
          quiz_streak: number | null
          total_entries: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          journal_streak?: number | null
          last_entry_date?: string | null
          longest_streak?: number | null
          nutrition_streak?: number | null
          quiz_streak?: number | null
          total_entries?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          badges_earned?: string[] | null
          created_at?: string | null
          current_streak?: number | null
          id?: string
          journal_streak?: number | null
          last_entry_date?: string | null
          longest_streak?: number | null
          nutrition_streak?: number | null
          quiz_streak?: number | null
          total_entries?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_supplement_tracking: {
        Row: {
          created_at: string | null
          entry_date: string
          id: string
          supplements_taken: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          entry_date?: string
          id?: string
          supplements_taken?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          entry_date?: string
          id?: string
          supplements_taken?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      vault_vitamin_logs: {
        Row: {
          category: string | null
          created_at: string | null
          dosage: string | null
          entry_date: string | null
          id: string
          is_recurring: boolean | null
          purpose: string | null
          taken: boolean | null
          taken_at: string | null
          timing: string | null
          unit: string | null
          user_id: string
          vitamin_name: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          dosage?: string | null
          entry_date?: string | null
          id?: string
          is_recurring?: boolean | null
          purpose?: string | null
          taken?: boolean | null
          taken_at?: string | null
          timing?: string | null
          unit?: string | null
          user_id: string
          vitamin_name: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          dosage?: string | null
          entry_date?: string | null
          id?: string
          is_recurring?: boolean | null
          purpose?: string | null
          taken?: boolean | null
          taken_at?: string | null
          timing?: string | null
          unit?: string | null
          user_id?: string
          vitamin_name?: string
        }
        Relationships: []
      }
      vault_weekly_wellness_quiz: {
        Row: {
          completed_at: string | null
          created_at: string | null
          id: string
          notification_enabled: boolean | null
          target_discipline_level: number | null
          target_mood_level: number | null
          target_stress_level: number | null
          user_id: string
          week_start_date: string
          weekly_goals_text: string | null
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          target_discipline_level?: number | null
          target_mood_level?: number | null
          target_stress_level?: number | null
          user_id: string
          week_start_date: string
          weekly_goals_text?: string | null
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          target_discipline_level?: number | null
          target_mood_level?: number | null
          target_stress_level?: number | null
          user_id?: string
          week_start_date?: string
          weekly_goals_text?: string | null
        }
        Relationships: []
      }
      vault_wellness_goals: {
        Row: {
          created_at: string | null
          id: string
          notification_enabled: boolean | null
          target_discipline_level: number | null
          target_mood_level: number | null
          target_stress_level: number | null
          updated_at: string | null
          user_id: string
          week_start_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          target_discipline_level?: number | null
          target_mood_level?: number | null
          target_stress_level?: number | null
          updated_at?: string | null
          user_id: string
          week_start_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          notification_enabled?: boolean | null
          target_discipline_level?: number | null
          target_mood_level?: number | null
          target_stress_level?: number | null
          updated_at?: string | null
          user_id?: string
          week_start_date?: string
        }
        Relationships: []
      }
      vault_workout_notes: {
        Row: {
          created_at: string | null
          day_number: number
          entry_date: string
          id: string
          module: string
          notes: string | null
          sport: string
          sub_module: string
          total_weight_lifted: number | null
          user_id: string
          week_number: number
          weight_increases: Json | null
        }
        Insert: {
          created_at?: string | null
          day_number: number
          entry_date?: string
          id?: string
          module: string
          notes?: string | null
          sport: string
          sub_module: string
          total_weight_lifted?: number | null
          user_id: string
          week_number: number
          weight_increases?: Json | null
        }
        Update: {
          created_at?: string | null
          day_number?: number
          entry_date?: string
          id?: string
          module?: string
          notes?: string | null
          sport?: string
          sub_module?: string
          total_weight_lifted?: number | null
          user_id?: string
          week_number?: number
          weight_increases?: Json | null
        }
        Relationships: []
      }
      verified_stat_profiles: {
        Row: {
          admin_verified: boolean | null
          confidence_weight: number | null
          created_at: string
          external_metrics: Json | null
          id: string
          identity_match: boolean | null
          last_synced_at: string | null
          league: string
          profile_url: string
          rejection_reason: string | null
          screenshot_path: string | null
          sport: string
          sync_frequency: string | null
          team_name: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_verified?: boolean | null
          confidence_weight?: number | null
          created_at?: string
          external_metrics?: Json | null
          id?: string
          identity_match?: boolean | null
          last_synced_at?: string | null
          league: string
          profile_url: string
          rejection_reason?: string | null
          screenshot_path?: string | null
          sport: string
          sync_frequency?: string | null
          team_name?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_verified?: boolean | null
          confidence_weight?: number | null
          created_at?: string
          external_metrics?: Json | null
          id?: string
          identity_match?: boolean | null
          last_synced_at?: string | null
          league?: string
          profile_url?: string
          rejection_reason?: string | null
          screenshot_path?: string | null
          sport?: string
          sync_frequency?: string | null
          team_name?: string | null
          updated_at?: string
          user_id?: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
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
            foreignKeyName: "video_annotations_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
            foreignKeyName: "video_annotations_scout_id_fkey"
            columns: ["scout_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
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
          contributes_to_progress: boolean
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
          contributes_to_progress?: boolean
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
          contributes_to_progress?: boolean
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
      weather_favorite_locations: {
        Row: {
          created_at: string | null
          id: string
          is_default: boolean | null
          latitude: number
          location_name: string
          longitude: number
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          latitude: number
          location_name: string
          longitude: number
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          latitude?: number
          location_name?: string
          longitude?: number
          user_id?: string
        }
        Relationships: []
      }
      weight_entries: {
        Row: {
          body_fat_percent: number | null
          created_at: string | null
          entry_date: string
          id: string
          notes: string | null
          updated_at: string | null
          user_id: string
          weight_lbs: number
        }
        Insert: {
          body_fat_percent?: number | null
          created_at?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id: string
          weight_lbs: number
        }
        Update: {
          body_fat_percent?: number | null
          created_at?: string | null
          entry_date?: string
          id?: string
          notes?: string | null
          updated_at?: string | null
          user_id?: string
          weight_lbs?: number
        }
        Relationships: []
      }
      wellness_milestones: {
        Row: {
          celebrated: boolean | null
          id: string
          milestone_type: string
          milestone_value: number
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          celebrated?: boolean | null
          id?: string
          milestone_type: string
          milestone_value: number
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          celebrated?: boolean | null
          id?: string
          milestone_type?: string
          milestone_value?: number
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wellness_preferences: {
        Row: {
          created_at: string | null
          id: string
          onboarding_completed: boolean | null
          preferred_intensity: string | null
          reminder_enabled: boolean | null
          reminder_time: string | null
          themes_explored: string[] | null
          updated_at: string | null
          user_id: string
          wellness_goals: string[] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_intensity?: string | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          themes_explored?: string[] | null
          updated_at?: string | null
          user_id: string
          wellness_goals?: string[] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          onboarding_completed?: boolean | null
          preferred_intensity?: string | null
          reminder_enabled?: boolean | null
          reminder_time?: string | null
          themes_explored?: string[] | null
          updated_at?: string | null
          user_id?: string
          wellness_goals?: string[] | null
        }
        Relationships: []
      }
      workout_blocks: {
        Row: {
          block_type: string
          created_at: string | null
          exercises: Json | null
          id: string
          intent: string
          is_custom: boolean | null
          metadata: Json | null
          name: string
          order_index: number
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          block_type?: string
          created_at?: string | null
          exercises?: Json | null
          id?: string
          intent?: string
          is_custom?: boolean | null
          metadata?: Json | null
          name: string
          order_index?: number
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          block_type?: string
          created_at?: string | null
          exercises?: Json | null
          id?: string
          intent?: string
          is_custom?: boolean | null
          metadata?: Json | null
          name?: string
          order_index?: number
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_blocks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_presets: {
        Row: {
          category: string
          cns_load_estimate: number | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_duration_minutes: number | null
          fascial_bias: Json | null
          id: string
          is_locked: boolean | null
          is_system: boolean | null
          name: string
          preset_data: Json
          sport: string | null
          user_id: string | null
        }
        Insert: {
          category: string
          cns_load_estimate?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          fascial_bias?: Json | null
          id?: string
          is_locked?: boolean | null
          is_system?: boolean | null
          name: string
          preset_data?: Json
          sport?: string | null
          user_id?: string | null
        }
        Update: {
          category?: string
          cns_load_estimate?: number | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_duration_minutes?: number | null
          fascial_bias?: Json | null
          id?: string
          is_locked?: boolean | null
          is_system?: boolean | null
          name?: string
          preset_data?: Json
          sport?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          experience_level: string | null
          full_name: string | null
          id: string | null
          position: string | null
        }
        Insert: {
          avatar_url?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
        }
        Update: {
          avatar_url?: string | null
          experience_level?: string | null
          full_name?: string | null
          id?: string | null
          position?: string | null
        }
        Relationships: []
      }
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
      cleanup_deleted_activity_templates: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      folder_allows_coach_edit: {
        Args: { p_coach_id: string; p_folder_id: string }
        Returns: boolean
      }
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
