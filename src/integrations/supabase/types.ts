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
      activity_card_versions: {
        Row: {
          created_at: string
          edited_by: string
          editor_role: string
          folder_item_id: string
          id: string
          snapshot_json: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          edited_by: string
          editor_role?: string
          folder_item_id: string
          id?: string
          snapshot_json?: Json
          version_number: number
        }
        Update: {
          created_at?: string
          edited_by?: string
          editor_role?: string
          folder_item_id?: string
          id?: string
          snapshot_json?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "activity_card_versions_folder_item_id_fkey"
            columns: ["folder_item_id"]
            isOneToOne: false
            referencedRelation: "activity_folder_items"
            referencedColumns: ["id"]
          },
        ]
      }
      activity_edit_logs: {
        Row: {
          action_type: string
          created_at: string
          folder_item_id: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          folder_item_id: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          folder_item_id?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_edit_logs_folder_item_id_fkey"
            columns: ["folder_item_id"]
            isOneToOne: false
            referencedRelation: "activity_folder_items"
            referencedColumns: ["id"]
          },
        ]
      }
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
          locked_at: string | null
          locked_by: string | null
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
          locked_at?: string | null
          locked_by?: string | null
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
          locked_at?: string | null
          locked_by?: string | null
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
      advisory_feedback_logs: {
        Row: {
          advice_directive: string | null
          advice_state: string
          created_at: string
          effectiveness_score: number | null
          evaluated_at: string | null
          evaluation_window_hours: number
          explanation_id: string | null
          id: string
          intervention_id: string | null
          snapshot_id: string | null
          user_action_inferred: string | null
          user_id: string
        }
        Insert: {
          advice_directive?: string | null
          advice_state: string
          created_at?: string
          effectiveness_score?: number | null
          evaluated_at?: string | null
          evaluation_window_hours?: number
          explanation_id?: string | null
          id?: string
          intervention_id?: string | null
          snapshot_id?: string | null
          user_action_inferred?: string | null
          user_id: string
        }
        Update: {
          advice_directive?: string | null
          advice_state?: string
          created_at?: string
          effectiveness_score?: number | null
          evaluated_at?: string | null
          evaluation_window_hours?: number
          explanation_id?: string | null
          id?: string
          intervention_id?: string | null
          snapshot_id?: string | null
          user_action_inferred?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "advisory_feedback_logs_explanation_id_fkey"
            columns: ["explanation_id"]
            isOneToOne: false
            referencedRelation: "hammer_state_explanations_v2"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_feedback_logs_intervention_id_fkey"
            columns: ["intervention_id"]
            isOneToOne: false
            referencedRelation: "engine_interventions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "advisory_feedback_logs_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "hammer_state_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      anonymized_pattern_library: {
        Row: {
          confidence: number | null
          created_at: string
          feature_vector: Json
          frequency: number
          id: string
          last_seen_at: string
          outcome_state: string
          pattern_type: string
          performance_outcome_score: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string
          feature_vector: Json
          frequency?: number
          id?: string
          last_seen_at?: string
          outcome_state: string
          pattern_type: string
          performance_outcome_score?: number | null
        }
        Update: {
          confidence?: number | null
          created_at?: string
          feature_vector?: Json
          frequency?: number
          id?: string
          last_seen_at?: string
          outcome_state?: string
          pattern_type?: string
          performance_outcome_score?: number | null
        }
        Relationships: []
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
          custom_calorie_target: number | null
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
          custom_calorie_target?: number | null
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
          custom_calorie_target?: number | null
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
          created_at: string | null
          day_status: string
          entry_date: string
          game_logged: boolean | null
          id: string
          injury_body_region: string | null
          injury_expected_days: number | null
          injury_mode: boolean | null
          notes: string | null
          rest_reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cns_load_actual?: number | null
          coach_override?: boolean | null
          coach_override_by?: string | null
          created_at?: string | null
          day_status?: string
          entry_date: string
          game_logged?: boolean | null
          id?: string
          injury_body_region?: string | null
          injury_expected_days?: number | null
          injury_mode?: boolean | null
          notes?: string | null
          rest_reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cns_load_actual?: number | null
          coach_override?: boolean | null
          coach_override_by?: string | null
          created_at?: string | null
          day_status?: string
          entry_date?: string
          game_logged?: boolean | null
          id?: string
          injury_body_region?: string | null
          injury_expected_days?: number | null
          injury_mode?: boolean | null
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
          in_season_end_date: string | null
          in_season_start_date: string | null
          integrity_threshold_met: boolean | null
          is_ambidextrous_thrower: boolean | null
          is_college_verified: boolean | null
          is_pro_verified: boolean | null
          is_switch_hitter: boolean | null
          league_tier: string | null
          performance_mode: boolean | null
          post_season_end_date: string | null
          post_season_start_date: string | null
          preseason_end_date: string | null
          preseason_start_date: string | null
          primary_batting_side: string | null
          primary_coach_id: string | null
          primary_position: string | null
          primary_throwing_hand: string | null
          ranking_eligible: boolean | null
          season_status: string
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
          in_season_end_date?: string | null
          in_season_start_date?: string | null
          integrity_threshold_met?: boolean | null
          is_ambidextrous_thrower?: boolean | null
          is_college_verified?: boolean | null
          is_pro_verified?: boolean | null
          is_switch_hitter?: boolean | null
          league_tier?: string | null
          performance_mode?: boolean | null
          post_season_end_date?: string | null
          post_season_start_date?: string | null
          preseason_end_date?: string | null
          preseason_start_date?: string | null
          primary_batting_side?: string | null
          primary_coach_id?: string | null
          primary_position?: string | null
          primary_throwing_hand?: string | null
          ranking_eligible?: boolean | null
          season_status?: string
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
          in_season_end_date?: string | null
          in_season_start_date?: string | null
          integrity_threshold_met?: boolean | null
          is_ambidextrous_thrower?: boolean | null
          is_college_verified?: boolean | null
          is_pro_verified?: boolean | null
          is_switch_hitter?: boolean | null
          league_tier?: string | null
          performance_mode?: boolean | null
          post_season_end_date?: string | null
          post_season_start_date?: string | null
          preseason_end_date?: string | null
          preseason_start_date?: string | null
          primary_batting_side?: string | null
          primary_coach_id?: string | null
          primary_position?: string | null
          primary_throwing_hand?: string | null
          ranking_eligible?: boolean | null
          season_status?: string
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
      baserunning_daily_attempts: {
        Row: {
          correct: boolean
          created_at: string
          id: string
          response_time_ms: number
          scenario_id: string
          user_id: string
        }
        Insert: {
          correct: boolean
          created_at?: string
          id?: string
          response_time_ms: number
          scenario_id: string
          user_id: string
        }
        Update: {
          correct?: boolean
          created_at?: string
          id?: string
          response_time_ms?: number
          scenario_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baserunning_daily_attempts_scenario_id_fkey"
            columns: ["scenario_id"]
            isOneToOne: false
            referencedRelation: "baserunning_scenarios"
            referencedColumns: ["id"]
          },
        ]
      }
      baserunning_lessons: {
        Row: {
          content: string
          created_at: string
          elite_cue: string | null
          game_transfer: string | null
          id: string
          level: string
          order_index: number
          sport: string
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          elite_cue?: string | null
          game_transfer?: string | null
          id?: string
          level?: string
          order_index?: number
          sport?: string
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          elite_cue?: string | null
          game_transfer?: string | null
          id?: string
          level?: string
          order_index?: number
          sport?: string
          title?: string
        }
        Relationships: []
      }
      baserunning_progress: {
        Row: {
          completed: boolean
          id: string
          last_attempt_at: string
          lesson_id: string
          score: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          id?: string
          last_attempt_at?: string
          lesson_id: string
          score?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          id?: string
          last_attempt_at?: string
          lesson_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "baserunning_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "baserunning_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      baserunning_scenarios: {
        Row: {
          answer_options: Json | null
          correct_answer: string
          correct_answer_id: string | null
          created_at: string
          difficulty: string
          explanation: string
          game_consequence: string | null
          id: string
          lesson_id: string
          mistake_type: Database["public"]["Enums"]["mistake_type"] | null
          options: Json
          scenario_text: string
          sport: string
          wrong_explanations: Json | null
        }
        Insert: {
          answer_options?: Json | null
          correct_answer: string
          correct_answer_id?: string | null
          created_at?: string
          difficulty?: string
          explanation: string
          game_consequence?: string | null
          id?: string
          lesson_id: string
          mistake_type?: Database["public"]["Enums"]["mistake_type"] | null
          options?: Json
          scenario_text: string
          sport?: string
          wrong_explanations?: Json | null
        }
        Update: {
          answer_options?: Json | null
          correct_answer?: string
          correct_answer_id?: string | null
          created_at?: string
          difficulty?: string
          explanation?: string
          game_consequence?: string | null
          id?: string
          lesson_id?: string
          mistake_type?: Database["public"]["Enums"]["mistake_type"] | null
          options?: Json
          scenario_text?: string
          sport?: string
          wrong_explanations?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "baserunning_scenarios_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "baserunning_lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      behavioral_events: {
        Row: {
          acknowledged_at: string | null
          action_payload: Json
          action_type: string | null
          command_text: string | null
          created_at: string
          event_date: string
          event_type: string
          id: string
          magnitude: number | null
          metadata: Json
          template_id: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          action_payload?: Json
          action_type?: string | null
          command_text?: string | null
          created_at?: string
          event_date?: string
          event_type: string
          id?: string
          magnitude?: number | null
          metadata?: Json
          template_id?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          action_payload?: Json
          action_type?: string | null
          command_text?: string | null
          created_at?: string
          event_date?: string
          event_type?: string
          id?: string
          magnitude?: number | null
          metadata?: Json
          template_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "behavioral_events_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      block_exercises: {
        Row: {
          cns_demand: string | null
          coaching_cues: string[] | null
          id: string
          name: string
          ordinal: number
          reps: number
          rest_seconds: number | null
          sets: number
          tempo: string | null
          velocity_intent: string | null
          weight: number | null
          workout_id: string
        }
        Insert: {
          cns_demand?: string | null
          coaching_cues?: string[] | null
          id?: string
          name: string
          ordinal?: number
          reps?: number
          rest_seconds?: number | null
          sets?: number
          tempo?: string | null
          velocity_intent?: string | null
          weight?: number | null
          workout_id: string
        }
        Update: {
          cns_demand?: string | null
          coaching_cues?: string[] | null
          id?: string
          name?: string
          ordinal?: number
          reps?: number
          rest_seconds?: number | null
          sets?: number
          tempo?: string | null
          velocity_intent?: string | null
          weight?: number | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "block_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      block_workout_metrics: {
        Row: {
          completed: boolean
          created_at: string
          id: string
          notes: string | null
          rpe: number
          user_id: string
          workout_id: string
        }
        Insert: {
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          rpe: number
          user_id: string
          workout_id: string
        }
        Update: {
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          rpe?: number
          user_id?: string
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_workout_metrics_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "block_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      block_workouts: {
        Row: {
          block_id: string
          completed_at: string | null
          day_label: string
          estimated_duration: number | null
          id: string
          scheduled_date: string | null
          status: string
          week_number: number
          workout_type: string
        }
        Insert: {
          block_id: string
          completed_at?: string | null
          day_label: string
          estimated_duration?: number | null
          id?: string
          scheduled_date?: string | null
          status?: string
          week_number: number
          workout_type: string
        }
        Update: {
          block_id?: string
          completed_at?: string | null
          day_label?: string
          estimated_duration?: number | null
          id?: string
          scheduled_date?: string | null
          status?: string
          week_number?: number
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "block_workouts_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "training_blocks"
            referencedColumns: ["id"]
          },
        ]
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
      checkout_attempts: {
        Row: {
          ab_variant: string | null
          completed_at: string | null
          email: string | null
          from_slug: string | null
          gap: string | null
          id: string
          pct: number | null
          severity: string | null
          sim_id: string | null
          sport: string | null
          started_at: string
          stripe_session_id: string | null
          tier: string | null
          user_id: string
        }
        Insert: {
          ab_variant?: string | null
          completed_at?: string | null
          email?: string | null
          from_slug?: string | null
          gap?: string | null
          id?: string
          pct?: number | null
          severity?: string | null
          sim_id?: string | null
          sport?: string | null
          started_at?: string
          stripe_session_id?: string | null
          tier?: string | null
          user_id: string
        }
        Update: {
          ab_variant?: string | null
          completed_at?: string | null
          email?: string | null
          from_slug?: string | null
          gap?: string | null
          id?: string
          pct?: number | null
          severity?: string | null
          sim_id?: string | null
          sport?: string | null
          started_at?: string
          stripe_session_id?: string | null
          tier?: string | null
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
      coach_notifications: {
        Row: {
          coach_user_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          notification_type: string
          sender_user_id: string
          template_snapshot: Json | null
          title: string
        }
        Insert: {
          coach_user_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          sender_user_id: string
          template_snapshot?: Json | null
          title: string
        }
        Update: {
          coach_user_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          notification_type?: string
          sender_user_id?: string
          template_snapshot?: Json | null
          title?: string
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
      custom_activity_logs: {
        Row: {
          actual_duration_minutes: number | null
          completed: boolean | null
          completed_at: string | null
          completion_method: string
          completion_state: string
          created_at: string | null
          entry_date: string
          id: string
          instance_index: number
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
          completion_method?: string
          completion_state?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          instance_index?: number
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
          completion_method?: string
          completion_state?: string
          created_at?: string | null
          entry_date?: string
          id?: string
          instance_index?: number
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
          action: string | null
          activity_type: string
          color: string
          completion_binding: Json | null
          completion_type: string | null
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
          is_non_negotiable: boolean
          meals: Json | null
          pace_value: string | null
          purpose: string | null
          recurring_active: boolean | null
          recurring_days: Json | null
          reminder_enabled: boolean | null
          reminder_minutes: number | null
          reminder_time: string | null
          source: string | null
          specific_dates: string[] | null
          sport: string
          success_criteria: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          action?: string | null
          activity_type: string
          color?: string
          completion_binding?: Json | null
          completion_type?: string | null
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
          is_non_negotiable?: boolean
          meals?: Json | null
          pace_value?: string | null
          purpose?: string | null
          recurring_active?: boolean | null
          recurring_days?: Json | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          reminder_time?: string | null
          source?: string | null
          specific_dates?: string[] | null
          sport?: string
          success_criteria?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          action?: string | null
          activity_type?: string
          color?: string
          completion_binding?: Json | null
          completion_type?: string | null
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
          is_non_negotiable?: boolean
          meals?: Json | null
          pace_value?: string | null
          purpose?: string | null
          recurring_active?: boolean | null
          recurring_days?: Json | null
          reminder_enabled?: boolean | null
          reminder_minutes?: number | null
          reminder_time?: string | null
          source?: string | null
          specific_dates?: string[] | null
          sport?: string
          success_criteria?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      daily_standard_checks: {
        Row: {
          check_date: string
          confirmed_at: string
          id: string
          tier_at_confirm: string | null
          user_id: string
        }
        Insert: {
          check_date: string
          confirmed_at?: string
          id?: string
          tier_at_confirm?: string | null
          user_id: string
        }
        Update: {
          check_date?: string
          confirmed_at?: string
          id?: string
          tier_at_confirm?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demo_events: {
        Row: {
          created_at: string
          event_type: string
          id: number
          metadata: Json
          node_slug: string | null
          session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          event_type: string
          id?: number
          metadata?: Json
          node_slug?: string | null
          session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          event_type?: string
          id?: number
          metadata?: Json
          node_slug?: string | null
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      demo_leads: {
        Row: {
          created_at: string
          email: string
          from_slug: string | null
          gap: string | null
          id: string
          pct: number | null
          severity: string | null
          sim_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          from_slug?: string | null
          gap?: string | null
          id?: string
          pct?: number | null
          severity?: string | null
          sim_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          from_slug?: string | null
          gap?: string | null
          id?: string
          pct?: number | null
          severity?: string | null
          sim_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      demo_progress: {
        Row: {
          completed_at: string | null
          created_at: string
          current_node: string | null
          demo_state: string
          dwell_ms: Json
          incomplete: boolean
          interaction_counts: Json
          last_active_at: string
          prescribed_history: Json
          resume_path: string | null
          sim_signatures: Json
          skipped_at: string | null
          updated_at: string
          user_id: string
          variant: string | null
          viewed_categories: string[]
          viewed_submodules: string[]
          viewed_tiers: string[]
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          demo_state?: string
          dwell_ms?: Json
          incomplete?: boolean
          interaction_counts?: Json
          last_active_at?: string
          prescribed_history?: Json
          resume_path?: string | null
          sim_signatures?: Json
          skipped_at?: string | null
          updated_at?: string
          user_id: string
          variant?: string | null
          viewed_categories?: string[]
          viewed_submodules?: string[]
          viewed_tiers?: string[]
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_node?: string | null
          demo_state?: string
          dwell_ms?: Json
          incomplete?: boolean
          interaction_counts?: Json
          last_active_at?: string
          prescribed_history?: Json
          resume_path?: string | null
          sim_signatures?: Json
          skipped_at?: string | null
          updated_at?: string
          user_id?: string
          variant?: string | null
          viewed_categories?: string[]
          viewed_submodules?: string[]
          viewed_tiers?: string[]
        }
        Relationships: []
      }
      demo_registry: {
        Row: {
          ab_variant: string | null
          audience: string
          component_key: string | null
          created_at: string
          display_order: number
          icon_name: string | null
          id: string
          is_active: boolean
          is_recommended: boolean
          min_app_version: string | null
          node_type: string
          parent_id: string | null
          parent_slug: string | null
          recommended_order: number | null
          requires_features: string[]
          slug: string
          tagline: string | null
          title: string
        }
        Insert: {
          ab_variant?: string | null
          audience?: string
          component_key?: string | null
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          min_app_version?: string | null
          node_type: string
          parent_id?: string | null
          parent_slug?: string | null
          recommended_order?: number | null
          requires_features?: string[]
          slug: string
          tagline?: string | null
          title: string
        }
        Update: {
          ab_variant?: string | null
          audience?: string
          component_key?: string | null
          created_at?: string
          display_order?: number
          icon_name?: string | null
          id?: string
          is_active?: boolean
          is_recommended?: boolean
          min_app_version?: string | null
          node_type?: string
          parent_id?: string | null
          parent_slug?: string | null
          recommended_order?: number | null
          requires_features?: string[]
          slug?: string
          tagline?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "demo_registry_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "demo_registry"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_video_prescriptions: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          primary_axis: string | null
          severity_band: string
          sim_id: string
          video_refs: Json
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          primary_axis?: string | null
          severity_band: string
          sim_id: string
          video_refs: Json
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          primary_axis?: string | null
          severity_band?: string
          sim_id?: string
          video_refs?: Json
        }
        Relationships: []
      }
      drill_assignments: {
        Row: {
          assigned_at: string | null
          coach_id: string
          completed: boolean | null
          completed_at: string | null
          drill_id: string
          id: string
          notes: string | null
          player_id: string
        }
        Insert: {
          assigned_at?: string | null
          coach_id: string
          completed?: boolean | null
          completed_at?: string | null
          drill_id: string
          id?: string
          notes?: string | null
          player_id: string
        }
        Update: {
          assigned_at?: string | null
          coach_id?: string
          completed?: boolean | null
          completed_at?: string | null
          drill_id?: string
          id?: string
          notes?: string | null
          player_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_assignments_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_definitions_versions: {
        Row: {
          created_at: string
          created_by: string | null
          definition: Json
          drill_id: string
          id: string
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          definition: Json
          drill_id: string
          id?: string
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          definition?: Json
          drill_id?: string
          id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "drill_definitions_versions_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_positions: {
        Row: {
          drill_id: string
          id: string
          position: string
        }
        Insert: {
          drill_id: string
          id?: string
          position: string
        }
        Update: {
          drill_id?: string
          id?: string
          position?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_positions_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_prescriptions: {
        Row: {
          adherence_count: number | null
          constraints: string | null
          constraints_json: Json | null
          created_at: string
          drill_id: string | null
          drill_name: string
          effectiveness_score: number | null
          id: string
          module: string
          post_score: number | null
          post_weakness_value: number | null
          pre_score: number | null
          pre_weakness_value: number | null
          prescribed_at: string
          resolved: boolean | null
          targeted_metric: string | null
          updated_at: string
          user_id: string
          weakness_area: string
          weakness_metric: string | null
        }
        Insert: {
          adherence_count?: number | null
          constraints?: string | null
          constraints_json?: Json | null
          created_at?: string
          drill_id?: string | null
          drill_name: string
          effectiveness_score?: number | null
          id?: string
          module: string
          post_score?: number | null
          post_weakness_value?: number | null
          pre_score?: number | null
          pre_weakness_value?: number | null
          prescribed_at?: string
          resolved?: boolean | null
          targeted_metric?: string | null
          updated_at?: string
          user_id: string
          weakness_area: string
          weakness_metric?: string | null
        }
        Update: {
          adherence_count?: number | null
          constraints?: string | null
          constraints_json?: Json | null
          created_at?: string
          drill_id?: string | null
          drill_name?: string
          effectiveness_score?: number | null
          id?: string
          module?: string
          post_score?: number | null
          post_weakness_value?: number | null
          pre_score?: number | null
          pre_weakness_value?: number | null
          prescribed_at?: string
          resolved?: boolean | null
          targeted_metric?: string | null
          updated_at?: string
          user_id?: string
          weakness_area?: string
          weakness_metric?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drill_prescriptions_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_tag_map: {
        Row: {
          drill_id: string
          tag_id: string
          weight: number
        }
        Insert: {
          drill_id: string
          tag_id: string
          weight?: number
        }
        Update: {
          drill_id?: string
          tag_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "drill_tag_map_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drill_tag_map_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "drill_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      drill_tags: {
        Row: {
          category: Database["public"]["Enums"]["drill_tag_category"]
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["drill_tag_category"]
          created_at?: string | null
          id?: string
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["drill_tag_category"]
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      drill_usage_tracking: {
        Row: {
          drill_id: string
          id: string
          performance_improved: boolean | null
          success_rating: number | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          drill_id: string
          id?: string
          performance_improved?: boolean | null
          success_rating?: number | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          drill_id?: string
          id?: string
          performance_improved?: boolean | null
          success_rating?: number | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "drill_usage_tracking_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          ai_context: string | null
          created_at: string | null
          created_by: string | null
          current_version_id: string | null
          default_constraints: Json | null
          description: string | null
          difficulty_levels: string[] | null
          id: string
          instructions: Json | null
          is_active: boolean
          is_published: boolean
          module: string
          name: string
          premium: boolean
          progression_level: number
          skill_target: string | null
          sport: string
          sport_modifier: number
          subscription_tier_required: string | null
          updated_at: string | null
          version: number
          video_url: string | null
        }
        Insert: {
          ai_context?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          default_constraints?: Json | null
          description?: string | null
          difficulty_levels?: string[] | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          is_published?: boolean
          module: string
          name: string
          premium?: boolean
          progression_level?: number
          skill_target?: string | null
          sport?: string
          sport_modifier?: number
          subscription_tier_required?: string | null
          updated_at?: string | null
          version?: number
          video_url?: string | null
        }
        Update: {
          ai_context?: string | null
          created_at?: string | null
          created_by?: string | null
          current_version_id?: string | null
          default_constraints?: Json | null
          description?: string | null
          difficulty_levels?: string[] | null
          id?: string
          instructions?: Json | null
          is_active?: boolean
          is_published?: boolean
          module?: string
          name?: string
          premium?: boolean
          progression_level?: number
          skill_target?: string | null
          sport?: string
          sport_modifier?: number
          subscription_tier_required?: string | null
          updated_at?: string | null
          version?: number
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drills_current_version_id_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "drill_definitions_versions"
            referencedColumns: ["id"]
          },
        ]
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
      engine_adversarial_logs: {
        Row: {
          actual_state: string | null
          engine_output: Json
          expected_state: string
          failure_reason: string | null
          forbidden_states: string[]
          id: string
          inputs: Json
          metadata: Json
          pass: boolean
          run_at: string
          scenario: string
          user_id: string
        }
        Insert: {
          actual_state?: string | null
          engine_output?: Json
          expected_state: string
          failure_reason?: string | null
          forbidden_states?: string[]
          id?: string
          inputs?: Json
          metadata?: Json
          pass: boolean
          run_at?: string
          scenario: string
          user_id: string
        }
        Update: {
          actual_state?: string | null
          engine_output?: Json
          expected_state?: string
          failure_reason?: string | null
          forbidden_states?: string[]
          id?: string
          inputs?: Json
          metadata?: Json
          pass?: boolean
          run_at?: string
          scenario?: string
          user_id?: string
        }
        Relationships: []
      }
      engine_dynamic_weights: {
        Row: {
          axis: string
          last_run_id: string | null
          metadata: Json
          updated_at: string
          weight: number
        }
        Insert: {
          axis: string
          last_run_id?: string | null
          metadata?: Json
          updated_at?: string
          weight?: number
        }
        Update: {
          axis?: string
          last_run_id?: string | null
          metadata?: Json
          updated_at?: string
          weight?: number
        }
        Relationships: []
      }
      engine_function_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          function_name: string
          id: string
          metadata: Json | null
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name: string
          id?: string
          metadata?: Json | null
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          function_name?: string
          id?: string
          metadata?: Json | null
          status?: string
        }
        Relationships: []
      }
      engine_heartbeat_logs: {
        Row: {
          completions_in_aggregation: number | null
          failure_check: string | null
          failure_reason: string | null
          hammer_snapshot_age_ms: number | null
          hie_snapshot_age_ms: number | null
          id: string
          latency_ms: number | null
          metadata: Json
          run_at: string
          success: boolean
        }
        Insert: {
          completions_in_aggregation?: number | null
          failure_check?: string | null
          failure_reason?: string | null
          hammer_snapshot_age_ms?: number | null
          hie_snapshot_age_ms?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          run_at?: string
          success: boolean
        }
        Update: {
          completions_in_aggregation?: number | null
          failure_check?: string | null
          failure_reason?: string | null
          hammer_snapshot_age_ms?: number | null
          hie_snapshot_age_ms?: number | null
          id?: string
          latency_ms?: number | null
          metadata?: Json
          run_at?: string
          success?: boolean
        }
        Relationships: []
      }
      engine_interventions: {
        Row: {
          created_at: string
          directive: string
          executed: boolean
          id: string
          intervention_type: string
          prediction_id: string | null
          priority: number
          trigger_reason: string
          user_id: string
        }
        Insert: {
          created_at?: string
          directive: string
          executed?: boolean
          id?: string
          intervention_type: string
          prediction_id?: string | null
          priority?: number
          trigger_reason: string
          user_id: string
        }
        Update: {
          created_at?: string
          directive?: string
          executed?: boolean
          id?: string
          intervention_type?: string
          prediction_id?: string | null
          priority?: number
          trigger_reason?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_interventions_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "engine_state_predictions"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_regression_results: {
        Row: {
          baseline_snapshot_id: string | null
          baseline_state: string
          drift_score: number
          id: string
          metadata: Json
          new_state: string
          pass: boolean
          run_at: string
          test_case: string
          user_id: string | null
        }
        Insert: {
          baseline_snapshot_id?: string | null
          baseline_state: string
          drift_score: number
          id?: string
          metadata?: Json
          new_state: string
          pass: boolean
          run_at?: string
          test_case: string
          user_id?: string | null
        }
        Update: {
          baseline_snapshot_id?: string | null
          baseline_state?: string
          drift_score?: number
          id?: string
          metadata?: Json
          new_state?: string
          pass?: boolean
          run_at?: string
          test_case?: string
          user_id?: string | null
        }
        Relationships: []
      }
      engine_sentinel_logs: {
        Row: {
          actual_state: string | null
          drift_flag: boolean
          drift_score: number
          engine_snapshot: Json
          expected_state: string
          failure_reason: string | null
          id: string
          inputs_snapshot: Json
          metadata: Json
          run_at: string
          user_id: string
        }
        Insert: {
          actual_state?: string | null
          drift_flag?: boolean
          drift_score?: number
          engine_snapshot?: Json
          expected_state: string
          failure_reason?: string | null
          id?: string
          inputs_snapshot?: Json
          metadata?: Json
          run_at?: string
          user_id: string
        }
        Update: {
          actual_state?: string | null
          drift_flag?: boolean
          drift_score?: number
          engine_snapshot?: Json
          expected_state?: string
          failure_reason?: string | null
          id?: string
          inputs_snapshot?: Json
          metadata?: Json
          run_at?: string
          user_id?: string
        }
        Relationships: []
      }
      engine_settings: {
        Row: {
          description: string | null
          id: string
          is_override: boolean
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          description?: string | null
          id?: string
          is_override?: boolean
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          description?: string | null
          id?: string
          is_override?: boolean
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      engine_snapshot_versions: {
        Row: {
          created_at: string
          engine_version: string
          id: string
          inputs: Json
          output: Json
          profile: Json | null
          snapshot_id: string
          user_id: string
          weights: Json
        }
        Insert: {
          created_at?: string
          engine_version?: string
          id?: string
          inputs?: Json
          output?: Json
          profile?: Json | null
          snapshot_id: string
          user_id: string
          weights?: Json
        }
        Update: {
          created_at?: string
          engine_version?: string
          id?: string
          inputs?: Json
          output?: Json
          profile?: Json | null
          snapshot_id?: string
          user_id?: string
          weights?: Json
        }
        Relationships: [
          {
            foreignKeyName: "engine_snapshot_versions_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "hammer_state_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_state_predictions: {
        Row: {
          base_snapshot_id: string | null
          confidence_24h: number
          confidence_48h: number
          confidence_72h: number
          created_at: string
          id: string
          input_vector: Json
          predicted_state_24h: string
          predicted_state_48h: string
          predicted_state_72h: string
          risk_flags: string[]
          user_id: string
        }
        Insert: {
          base_snapshot_id?: string | null
          confidence_24h: number
          confidence_48h: number
          confidence_72h: number
          created_at?: string
          id?: string
          input_vector?: Json
          predicted_state_24h: string
          predicted_state_48h: string
          predicted_state_72h: string
          risk_flags?: string[]
          user_id: string
        }
        Update: {
          base_snapshot_id?: string | null
          confidence_24h?: number
          confidence_48h?: number
          confidence_72h?: number
          created_at?: string
          id?: string
          input_vector?: Json
          predicted_state_24h?: string
          predicted_state_48h?: string
          predicted_state_72h?: string
          risk_flags?: string[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "engine_state_predictions_base_snapshot_id_fkey"
            columns: ["base_snapshot_id"]
            isOneToOne: false
            referencedRelation: "hammer_state_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      engine_system_health: {
        Row: {
          breakdown: Json
          created_at: string
          id: string
          score: number
        }
        Insert: {
          breakdown?: Json
          created_at?: string
          id?: string
          score: number
        }
        Update: {
          breakdown?: Json
          created_at?: string
          id?: string
          score?: number
        }
        Relationships: []
      }
      engine_weight_adjustments: {
        Row: {
          affected_axis: string
          applied: boolean
          created_at: string
          drift_score: number | null
          id: string
          metadata: Json
          scenario: string | null
          source: string
          suggested_delta: number
        }
        Insert: {
          affected_axis: string
          applied?: boolean
          created_at?: string
          drift_score?: number | null
          id?: string
          metadata?: Json
          scenario?: string | null
          source: string
          suggested_delta: number
        }
        Update: {
          affected_axis?: string
          applied?: boolean
          created_at?: string
          drift_score?: number | null
          id?: string
          metadata?: Json
          scenario?: string | null
          source?: string
          suggested_delta?: number
        }
        Relationships: []
      }
      engine_weight_history: {
        Row: {
          axis: string
          created_at: string
          delta: number
          id: string
          metadata: Json
          source: string
          weight: number
        }
        Insert: {
          axis: string
          created_at?: string
          delta: number
          id?: string
          metadata?: Json
          source: string
          weight: number
        }
        Update: {
          axis?: string
          created_at?: string
          delta?: number
          id?: string
          metadata?: Json
          source?: string
          weight?: number
        }
        Relationships: []
      }
      environment_snapshots: {
        Row: {
          captured_at: string
          conditions: string | null
          humidity: number | null
          id: string
          session_id: string | null
          source: string | null
          temp_f: number | null
          user_id: string
          weather: Json | null
        }
        Insert: {
          captured_at?: string
          conditions?: string | null
          humidity?: number | null
          id?: string
          session_id?: string | null
          source?: string | null
          temp_f?: number | null
          user_id: string
          weather?: Json | null
        }
        Update: {
          captured_at?: string
          conditions?: string | null
          humidity?: number | null
          id?: string
          session_id?: string | null
          source?: string | null
          temp_f?: number | null
          user_id?: string
          weather?: Json | null
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
          completion_method: string
          completion_state: string
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
          completion_method?: string
          completion_state?: string
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
          completion_method?: string
          completion_state?: string
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
      follower_notification_prefs: {
        Row: {
          created_at: string
          delivery_hour_local: number
          email_enabled: boolean
          follower_id: string
          milestone_alerts_enabled: boolean
          monthly_per_player_enabled: boolean
          timezone: string
          updated_at: string
          weekly_digest_enabled: boolean
        }
        Insert: {
          created_at?: string
          delivery_hour_local?: number
          email_enabled?: boolean
          follower_id: string
          milestone_alerts_enabled?: boolean
          monthly_per_player_enabled?: boolean
          timezone?: string
          updated_at?: string
          weekly_digest_enabled?: boolean
        }
        Update: {
          created_at?: string
          delivery_hour_local?: number
          email_enabled?: boolean
          follower_id?: string
          milestone_alerts_enabled?: boolean
          monthly_per_player_enabled?: boolean
          timezone?: string
          updated_at?: string
          weekly_digest_enabled?: boolean
        }
        Relationships: []
      }
      follower_report_events: {
        Row: {
          created_at: string
          event_type: string
          follower_id: string
          id: string
          metadata: Json | null
          player_id: string | null
          report_id: string | null
        }
        Insert: {
          created_at?: string
          event_type: string
          follower_id: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          report_id?: string | null
        }
        Update: {
          created_at?: string
          event_type?: string
          follower_id?: string
          id?: string
          metadata?: Json | null
          player_id?: string | null
          report_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "follower_report_events_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "follower_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      follower_report_logs: {
        Row: {
          created_at: string
          duration_ms: number | null
          error: string | null
          follower_id: string | null
          id: string
          period_start: string | null
          player_id: string | null
          reason: string | null
          report_type: string | null
          retryable: boolean
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          follower_id?: string | null
          id?: string
          period_start?: string | null
          player_id?: string | null
          reason?: string | null
          report_type?: string | null
          retryable?: boolean
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error?: string | null
          follower_id?: string | null
          id?: string
          period_start?: string | null
          player_id?: string | null
          reason?: string | null
          report_type?: string | null
          retryable?: boolean
          status?: string
        }
        Relationships: []
      }
      follower_reports: {
        Row: {
          created_at: string
          follower_id: string
          follower_role: string
          headline: string | null
          id: string
          pdf_url: string | null
          period_end: string
          period_start: string
          player_id: string
          report_data: Json
          report_type: string
          status: string
          updated_at: string
          viewed_at: string | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          follower_role: string
          headline?: string | null
          id?: string
          pdf_url?: string | null
          period_end: string
          period_start: string
          player_id: string
          report_data?: Json
          report_type: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          follower_role?: string
          headline?: string | null
          id?: string
          pdf_url?: string | null
          period_end?: string
          period_start?: string
          player_id?: string
          report_data?: Json
          report_type?: string
          status?: string
          updated_at?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      game_opponents: {
        Row: {
          created_at: string | null
          id: string
          last_faced_at: string | null
          matchup_context: string | null
          opponent_name: string
          opponent_type: string
          times_faced: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_faced_at?: string | null
          matchup_context?: string | null
          opponent_name: string
          opponent_type?: string
          times_faced?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_faced_at?: string | null
          matchup_context?: string | null
          opponent_name?: string
          opponent_type?: string
          times_faced?: number | null
          user_id?: string
        }
        Relationships: []
      }
      game_plan_days: {
        Row: {
          created_at: string
          date: string
          id: string
          is_completed: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          is_completed?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
      game_plan_user_preferences: {
        Row: {
          created_at: string
          manual_order_checkin: string[]
          manual_order_custom: string[]
          manual_order_tracking: string[]
          manual_order_training: string[]
          sort_mode: string
          timeline_order: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          manual_order_checkin?: string[]
          manual_order_custom?: string[]
          manual_order_tracking?: string[]
          manual_order_training?: string[]
          sort_mode?: string
          timeline_order?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          manual_order_checkin?: string[]
          manual_order_custom?: string[]
          manual_order_tracking?: string[]
          manual_order_training?: string[]
          sort_mode?: string
          timeline_order?: string[]
          updated_at?: string
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
      game_plays: {
        Row: {
          at_bat_outcome: string | null
          baserunning_data: Json | null
          batted_ball_type: string | null
          batter_name: string | null
          batter_order: number | null
          catcher_data: Json | null
          contact_quality: string | null
          created_at: string | null
          defensive_data: Json | null
          exit_velocity_mph: number | null
          game_id: string
          half: string
          id: string
          inning: number
          launch_angle: number | null
          pitch_location: Json | null
          pitch_number: number | null
          pitch_result: string
          pitch_type: string | null
          pitch_velocity_mph: number | null
          pitcher_name: string | null
          rbi: number | null
          situational_data: Json | null
          spray_direction: string | null
          velocity_band: string | null
          video_end_sec: number | null
          video_id: string | null
          video_start_sec: number | null
        }
        Insert: {
          at_bat_outcome?: string | null
          baserunning_data?: Json | null
          batted_ball_type?: string | null
          batter_name?: string | null
          batter_order?: number | null
          catcher_data?: Json | null
          contact_quality?: string | null
          created_at?: string | null
          defensive_data?: Json | null
          exit_velocity_mph?: number | null
          game_id: string
          half?: string
          id?: string
          inning: number
          launch_angle?: number | null
          pitch_location?: Json | null
          pitch_number?: number | null
          pitch_result: string
          pitch_type?: string | null
          pitch_velocity_mph?: number | null
          pitcher_name?: string | null
          rbi?: number | null
          situational_data?: Json | null
          spray_direction?: string | null
          velocity_band?: string | null
          video_end_sec?: number | null
          video_id?: string | null
          video_start_sec?: number | null
        }
        Update: {
          at_bat_outcome?: string | null
          baserunning_data?: Json | null
          batted_ball_type?: string | null
          batter_name?: string | null
          batter_order?: number | null
          catcher_data?: Json | null
          contact_quality?: string | null
          created_at?: string | null
          defensive_data?: Json | null
          exit_velocity_mph?: number | null
          game_id?: string
          half?: string
          id?: string
          inning?: number
          launch_angle?: number | null
          pitch_location?: Json | null
          pitch_number?: number | null
          pitch_result?: string
          pitch_type?: string | null
          pitch_velocity_mph?: number | null
          pitcher_name?: string | null
          rbi?: number | null
          situational_data?: Json | null
          spray_direction?: string | null
          velocity_band?: string | null
          video_end_sec?: number | null
          video_id?: string | null
          video_start_sec?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "game_plays_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          base_distance_ft: number
          coach_insights: Json | null
          created_at: string | null
          game_date: string
          game_mode: string | null
          game_summary: Json | null
          game_type: string
          id: string
          is_practice_game: boolean | null
          league_level: string
          legacy_in_players_club: boolean
          lineup: Json
          mound_distance_ft: number
          opponent_name: string
          sport: string
          starting_pitcher_id: string | null
          status: string
          team_name: string
          total_innings: number
          updated_at: string | null
          user_id: string
          venue: string | null
        }
        Insert: {
          base_distance_ft: number
          coach_insights?: Json | null
          created_at?: string | null
          game_date?: string
          game_mode?: string | null
          game_summary?: Json | null
          game_type: string
          id?: string
          is_practice_game?: boolean | null
          league_level: string
          legacy_in_players_club?: boolean
          lineup?: Json
          mound_distance_ft: number
          opponent_name: string
          sport?: string
          starting_pitcher_id?: string | null
          status?: string
          team_name: string
          total_innings?: number
          updated_at?: string | null
          user_id: string
          venue?: string | null
        }
        Update: {
          base_distance_ft?: number
          coach_insights?: Json | null
          created_at?: string | null
          game_date?: string
          game_mode?: string | null
          game_summary?: Json | null
          game_type?: string
          id?: string
          is_practice_game?: boolean | null
          league_level?: string
          legacy_in_players_club?: boolean
          lineup?: Json
          mound_distance_ft?: number
          opponent_name?: string
          sport?: string
          starting_pitcher_id?: string | null
          status?: string
          team_name?: string
          total_innings?: number
          updated_at?: string | null
          user_id?: string
          venue?: string | null
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
      hammer_state_explanations_v2: {
        Row: {
          confidence: number
          constraint_text: string
          created_at: string
          elite_message: string
          id: string
          micro_directive: string
          snapshot_id: string
          state: string
          user_id: string
        }
        Insert: {
          confidence?: number
          constraint_text: string
          created_at?: string
          elite_message: string
          id?: string
          micro_directive: string
          snapshot_id: string
          state: string
          user_id: string
        }
        Update: {
          confidence?: number
          constraint_text?: string
          created_at?: string
          elite_message?: string
          id?: string
          micro_directive?: string
          snapshot_id?: string
          state?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "hammer_state_explanations_v2_snapshot_id_fkey"
            columns: ["snapshot_id"]
            isOneToOne: false
            referencedRelation: "hammer_state_snapshots"
            referencedColumns: ["id"]
          },
        ]
      }
      hammer_state_snapshots: {
        Row: {
          arousal_inputs: Json | null
          arousal_score: number | null
          cognitive_inputs: Json | null
          cognitive_load: number | null
          computed_at: string
          confidence: number | null
          dopamine_inputs: Json | null
          dopamine_load: number | null
          id: string
          motor_inputs: Json | null
          motor_state: string | null
          overall_state: string | null
          recovery_inputs: Json | null
          recovery_score: number | null
          schema_version: number
          user_id: string
        }
        Insert: {
          arousal_inputs?: Json | null
          arousal_score?: number | null
          cognitive_inputs?: Json | null
          cognitive_load?: number | null
          computed_at?: string
          confidence?: number | null
          dopamine_inputs?: Json | null
          dopamine_load?: number | null
          id?: string
          motor_inputs?: Json | null
          motor_state?: string | null
          overall_state?: string | null
          recovery_inputs?: Json | null
          recovery_score?: number | null
          schema_version?: number
          user_id: string
        }
        Update: {
          arousal_inputs?: Json | null
          arousal_score?: number | null
          cognitive_inputs?: Json | null
          cognitive_load?: number | null
          computed_at?: string
          confidence?: number | null
          dopamine_inputs?: Json | null
          dopamine_load?: number | null
          id?: string
          motor_inputs?: Json | null
          motor_state?: string | null
          overall_state?: string | null
          recovery_inputs?: Json | null
          recovery_score?: number | null
          schema_version?: number
          user_id?: string
        }
        Relationships: []
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
      hie_dirty_users: {
        Row: {
          attempt_count: number
          dirtied_at: string
          processing_started_at: string | null
          user_id: string
        }
        Insert: {
          attempt_count?: number
          dirtied_at?: string
          processing_started_at?: string | null
          user_id: string
        }
        Update: {
          attempt_count?: number
          dirtied_at?: string
          processing_started_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hie_execution_locks: {
        Row: {
          locked_at: string
          rerun_requested: boolean
          user_id: string
        }
        Insert: {
          locked_at?: string
          rerun_requested?: boolean
          user_id: string
        }
        Update: {
          locked_at?: string
          rerun_requested?: boolean
          user_id?: string
        }
        Relationships: []
      }
      hie_snapshots: {
        Row: {
          before_after_trends: Json | null
          computed_at: string
          created_at: string
          decision_speed_index: number | null
          development_confidence: number | null
          development_status: string
          drill_effectiveness: Json | null
          id: string
          movement_efficiency_score: number | null
          mpi_score: number | null
          mpi_trend_30d: number | null
          mpi_trend_7d: number | null
          prescriptive_actions: Json | null
          primary_limiter: string | null
          readiness_recommendation: string | null
          readiness_score: number | null
          risk_alerts: Json | null
          schema_version: number
          season_phase: string | null
          season_phase_label: string | null
          season_phase_source: string | null
          smart_week_plan: Json | null
          sport: string
          training_readiness_score: number | null
          transfer_score: number | null
          updated_at: string
          user_id: string
          weakness_clusters: Json | null
        }
        Insert: {
          before_after_trends?: Json | null
          computed_at?: string
          created_at?: string
          decision_speed_index?: number | null
          development_confidence?: number | null
          development_status?: string
          drill_effectiveness?: Json | null
          id?: string
          movement_efficiency_score?: number | null
          mpi_score?: number | null
          mpi_trend_30d?: number | null
          mpi_trend_7d?: number | null
          prescriptive_actions?: Json | null
          primary_limiter?: string | null
          readiness_recommendation?: string | null
          readiness_score?: number | null
          risk_alerts?: Json | null
          schema_version?: number
          season_phase?: string | null
          season_phase_label?: string | null
          season_phase_source?: string | null
          smart_week_plan?: Json | null
          sport?: string
          training_readiness_score?: number | null
          transfer_score?: number | null
          updated_at?: string
          user_id: string
          weakness_clusters?: Json | null
        }
        Update: {
          before_after_trends?: Json | null
          computed_at?: string
          created_at?: string
          decision_speed_index?: number | null
          development_confidence?: number | null
          development_status?: string
          drill_effectiveness?: Json | null
          id?: string
          movement_efficiency_score?: number | null
          mpi_score?: number | null
          mpi_trend_30d?: number | null
          mpi_trend_7d?: number | null
          prescriptive_actions?: Json | null
          primary_limiter?: string | null
          readiness_recommendation?: string | null
          readiness_score?: number | null
          risk_alerts?: Json | null
          schema_version?: number
          season_phase?: string | null
          season_phase_label?: string | null
          season_phase_source?: string | null
          smart_week_plan?: Json | null
          sport?: string
          training_readiness_score?: number | null
          transfer_score?: number | null
          updated_at?: string
          user_id?: string
          weakness_clusters?: Json | null
        }
        Relationships: []
      }
      hie_team_snapshots: {
        Row: {
          computed_at: string
          created_at: string
          id: string
          organization_id: string
          risk_alerts: Json | null
          suggested_team_drills: Json | null
          team_mpi_avg: number | null
          team_weakness_patterns: Json | null
          trending_players: Json | null
          updated_at: string
        }
        Insert: {
          computed_at?: string
          created_at?: string
          id?: string
          organization_id: string
          risk_alerts?: Json | null
          suggested_team_drills?: Json | null
          team_mpi_avg?: number | null
          team_weakness_patterns?: Json | null
          trending_players?: Json | null
          updated_at?: string
        }
        Update: {
          computed_at?: string
          created_at?: string
          id?: string
          organization_id?: string
          risk_alerts?: Json | null
          suggested_team_drills?: Json | null
          team_mpi_avg?: number | null
          team_weakness_patterns?: Json | null
          trending_players?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      hydration_beverage_database: {
        Row: {
          created_at: string
          display_name: string
          id: string
          liquid_type: string
          magnesium_mg_per_oz: number
          micros_per_oz: Json
          potassium_mg_per_oz: number
          sodium_mg_per_oz: number
          source: string
          sugar_g_per_oz: number
          total_carbs_g_per_oz: number
          updated_at: string
          usda_fdc_id: string | null
          water_g_per_oz: number
        }
        Insert: {
          created_at?: string
          display_name: string
          id?: string
          liquid_type: string
          magnesium_mg_per_oz?: number
          micros_per_oz?: Json
          potassium_mg_per_oz?: number
          sodium_mg_per_oz?: number
          source?: string
          sugar_g_per_oz?: number
          total_carbs_g_per_oz?: number
          updated_at?: string
          usda_fdc_id?: string | null
          water_g_per_oz?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          liquid_type?: string
          magnesium_mg_per_oz?: number
          micros_per_oz?: Json
          potassium_mg_per_oz?: number
          sodium_mg_per_oz?: number
          source?: string
          sugar_g_per_oz?: number
          total_carbs_g_per_oz?: number
          updated_at?: string
          usda_fdc_id?: string | null
          water_g_per_oz?: number
        }
        Relationships: []
      }
      hydration_logs: {
        Row: {
          absorption_score: number | null
          ai_estimated: boolean | null
          amount_oz: number
          calcium_mg: number | null
          confidence: number | null
          custom_label: string | null
          fructose_g: number | null
          glucose_g: number | null
          hydration_profile: Json | null
          id: string
          liquid_type: string | null
          log_date: string | null
          logged_at: string | null
          magnesium_mg: number | null
          micros: Json | null
          nutrition_incomplete: boolean | null
          osmolality_estimate: number | null
          potassium_mg: number | null
          quality_class: string | null
          sodium_mg: number | null
          sugar_g: number | null
          total_carbs_g: number | null
          user_id: string
          water_g: number | null
        }
        Insert: {
          absorption_score?: number | null
          ai_estimated?: boolean | null
          amount_oz: number
          calcium_mg?: number | null
          confidence?: number | null
          custom_label?: string | null
          fructose_g?: number | null
          glucose_g?: number | null
          hydration_profile?: Json | null
          id?: string
          liquid_type?: string | null
          log_date?: string | null
          logged_at?: string | null
          magnesium_mg?: number | null
          micros?: Json | null
          nutrition_incomplete?: boolean | null
          osmolality_estimate?: number | null
          potassium_mg?: number | null
          quality_class?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          total_carbs_g?: number | null
          user_id: string
          water_g?: number | null
        }
        Update: {
          absorption_score?: number | null
          ai_estimated?: boolean | null
          amount_oz?: number
          calcium_mg?: number | null
          confidence?: number | null
          custom_label?: string | null
          fructose_g?: number | null
          glucose_g?: number | null
          hydration_profile?: Json | null
          id?: string
          liquid_type?: string | null
          log_date?: string | null
          logged_at?: string | null
          magnesium_mg?: number | null
          micros?: Json | null
          nutrition_incomplete?: boolean | null
          osmolality_estimate?: number | null
          potassium_mg?: number | null
          quality_class?: string | null
          sodium_mg?: number | null
          sugar_g?: number | null
          total_carbs_g?: number | null
          user_id?: string
          water_g?: number | null
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
      launch_events: {
        Row: {
          created_at: string
          event: string
          id: string
          payload: Json
          ts: string
        }
        Insert: {
          created_at?: string
          event: string
          id?: string
          payload?: Json
          ts?: string
        }
        Update: {
          created_at?: string
          event?: string
          id?: string
          payload?: Json
          ts?: string
        }
        Relationships: []
      }
      league_classifications: {
        Row: {
          ai_classified: boolean | null
          country: string | null
          created_at: string | null
          difficulty_multiplier: number
          id: string
          league_name: string
          sport: string
        }
        Insert: {
          ai_classified?: boolean | null
          country?: string | null
          created_at?: string | null
          difficulty_multiplier?: number
          id?: string
          league_name: string
          sport: string
        }
        Update: {
          ai_classified?: boolean | null
          country?: string | null
          created_at?: string | null
          difficulty_multiplier?: number
          id?: string
          league_name?: string
          sport?: string
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
      library_tags: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          parent_category: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          parent_category?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_category?: string | null
        }
        Relationships: []
      }
      library_video_analytics: {
        Row: {
          action: string
          created_at: string
          id: string
          search_term: string | null
          user_id: string | null
          video_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          search_term?: string | null
          user_id?: string | null
          video_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          search_term?: string | null
          user_id?: string | null
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "library_video_analytics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      library_video_likes: {
        Row: {
          created_at: string
          id: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "library_video_likes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      library_video_monetization: {
        Row: {
          conversion_score: number
          cta_type: string | null
          cta_url: string | null
          linked_program_id: string | null
          series_slug: string | null
          updated_at: string
          video_id: string
        }
        Insert: {
          conversion_score?: number
          cta_type?: string | null
          cta_url?: string | null
          linked_program_id?: string | null
          series_slug?: string | null
          updated_at?: string
          video_id: string
        }
        Update: {
          conversion_score?: number
          cta_type?: string | null
          cta_url?: string | null
          linked_program_id?: string | null
          series_slug?: string | null
          updated_at?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_video_monetization_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_video_monetization_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "library_video_monetization_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      library_videos: {
        Row: {
          ai_description: string | null
          category: string | null
          confidence_score: number
          created_at: string
          description: string | null
          distribution_tier: string
          id: string
          likes_count: number
          notes: string | null
          owner_id: string
          skill_domains:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport: string[]
          tags: string[]
          thumbnail_url: string | null
          tier_rank: number
          title: string
          updated_at: string
          video_format: Database["public"]["Enums"]["video_type_enum"] | null
          video_type: string
          video_url: string | null
          views_count: number
        }
        Insert: {
          ai_description?: string | null
          category?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          distribution_tier?: string
          id?: string
          likes_count?: number
          notes?: string | null
          owner_id: string
          skill_domains?:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport?: string[]
          tags?: string[]
          thumbnail_url?: string | null
          tier_rank?: number
          title: string
          updated_at?: string
          video_format?: Database["public"]["Enums"]["video_type_enum"] | null
          video_type?: string
          video_url?: string | null
          views_count?: number
        }
        Update: {
          ai_description?: string | null
          category?: string | null
          confidence_score?: number
          created_at?: string
          description?: string | null
          distribution_tier?: string
          id?: string
          likes_count?: number
          notes?: string | null
          owner_id?: string
          skill_domains?:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport?: string[]
          tags?: string[]
          thumbnail_url?: string | null
          tier_rank?: number
          title?: string
          updated_at?: string
          video_format?: Database["public"]["Enums"]["video_type_enum"] | null
          video_type?: string
          video_url?: string | null
          views_count?: number
        }
        Relationships: []
      }
      live_ab_links: {
        Row: {
          claimed_at: string | null
          created_at: string | null
          creator_session_id: string | null
          creator_user_id: string
          expires_at: string | null
          id: string
          joiner_session_id: string | null
          joiner_user_id: string | null
          link_code: string
          linked_at: string | null
          sport: string
          status: string
        }
        Insert: {
          claimed_at?: string | null
          created_at?: string | null
          creator_session_id?: string | null
          creator_user_id: string
          expires_at?: string | null
          id?: string
          joiner_session_id?: string | null
          joiner_user_id?: string | null
          link_code: string
          linked_at?: string | null
          sport: string
          status?: string
        }
        Update: {
          claimed_at?: string | null
          created_at?: string | null
          creator_session_id?: string | null
          creator_user_id?: string
          expires_at?: string | null
          id?: string
          joiner_session_id?: string | null
          joiner_user_id?: string | null
          link_code?: string
          linked_at?: string | null
          sport?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_ab_links_creator_session_id_fkey"
            columns: ["creator_session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "live_ab_links_joiner_session_id_fkey"
            columns: ["joiner_session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          age_curve_multiplier: number | null
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
          is_provisional: boolean
          position_weight: number | null
          pro_probability: number | null
          pro_probability_capped: boolean | null
          schema_version: number
          scoring_inputs: Json | null
          segment_pool: string | null
          sport: string
          tier_multiplier: number | null
          total_athletes_in_pool: number | null
          trend_delta_30d: number | null
          trend_direction: string | null
          user_id: string
          verified_stat_boost: number | null
        }
        Insert: {
          adjusted_global_score?: number | null
          age_curve_multiplier?: number | null
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
          is_provisional?: boolean
          position_weight?: number | null
          pro_probability?: number | null
          pro_probability_capped?: boolean | null
          schema_version?: number
          scoring_inputs?: Json | null
          segment_pool?: string | null
          sport: string
          tier_multiplier?: number | null
          total_athletes_in_pool?: number | null
          trend_delta_30d?: number | null
          trend_direction?: string | null
          user_id: string
          verified_stat_boost?: number | null
        }
        Update: {
          adjusted_global_score?: number | null
          age_curve_multiplier?: number | null
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
          is_provisional?: boolean
          position_weight?: number | null
          pro_probability?: number | null
          pro_probability_capped?: boolean | null
          schema_version?: number
          scoring_inputs?: Json | null
          segment_pool?: string | null
          sport?: string
          tier_multiplier?: number | null
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
          calcium_mg: number | null
          calories_per_serving: number | null
          carbs_g: number | null
          created_at: string | null
          created_by: string | null
          external_id: string | null
          fats_g: number | null
          fiber_g: number | null
          folate_mcg: number | null
          food_category: string[] | null
          id: string
          iron_mg: number | null
          magnesium_mg: number | null
          name: string
          potassium_mg: number | null
          protein_g: number | null
          serving_size: string | null
          serving_size_grams: number | null
          sodium_mg: number | null
          source: string | null
          sugar_g: number | null
          vitamin_a_mcg: number | null
          vitamin_b12_mcg: number | null
          vitamin_b6_mg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          vitamin_e_mg: number | null
          vitamin_k_mcg: number | null
          zinc_mg: number | null
        }
        Insert: {
          barcode?: string | null
          brand?: string | null
          calcium_mg?: number | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          fats_g?: number | null
          fiber_g?: number | null
          folate_mcg?: number | null
          food_category?: string[] | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          name: string
          potassium_mg?: number | null
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          barcode?: string | null
          brand?: string | null
          calcium_mg?: number | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          created_at?: string | null
          created_by?: string | null
          external_id?: string | null
          fats_g?: number | null
          fiber_g?: number | null
          folate_mcg?: number | null
          food_category?: string[] | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          name?: string
          potassium_mg?: number | null
          protein_g?: number | null
          serving_size?: string | null
          serving_size_grams?: number | null
          sodium_mg?: number | null
          source?: string | null
          sugar_g?: number | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
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
      nutrition_suggestion_interactions: {
        Row: {
          action: string
          created_at: string | null
          effectiveness_delta: number | null
          food_name: string
          id: string
          nutrient_key: string
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string | null
          effectiveness_delta?: number | null
          food_name: string
          id?: string
          nutrient_key: string
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string | null
          effectiveness_delta?: number | null
          food_name?: string
          id?: string
          nutrient_key?: string
          user_id?: string
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
      pending_drills: {
        Row: {
          ai_context: string | null
          created_at: string | null
          description: string | null
          id: string
          module: string
          positions: string[] | null
          progression_level: number
          rejection_reason: string | null
          skill_target: string | null
          source: string
          sport: string
          status: string
          tags: Json
          title: string
        }
        Insert: {
          ai_context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          positions?: string[] | null
          progression_level?: number
          rejection_reason?: string | null
          skill_target?: string | null
          source?: string
          sport?: string
          status?: string
          tags?: Json
          title: string
        }
        Update: {
          ai_context?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
          positions?: string[] | null
          progression_level?: number
          rejection_reason?: string | null
          skill_target?: string | null
          source?: string
          sport?: string
          status?: string
          tags?: Json
          title?: string
        }
        Relationships: []
      }
      performance_sessions: {
        Row: {
          age_play_up_bonus: number | null
          batting_side_used: string | null
          calendar_event_id: string | null
          coach_grade: number | null
          coach_id: string | null
          coach_override_applied: boolean | null
          coach_override_id: string | null
          competition_level: string | null
          competition_weight: number | null
          composite_indexes: Json | null
          created_at: string
          data_density_level: number | null
          deleted_at: string | null
          detected_issues: string[] | null
          drill_blocks: Json
          edited_at: string | null
          effective_grade: number | null
          fatigue_state_at_session: Json | null
          id: string
          idempotency_key: string | null
          intent_compliance_pct: number | null
          is_locked: boolean | null
          is_retroactive: boolean | null
          legacy_in_players_club: boolean
          link_code: string | null
          linked_session_id: string | null
          micro_layer_data: Json | null
          module: string | null
          notes: string | null
          opponent_level: string | null
          opponent_name: string | null
          organization_id: string | null
          player_grade: number | null
          schema_version: number
          season_context: string | null
          season_context_overridden: boolean
          session_date: string
          session_type: string
          sport: string
          throwing_hand_used: string | null
          updated_at: string
          user_id: string
          voice_notes: string[] | null
        }
        Insert: {
          age_play_up_bonus?: number | null
          batting_side_used?: string | null
          calendar_event_id?: string | null
          coach_grade?: number | null
          coach_id?: string | null
          coach_override_applied?: boolean | null
          coach_override_id?: string | null
          competition_level?: string | null
          competition_weight?: number | null
          composite_indexes?: Json | null
          created_at?: string
          data_density_level?: number | null
          deleted_at?: string | null
          detected_issues?: string[] | null
          drill_blocks?: Json
          edited_at?: string | null
          effective_grade?: number | null
          fatigue_state_at_session?: Json | null
          id?: string
          idempotency_key?: string | null
          intent_compliance_pct?: number | null
          is_locked?: boolean | null
          is_retroactive?: boolean | null
          legacy_in_players_club?: boolean
          link_code?: string | null
          linked_session_id?: string | null
          micro_layer_data?: Json | null
          module?: string | null
          notes?: string | null
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          player_grade?: number | null
          schema_version?: number
          season_context?: string | null
          season_context_overridden?: boolean
          session_date?: string
          session_type: string
          sport: string
          throwing_hand_used?: string | null
          updated_at?: string
          user_id: string
          voice_notes?: string[] | null
        }
        Update: {
          age_play_up_bonus?: number | null
          batting_side_used?: string | null
          calendar_event_id?: string | null
          coach_grade?: number | null
          coach_id?: string | null
          coach_override_applied?: boolean | null
          coach_override_id?: string | null
          competition_level?: string | null
          competition_weight?: number | null
          composite_indexes?: Json | null
          created_at?: string
          data_density_level?: number | null
          deleted_at?: string | null
          detected_issues?: string[] | null
          drill_blocks?: Json
          edited_at?: string | null
          effective_grade?: number | null
          fatigue_state_at_session?: Json | null
          id?: string
          idempotency_key?: string | null
          intent_compliance_pct?: number | null
          is_locked?: boolean | null
          is_retroactive?: boolean | null
          legacy_in_players_club?: boolean
          link_code?: string | null
          linked_session_id?: string | null
          micro_layer_data?: Json | null
          module?: string | null
          notes?: string | null
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          player_grade?: number | null
          schema_version?: number
          season_context?: string | null
          season_context_overridden?: boolean
          session_date?: string
          session_type?: string
          sport?: string
          throwing_hand_used?: string | null
          updated_at?: string
          user_id?: string
          voice_notes?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "performance_sessions_linked_session_id_fkey"
            columns: ["linked_session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      performance_sessions_ledger: {
        Row: {
          captured_at: string
          id: string
          reason: string
          session_id: string
          snapshot: Json
          user_id: string | null
        }
        Insert: {
          captured_at?: string
          id?: string
          reason: string
          session_id: string
          snapshot: Json
          user_id?: string | null
        }
        Update: {
          captured_at?: string
          id?: string
          reason?: string
          session_id?: string
          snapshot?: Json
          user_id?: string | null
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
      prediction_outcomes: {
        Row: {
          accuracy_score: number
          actual_snapshot_id: string | null
          actual_state_24h: string
          created_at: string
          id: string
          prediction_id: string
        }
        Insert: {
          accuracy_score: number
          actual_snapshot_id?: string | null
          actual_state_24h: string
          created_at?: string
          id?: string
          prediction_id: string
        }
        Update: {
          accuracy_score?: number
          actual_snapshot_id?: string | null
          actual_state_24h?: string
          created_at?: string
          id?: string
          prediction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prediction_outcomes_prediction_id_fkey"
            columns: ["prediction_id"]
            isOneToOne: false
            referencedRelation: "engine_state_predictions"
            referencedColumns: ["id"]
          },
        ]
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
          activation_choice: string | null
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
          is_system_account: boolean
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
          activation_choice?: string | null
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
          is_system_account?: boolean
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
          activation_choice?: string | null
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
          is_system_account?: boolean
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
      promo_projects: {
        Row: {
          created_at: string
          format: string
          id: string
          output_url: string | null
          render_metadata: Json | null
          scene_sequence: Json
          status: string
          target_audience: string
          target_duration: number
          title: string
          updated_at: string
          video_goal: string
        }
        Insert: {
          created_at?: string
          format?: string
          id?: string
          output_url?: string | null
          render_metadata?: Json | null
          scene_sequence?: Json
          status?: string
          target_audience: string
          target_duration?: number
          title: string
          updated_at?: string
          video_goal: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          output_url?: string | null
          render_metadata?: Json | null
          scene_sequence?: Json
          status?: string
          target_audience?: string
          target_duration?: number
          title?: string
          updated_at?: string
          video_goal?: string
        }
        Relationships: []
      }
      promo_render_queue: {
        Row: {
          completed_at: string | null
          created_at: string
          error_message: string | null
          format: string
          id: string
          max_retries: number
          output_url: string | null
          project_id: string
          render_id: string | null
          render_metadata: Json | null
          retry_count: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          format: string
          id?: string
          max_retries?: number
          output_url?: string | null
          project_id: string
          render_id?: string | null
          render_metadata?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          format?: string
          id?: string
          max_retries?: number
          output_url?: string | null
          project_id?: string
          render_id?: string | null
          render_metadata?: Json | null
          retry_count?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_render_queue_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "promo_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_scenes: {
        Row: {
          created_at: string
          description: string | null
          duration_variant: string
          feature_area: string
          id: string
          scene_key: string
          sim_data: Json
          status: string
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration_variant?: string
          feature_area: string
          id?: string
          scene_key: string
          sim_data?: Json
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration_variant?: string
          feature_area?: string
          id?: string
          scene_key?: string
          sim_data?: Json
          status?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      purchases: {
        Row: {
          amount_cents: number | null
          build_id: string
          build_name: string | null
          build_type: string
          buyer_email: string
          buyer_user_id: string | null
          created_at: string
          currency: string | null
          id: string
          stripe_session_id: string
        }
        Insert: {
          amount_cents?: number | null
          build_id: string
          build_name?: string | null
          build_type: string
          buyer_email: string
          buyer_user_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          stripe_session_id: string
        }
        Update: {
          amount_cents?: number | null
          build_id?: string
          build_name?: string | null
          build_type?: string
          buyer_email?: string
          buyer_user_id?: string | null
          created_at?: string
          currency?: string | null
          id?: string
          stripe_session_id?: string
        }
        Relationships: []
      }
      recap_engine_settings: {
        Row: {
          disabled_sections: string[]
          id: string
          input_weights: Json
          scope: string
          season_overrides: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          disabled_sections?: string[]
          id?: string
          input_weights?: Json
          scope?: string
          season_overrides?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          disabled_sections?: string[]
          id?: string
          input_weights?: Json
          scope?: string
          season_overrides?: Json
          updated_at?: string
          updated_by?: string | null
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
      royal_timing_messages: {
        Row: {
          created_at: string | null
          id: string
          message: string
          sender_id: string
          session_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          message: string
          sender_id: string
          session_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string
          sender_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "royal_timing_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "royal_timing_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      royal_timing_sessions: {
        Row: {
          ai_analysis: Json | null
          created_at: string | null
          findings: string | null
          id: string
          sport: string | null
          subject_reason: string | null
          timer_data: Json | null
          updated_at: string | null
          user_id: string
          video_1_path: string | null
          video_2_path: string | null
          video_urls: string[] | null
        }
        Insert: {
          ai_analysis?: Json | null
          created_at?: string | null
          findings?: string | null
          id?: string
          sport?: string | null
          subject_reason?: string | null
          timer_data?: Json | null
          updated_at?: string | null
          user_id: string
          video_1_path?: string | null
          video_2_path?: string | null
          video_urls?: string[] | null
        }
        Update: {
          ai_analysis?: Json | null
          created_at?: string | null
          findings?: string | null
          id?: string
          sport?: string | null
          subject_reason?: string | null
          timer_data?: Json | null
          updated_at?: string | null
          user_id?: string
          video_1_path?: string | null
          video_2_path?: string | null
          video_urls?: string[] | null
        }
        Relationships: []
      }
      royal_timing_shares: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          recipient_id: string
          sender_id: string
          session_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id: string
          sender_id: string
          session_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          recipient_id?: string
          sender_id?: string
          session_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "royal_timing_shares_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "royal_timing_sessions"
            referencedColumns: ["id"]
          },
        ]
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
      scheduled_practice_sessions: {
        Row: {
          assignment_scope: string | null
          coach_id: string | null
          created_at: string | null
          created_by: string
          description: string | null
          end_time: string | null
          id: string
          opponent_level: string | null
          opponent_name: string | null
          organization_id: string | null
          recurring_active: boolean | null
          recurring_days: number[] | null
          requires_approval: boolean | null
          scheduled_date: string
          session_module: string
          session_type: string
          sport: string
          start_time: string | null
          status: string | null
          team_id: string | null
          team_name: string | null
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          assignment_scope?: string | null
          coach_id?: string | null
          created_at?: string | null
          created_by: string
          description?: string | null
          end_time?: string | null
          id?: string
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          recurring_active?: boolean | null
          recurring_days?: number[] | null
          requires_approval?: boolean | null
          scheduled_date: string
          session_module: string
          session_type: string
          sport?: string
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          assignment_scope?: string | null
          coach_id?: string | null
          created_at?: string | null
          created_by?: string
          description?: string | null
          end_time?: string | null
          id?: string
          opponent_level?: string | null
          opponent_name?: string | null
          organization_id?: string | null
          recurring_active?: boolean | null
          recurring_days?: number[] | null
          requires_approval?: boolean | null
          scheduled_date?: string
          session_module?: string
          session_type?: string
          sport?: string
          start_time?: string | null
          status?: string | null
          team_id?: string | null
          team_name?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_practice_sessions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
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
          confirmed_at: string | null
          created_at: string | null
          id: string
          initiated_by: string | null
          player_id: string
          relationship_type: string | null
          scout_id: string
          status: string
          updated_at: string | null
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          player_id: string
          relationship_type?: string | null
          scout_id: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string | null
          id?: string
          initiated_by?: string | null
          player_id?: string
          relationship_type?: string | null
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
      session_insights: {
        Row: {
          created_at: string
          id: string
          report: Json
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          report?: Json
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          report?: Json
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_insights_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: true
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_start_moods: {
        Row: {
          captured_at: string
          energy: number | null
          id: string
          module: string | null
          mood: number | null
          schema_version: number
          session_id: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          energy?: number | null
          id?: string
          module?: string | null
          mood?: number | null
          schema_version?: number
          session_id?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string
          energy?: number | null
          id?: string
          module?: string | null
          mood?: number | null
          schema_version?: number
          session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      session_videos: {
        Row: {
          created_at: string | null
          duration_ms: number | null
          filename: string | null
          id: string
          metadata: Json | null
          rep_markers: Json | null
          session_id: string
          storage_path: string
          tagged_rep_indexes: number[] | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration_ms?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          rep_markers?: Json | null
          session_id: string
          storage_path: string
          tagged_rep_indexes?: number[] | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration_ms?: number | null
          filename?: string | null
          id?: string
          metadata?: Json | null
          rep_markers?: Json | null
          session_id?: string
          storage_path?: string
          tagged_rep_indexes?: number[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_videos_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
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
          steps_per_rep: Json | null
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
          steps_per_rep?: Json | null
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
          steps_per_rep?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      sprint_analyses: {
        Row: {
          acceleration_profile: Json | null
          ai_model: string | null
          confidence_score: number | null
          created_at: string | null
          distance_key: string
          frame_count: number | null
          grade_20_80: number | null
          grade_breakdown: Json | null
          id: string
          processing_time_ms: number | null
          session_id: string | null
          split_times: Json | null
          sport: string
          steps_per_split: Json | null
          total_steps: number | null
          total_time_sec: number | null
          user_id: string
          validation_reasons: string[] | null
          validation_status: string
          video_url: string
        }
        Insert: {
          acceleration_profile?: Json | null
          ai_model?: string | null
          confidence_score?: number | null
          created_at?: string | null
          distance_key: string
          frame_count?: number | null
          grade_20_80?: number | null
          grade_breakdown?: Json | null
          id?: string
          processing_time_ms?: number | null
          session_id?: string | null
          split_times?: Json | null
          sport?: string
          steps_per_split?: Json | null
          total_steps?: number | null
          total_time_sec?: number | null
          user_id: string
          validation_reasons?: string[] | null
          validation_status?: string
          video_url: string
        }
        Update: {
          acceleration_profile?: Json | null
          ai_model?: string | null
          confidence_score?: number | null
          created_at?: string | null
          distance_key?: string
          frame_count?: number | null
          grade_20_80?: number | null
          grade_breakdown?: Json | null
          id?: string
          processing_time_ms?: number | null
          session_id?: string | null
          split_times?: Json | null
          sport?: string
          steps_per_split?: Json | null
          total_steps?: number | null
          total_time_sec?: number | null
          user_id?: string
          validation_reasons?: string[] | null
          validation_status?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_analyses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "speed_sessions"
            referencedColumns: ["id"]
          },
        ]
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
          module_data_status: Json | null
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
          module_data_status?: Json | null
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
          module_data_status?: Json | null
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
      training_blocks: {
        Row: {
          created_at: string
          end_date: string | null
          generation_metadata: Json | null
          goal: string
          id: string
          idempotency_key: string | null
          pending_goal_change: boolean
          sport: string
          start_date: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          generation_metadata?: Json | null
          goal: string
          id?: string
          idempotency_key?: string | null
          pending_goal_change?: boolean
          sport?: string
          start_date?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          generation_metadata?: Json | null
          goal?: string
          id?: string
          idempotency_key?: string | null
          pending_goal_change?: boolean
          sport?: string
          start_date?: string | null
          status?: string
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
      training_preferences: {
        Row: {
          availability: Json
          equipment: Json
          experience_level: string
          goal: string | null
          injuries: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: Json
          equipment?: Json
          experience_level?: string
          goal?: string | null
          injuries?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: Json
          equipment?: Json
          experience_level?: string
          goal?: string | null
          injuries?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      udl_alerts: {
        Row: {
          alert_type: string
          created_at: string
          dismissed_by: string | null
          id: string
          message: string
          metadata: Json | null
          severity: string
          target_user_id: string
        }
        Insert: {
          alert_type: string
          created_at?: string
          dismissed_by?: string | null
          id?: string
          message: string
          metadata?: Json | null
          severity?: string
          target_user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          dismissed_by?: string | null
          id?: string
          message?: string
          metadata?: Json | null
          severity?: string
          target_user_id?: string
        }
        Relationships: []
      }
      udl_audit_log: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      udl_constraint_overrides: {
        Row: {
          constraint_key: string
          created_by: string
          enabled: boolean | null
          id: string
          prescription_overrides: Json | null
          threshold_overrides: Json | null
          updated_at: string | null
        }
        Insert: {
          constraint_key: string
          created_by: string
          enabled?: boolean | null
          id?: string
          prescription_overrides?: Json | null
          threshold_overrides?: Json | null
          updated_at?: string | null
        }
        Update: {
          constraint_key?: string
          created_by?: string
          enabled?: boolean | null
          id?: string
          prescription_overrides?: Json | null
          threshold_overrides?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      udl_daily_plans: {
        Row: {
          constraints_detected: Json | null
          feedback_applied: Json | null
          generated_at: string | null
          id: string
          linked_sessions: Json | null
          plan_date: string
          player_state: Json | null
          prescribed_drills: Json | null
          readiness_adjustments: Json | null
          user_id: string
        }
        Insert: {
          constraints_detected?: Json | null
          feedback_applied?: Json | null
          generated_at?: string | null
          id?: string
          linked_sessions?: Json | null
          plan_date: string
          player_state?: Json | null
          prescribed_drills?: Json | null
          readiness_adjustments?: Json | null
          user_id: string
        }
        Update: {
          constraints_detected?: Json | null
          feedback_applied?: Json | null
          generated_at?: string | null
          id?: string
          linked_sessions?: Json | null
          plan_date?: string
          player_state?: Json | null
          prescribed_drills?: Json | null
          readiness_adjustments?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      udl_drill_completions: {
        Row: {
          completed_at: string | null
          difficulty_level: number | null
          drill_key: string
          id: string
          plan_id: string
          result_notes: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          difficulty_level?: number | null
          drill_key: string
          id?: string
          plan_id: string
          result_notes?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          difficulty_level?: number | null
          drill_key?: string
          id?: string
          plan_id?: string
          result_notes?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "udl_drill_completions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "udl_daily_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      unverified_foods: {
        Row: {
          calcium_mg: number | null
          calories_per_serving: number | null
          carbs_g: number | null
          confidence_level: string | null
          created_at: string | null
          fats_g: number | null
          folate_mcg: number | null
          id: string
          iron_mg: number | null
          magnesium_mg: number | null
          name: string
          potassium_mg: number | null
          promoted_at: string | null
          protein_g: number | null
          serving_size: string | null
          source: string | null
          vitamin_a_mcg: number | null
          vitamin_b12_mcg: number | null
          vitamin_b6_mg: number | null
          vitamin_c_mg: number | null
          vitamin_d_mcg: number | null
          vitamin_e_mg: number | null
          vitamin_k_mcg: number | null
          zinc_mg: number | null
        }
        Insert: {
          calcium_mg?: number | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          confidence_level?: string | null
          created_at?: string | null
          fats_g?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          name: string
          potassium_mg?: number | null
          promoted_at?: string | null
          protein_g?: number | null
          serving_size?: string | null
          source?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
        }
        Update: {
          calcium_mg?: number | null
          calories_per_serving?: number | null
          carbs_g?: number | null
          confidence_level?: string | null
          created_at?: string | null
          fats_g?: number | null
          folate_mcg?: number | null
          id?: string
          iron_mg?: number | null
          magnesium_mg?: number | null
          name?: string
          potassium_mg?: number | null
          promoted_at?: string | null
          protein_g?: number | null
          serving_size?: string | null
          source?: string | null
          vitamin_a_mcg?: number | null
          vitamin_b12_mcg?: number | null
          vitamin_b6_mg?: number | null
          vitamin_c_mg?: number | null
          vitamin_d_mcg?: number | null
          vitamin_e_mg?: number | null
          vitamin_k_mcg?: number | null
          zinc_mg?: number | null
        }
        Relationships: []
      }
      user_behavior_patterns: {
        Row: {
          confidence: number
          first_seen_at: string
          id: string
          last_seen_at: string
          metadata: Json
          occurrences: number
          pattern_key: string
          pattern_type: string
          user_id: string
        }
        Insert: {
          confidence?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          occurrences?: number
          pattern_key: string
          pattern_type: string
          user_id: string
        }
        Update: {
          confidence?: number
          first_seen_at?: string
          id?: string
          last_seen_at?: string
          metadata?: Json
          occurrences?: number
          pattern_key?: string
          pattern_type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_build_access: {
        Row: {
          build_id: string
          build_type: string
          granted_at: string
          id: string
          user_id: string
        }
        Insert: {
          build_id: string
          build_type: string
          granted_at?: string
          id?: string
          user_id: string
        }
        Update: {
          build_id?: string
          build_type?: string
          granted_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_consistency_snapshots: {
        Row: {
          consistency_score: number
          created_at: string
          damping_multiplier: number
          day_type_today: string | null
          discipline_streak: number
          id: string
          identity_tier: string
          injury_hold_days: number
          inputs: Json
          logged_days: number
          missed_days: number
          nn_miss_count_7d: number
          performance_streak: number
          push_days_7d: number
          recovery_mode_today: boolean
          rest_days_30d: number
          rest_days_7d: number
          skip_days_7d: number
          snapshot_date: string
          tier_entered_at: string | null
          user_id: string
        }
        Insert: {
          consistency_score: number
          created_at?: string
          damping_multiplier?: number
          day_type_today?: string | null
          discipline_streak?: number
          id?: string
          identity_tier?: string
          injury_hold_days?: number
          inputs?: Json
          logged_days?: number
          missed_days?: number
          nn_miss_count_7d?: number
          performance_streak?: number
          push_days_7d?: number
          recovery_mode_today?: boolean
          rest_days_30d?: number
          rest_days_7d?: number
          skip_days_7d?: number
          snapshot_date: string
          tier_entered_at?: string | null
          user_id: string
        }
        Update: {
          consistency_score?: number
          created_at?: string
          damping_multiplier?: number
          day_type_today?: string | null
          discipline_streak?: number
          id?: string
          identity_tier?: string
          injury_hold_days?: number
          inputs?: Json
          logged_days?: number
          missed_days?: number
          nn_miss_count_7d?: number
          performance_streak?: number
          push_days_7d?: number
          recovery_mode_today?: boolean
          rest_days_30d?: number
          rest_days_7d?: number
          skip_days_7d?: number
          snapshot_date?: string
          tier_entered_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_day_state_overrides: {
        Row: {
          created_at: string
          date: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_engine_profile: {
        Row: {
          recovery_speed: number
          sample_size: number
          sensitivity_to_load: number
          updated_at: string
          user_id: string
          volatility_index: number
        }
        Insert: {
          recovery_speed?: number
          sample_size?: number
          sensitivity_to_load?: number
          updated_at?: string
          user_id: string
          volatility_index?: number
        }
        Update: {
          recovery_speed?: number
          sample_size?: number
          sensitivity_to_load?: number
          updated_at?: string
          user_id?: string
          volatility_index?: number
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
      user_nn_suggestions: {
        Row: {
          completion_rate: number
          consistency_streak: number
          created_at: string
          id: string
          score: number
          status: string
          template_id: string
          total_completions_14d: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completion_rate: number
          consistency_streak?: number
          created_at?: string
          id?: string
          score: number
          status?: string
          template_id: string
          total_completions_14d?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          completion_rate?: number
          consistency_streak?: number
          created_at?: string
          id?: string
          score?: number
          status?: string
          template_id?: string
          total_completions_14d?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_nn_suggestions_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "custom_activity_templates"
            referencedColumns: ["id"]
          },
        ]
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
      user_rest_day_overrides: {
        Row: {
          created_at: string
          date: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_rest_day_rules: {
        Row: {
          created_at: string
          max_rest_days_per_week: number
          recurring_days: number[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          max_rest_days_per_week?: number
          recurring_days?: number[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          max_rest_days_per_week?: number
          recurring_days?: number[]
          updated_at?: string
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
          schema_version: number
          sleep_consistency_score: number | null
          sleep_quality: number | null
          sleep_time: string | null
          soreness_locations: string[] | null
          soreness_scales: Json | null
          stiffness_locations: string[] | null
          stiffness_scales: Json | null
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
          schema_version?: number
          sleep_consistency_score?: number | null
          sleep_quality?: number | null
          sleep_time?: string | null
          soreness_locations?: string[] | null
          soreness_scales?: Json | null
          stiffness_locations?: string[] | null
          stiffness_scales?: Json | null
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
          schema_version?: number
          sleep_consistency_score?: number | null
          sleep_quality?: number | null
          sleep_time?: string | null
          soreness_locations?: string[] | null
          soreness_scales?: Json | null
          stiffness_locations?: string[] | null
          stiffness_scales?: Json | null
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
          data_confidence: string | null
          data_source: string | null
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
          minutes_since_last_meal: number | null
          protein_g: number | null
          supplements: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
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
          minutes_since_last_meal?: number | null
          protein_g?: number | null
          supplements?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          calories?: number | null
          carbs_g?: number | null
          created_at?: string | null
          data_confidence?: string | null
          data_source?: string | null
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
          minutes_since_last_meal?: number | null
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
          schema_version: number | null
          six_week_goals_text: string | null
          sport: string
          test_date: string
          test_type: string
          tool_grades: Json | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          module: string
          next_entry_date?: string | null
          previous_results?: Json | null
          results?: Json
          schema_version?: number | null
          six_week_goals_text?: string | null
          sport: string
          test_date?: string
          test_type: string
          tool_grades?: Json | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          module?: string
          next_entry_date?: string | null
          previous_results?: Json | null
          results?: Json
          schema_version?: number | null
          six_week_goals_text?: string | null
          sport?: string
          test_date?: string
          test_type?: string
          tool_grades?: Json | null
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
          cycle_week: number | null
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
          cycle_week?: number | null
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
          cycle_week?: number | null
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
          admin_notes: string | null
          admin_verified: boolean | null
          confidence_weight: number | null
          created_at: string
          id: string
          identity_match: boolean | null
          league: string
          profile_type: string | null
          profile_url: string
          rejection_reason: string | null
          removal_requested: boolean
          screenshot_path: string | null
          sport: string
          team_name: string | null
          updated_at: string
          user_id: string
          verified: boolean | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          confidence_weight?: number | null
          created_at?: string
          id?: string
          identity_match?: boolean | null
          league: string
          profile_type?: string | null
          profile_url: string
          rejection_reason?: string | null
          removal_requested?: boolean
          screenshot_path?: string | null
          sport: string
          team_name?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          admin_notes?: string | null
          admin_verified?: boolean | null
          confidence_weight?: number | null
          created_at?: string
          id?: string
          identity_match?: boolean | null
          league?: string
          profile_type?: string | null
          profile_url?: string
          rejection_reason?: string | null
          removal_requested?: boolean
          screenshot_path?: string | null
          sport?: string
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
      video_performance_metrics: {
        Row: {
          last_recomputed_at: string | null
          post_view_improvement_n: number
          post_view_improvement_sum: number
          suggestion_count: number
          total_watch_seconds: number
          video_id: string
          watch_count: number
        }
        Insert: {
          last_recomputed_at?: string | null
          post_view_improvement_n?: number
          post_view_improvement_sum?: number
          suggestion_count?: number
          total_watch_seconds?: number
          video_id: string
          watch_count?: number
        }
        Update: {
          last_recomputed_at?: string | null
          post_view_improvement_n?: number
          post_view_improvement_sum?: number
          suggestion_count?: number
          total_watch_seconds?: number
          video_id?: string
          watch_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_performance_metrics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_performance_metrics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "video_performance_metrics_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: true
            referencedRelation: "public_library_videos"
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
      video_rule_suggestions: {
        Row: {
          avg_improvement: number | null
          confidence: number
          context_key: string | null
          correction_key: string
          created_at: string
          id: string
          movement_key: string
          reasoning: string | null
          result_key: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sample_size: number | null
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          source_video_ids: string[] | null
          status: string
        }
        Insert: {
          avg_improvement?: number | null
          confidence?: number
          context_key?: string | null
          correction_key: string
          created_at?: string
          id?: string
          movement_key: string
          reasoning?: string | null
          result_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_size?: number | null
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          source_video_ids?: string[] | null
          status?: string
        }
        Update: {
          avg_improvement?: number | null
          confidence?: number
          context_key?: string | null
          correction_key?: string
          created_at?: string
          id?: string
          movement_key?: string
          reasoning?: string | null
          result_key?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sample_size?: number | null
          skill_domain?: Database["public"]["Enums"]["skill_domain_enum"]
          source_video_ids?: string[] | null
          status?: string
        }
        Relationships: []
      }
      video_tag_assignments: {
        Row: {
          created_at: string
          tag_id: string
          video_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          tag_id: string
          video_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          tag_id?: string
          video_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "video_tag_assignments_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "video_tag_taxonomy"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "video_tag_assignments_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tag_rules: {
        Row: {
          active: boolean
          context_key: string | null
          correction_key: string
          created_at: string
          created_by: string | null
          id: string
          movement_key: string
          notes: string | null
          result_key: string | null
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          strength: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          context_key?: string | null
          correction_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_key: string
          notes?: string | null
          result_key?: string | null
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          strength?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          context_key?: string | null
          correction_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          movement_key?: string
          notes?: string | null
          result_key?: string | null
          skill_domain?: Database["public"]["Enums"]["skill_domain_enum"]
          strength?: number
          updated_at?: string
        }
        Relationships: []
      }
      video_tag_suggestions: {
        Row: {
          confidence: number
          created_at: string
          id: string
          layer: Database["public"]["Enums"]["video_tag_layer_enum"]
          reasoning: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          source: string
          status: string
          suggested_key: string
          video_id: string
        }
        Insert: {
          confidence?: number
          created_at?: string
          id?: string
          layer: Database["public"]["Enums"]["video_tag_layer_enum"]
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          suggested_key: string
          video_id: string
        }
        Update: {
          confidence?: number
          created_at?: string
          id?: string
          layer?: Database["public"]["Enums"]["video_tag_layer_enum"]
          reasoning?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          source?: string
          status?: string
          suggested_key?: string
          video_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_tag_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_tag_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "video_tag_suggestions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_tag_taxonomy: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          key: string
          label: string
          layer: Database["public"]["Enums"]["video_tag_layer_enum"]
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key: string
          label: string
          layer: Database["public"]["Enums"]["video_tag_layer_enum"]
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"]
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          key?: string
          label?: string
          layer?: Database["public"]["Enums"]["video_tag_layer_enum"]
          skill_domain?: Database["public"]["Enums"]["skill_domain_enum"]
          updated_at?: string
        }
        Relationships: []
      }
      video_user_outcomes: {
        Row: {
          created_at: string
          id: string
          mode: string | null
          post_score_delta: number | null
          skill_domain: Database["public"]["Enums"]["skill_domain_enum"] | null
          suggested_at: string
          suggestion_reason: Json | null
          user_id: string
          video_id: string
          watch_seconds: number | null
          watched_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          mode?: string | null
          post_score_delta?: number | null
          skill_domain?: Database["public"]["Enums"]["skill_domain_enum"] | null
          suggested_at?: string
          suggestion_reason?: Json | null
          user_id: string
          video_id: string
          watch_seconds?: number | null
          watched_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          mode?: string | null
          post_score_delta?: number | null
          skill_domain?: Database["public"]["Enums"]["skill_domain_enum"] | null
          suggested_at?: string
          suggestion_reason?: Json | null
          user_id?: string
          video_id?: string
          watch_seconds?: number | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "video_user_outcomes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_user_outcomes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "video_user_outcomes_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      video_versions: {
        Row: {
          file_size_bytes: number | null
          id: string
          is_active: boolean
          replaced_at: string | null
          uploaded_at: string
          version_number: number
          video_id: string
          video_type: string
          video_url: string
        }
        Insert: {
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          replaced_at?: string | null
          uploaded_at?: string
          version_number?: number
          video_id: string
          video_type?: string
          video_url: string
        }
        Update: {
          file_size_bytes?: number | null
          id?: string
          is_active?: boolean
          replaced_at?: string | null
          uploaded_at?: string
          version_number?: number
          video_id?: string
          video_type?: string
          video_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_versions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "video_versions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "library_videos_readiness"
            referencedColumns: ["video_id"]
          },
          {
            foreignKeyName: "video_versions_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "public_library_videos"
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
          game_id: string | null
          id: string
          library_notes: string | null
          library_title: string | null
          mocap_data: Json | null
          module: Database["public"]["Enums"]["module_type"]
          practice_session_id: string | null
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
          game_id?: string | null
          id?: string
          library_notes?: string | null
          library_title?: string | null
          mocap_data?: Json | null
          module: Database["public"]["Enums"]["module_type"]
          practice_session_id?: string | null
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
          game_id?: string | null
          id?: string
          library_notes?: string | null
          library_title?: string | null
          mocap_data?: Json | null
          module?: Database["public"]["Enums"]["module_type"]
          practice_session_id?: string | null
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
        Relationships: [
          {
            foreignKeyName: "videos_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "videos_practice_session_id_fkey"
            columns: ["practice_session_id"]
            isOneToOne: false
            referencedRelation: "performance_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      weakness_scores: {
        Row: {
          computed_at: string
          id: string
          score: number
          user_id: string
          weakness_metric: string
        }
        Insert: {
          computed_at?: string
          id?: string
          score: number
          user_id: string
          weakness_metric: string
        }
        Update: {
          computed_at?: string
          id?: string
          score?: number
          user_id?: string
          weakness_metric?: string
        }
        Relationships: []
      }
      wearable_metrics: {
        Row: {
          captured_at: string
          hrv_ms: number | null
          id: string
          raw: Json | null
          rhr_bpm: number | null
          schema_version: number
          sleep_min: number | null
          source: string | null
          user_id: string
        }
        Insert: {
          captured_at?: string
          hrv_ms?: number | null
          id?: string
          raw?: Json | null
          rhr_bpm?: number | null
          schema_version?: number
          sleep_min?: number | null
          source?: string | null
          user_id: string
        }
        Update: {
          captured_at?: string
          hrv_ms?: number | null
          id?: string
          raw?: Json | null
          rhr_bpm?: number | null
          schema_version?: number
          sleep_min?: number | null
          source?: string | null
          user_id?: string
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
      checkout_ab_summary: {
        Row: {
          ab_variant: string | null
          completed: number | null
          conversion_pct: number | null
          started: number | null
        }
        Relationships: []
      }
      demo_funnel: {
        Row: {
          clicked: number | null
          completed: number | null
          first_event: string | null
          last_event: string | null
          started: number | null
          user_id: string | null
          viewed: number | null
        }
        Relationships: []
      }
      library_videos_readiness: {
        Row: {
          assignment_count: number | null
          has_description: boolean | null
          has_domain: boolean | null
          has_format: boolean | null
          is_ready: boolean | null
          missing_fields: string[] | null
          owner_id: string | null
          video_id: string | null
        }
        Relationships: []
      }
      pattern_library_ranked: {
        Row: {
          confidence: number | null
          created_at: string | null
          feature_vector: Json | null
          frequency: number | null
          id: string | null
          last_seen_at: string | null
          outcome_state: string | null
          pattern_type: string | null
          performance_outcome_score: number | null
          rank_score: number | null
        }
        Insert: {
          confidence?: number | null
          created_at?: string | null
          feature_vector?: Json | null
          frequency?: number | null
          id?: string | null
          last_seen_at?: string | null
          outcome_state?: string | null
          pattern_type?: string | null
          performance_outcome_score?: number | null
          rank_score?: never
        }
        Update: {
          confidence?: number | null
          created_at?: string | null
          feature_vector?: Json | null
          frequency?: number | null
          id?: string | null
          last_seen_at?: string | null
          outcome_state?: string | null
          pattern_type?: string | null
          performance_outcome_score?: number | null
          rank_score?: never
        }
        Relationships: []
      }
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
      public_library_videos: {
        Row: {
          ai_description: string | null
          category: string | null
          confidence_score: number | null
          created_at: string | null
          description: string | null
          distribution_tier: string | null
          id: string | null
          likes_count: number | null
          notes: string | null
          owner_id: string | null
          skill_domains:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          tier_rank: number | null
          title: string | null
          updated_at: string | null
          video_format: Database["public"]["Enums"]["video_type_enum"] | null
          video_type: string | null
          video_url: string | null
          views_count: number | null
        }
        Insert: {
          ai_description?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          distribution_tier?: string | null
          id?: string | null
          likes_count?: number | null
          notes?: string | null
          owner_id?: string | null
          skill_domains?:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier_rank?: number | null
          title?: string | null
          updated_at?: string | null
          video_format?: Database["public"]["Enums"]["video_type_enum"] | null
          video_type?: string | null
          video_url?: string | null
          views_count?: number | null
        }
        Update: {
          ai_description?: string | null
          category?: string | null
          confidence_score?: number | null
          created_at?: string | null
          description?: string | null
          distribution_tier?: string | null
          id?: string | null
          likes_count?: number | null
          notes?: string | null
          owner_id?: string | null
          skill_domains?:
            | Database["public"]["Enums"]["skill_domain_enum"][]
            | null
          sport?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          tier_rank?: number | null
          title?: string | null
          updated_at?: string | null
          video_format?: Database["public"]["Enums"]["video_type_enum"] | null
          video_type?: string | null
          video_url?: string | null
          views_count?: number | null
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
      all_checked: { Args: { cb: Json }; Returns: boolean }
      archive_old_scout_applications: { Args: never; Returns: undefined }
      attach_session_to_link: {
        Args: { p_link_code: string; p_session_id: string; p_user_id: string }
        Returns: undefined
      }
      batch_decrement_sets: {
        Args: { p_workout_ids: string[] }
        Returns: number
      }
      batch_deload_exercises: {
        Args: { p_workout_ids: string[] }
        Returns: number
      }
      batch_increment_sets: {
        Args: { p_workout_ids: string[] }
        Returns: number
      }
      can_edit_folder_item: {
        Args: { p_folder_item_id: string; p_user_id: string }
        Returns: boolean
      }
      claim_ab_link: {
        Args: { p_code: string; p_user_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string | null
          creator_session_id: string | null
          creator_user_id: string
          expires_at: string | null
          id: string
          joiner_session_id: string | null
          joiner_user_id: string | null
          link_code: string
          linked_at: string | null
          sport: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_ab_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      cleanup_deleted_activity_templates: { Args: never; Returns: undefined }
      cleanup_old_adversarial_logs: { Args: never; Returns: undefined }
      cleanup_old_advisory_logs: { Args: never; Returns: undefined }
      cleanup_old_explanations: { Args: never; Returns: undefined }
      cleanup_old_function_logs: { Args: never; Returns: undefined }
      cleanup_old_heartbeat_logs: { Args: never; Returns: undefined }
      cleanup_old_interventions: { Args: never; Returns: undefined }
      cleanup_old_patterns: { Args: never; Returns: undefined }
      cleanup_old_prediction_outcomes: { Args: never; Returns: undefined }
      cleanup_old_predictions: { Args: never; Returns: undefined }
      cleanup_old_regression_results: { Args: never; Returns: undefined }
      cleanup_old_sentinel_logs: { Args: never; Returns: undefined }
      cleanup_old_snapshot_versions: { Args: never; Returns: undefined }
      cleanup_old_system_health: { Args: never; Returns: undefined }
      cleanup_old_webhook_events: { Args: never; Returns: undefined }
      cleanup_old_weight_adjustments: { Args: never; Returns: undefined }
      cleanup_old_weight_history: { Args: never; Returns: undefined }
      cleanup_synthetic_activity_logs: { Args: never; Returns: undefined }
      create_ab_link: {
        Args: { p_link_code: string; p_sport: string; p_user_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string | null
          creator_session_id: string | null
          creator_user_id: string
          expires_at: string | null
          id: string
          joiner_session_id: string | null
          joiner_user_id: string | null
          link_code: string
          linked_at: string | null
          sport: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_ab_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      expire_ab_link: {
        Args: { p_link_code: string; p_user_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string | null
          creator_session_id: string | null
          creator_user_id: string
          expires_at: string | null
          id: string
          joiner_session_id: string | null
          joiner_user_id: string | null
          link_code: string
          linked_at: string | null
          sport: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_ab_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      expire_stale_links: { Args: never; Returns: undefined }
      extend_ab_link: {
        Args: { p_link_code: string; p_user_id: string }
        Returns: {
          claimed_at: string | null
          created_at: string | null
          creator_session_id: string | null
          creator_user_id: string
          expires_at: string | null
          id: string
          joiner_session_id: string | null
          joiner_user_id: string | null
          link_code: string
          linked_at: string | null
          sport: string
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "live_ab_links"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      folder_allows_coach_edit: {
        Args: { p_coach_id: string; p_folder_id: string }
        Returns: boolean
      }
      has_any_checked: { Args: { cb: Json }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      insert_training_block_atomic:
        | {
            Args: {
              p_end_date: string
              p_generation_metadata: Json
              p_goal: string
              p_pending_goal_block_id?: string
              p_sport: string
              p_start_date: string
              p_user_id: string
              p_workouts: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_end_date: string
              p_generation_metadata: Json
              p_goal: string
              p_idempotency_key?: string
              p_pending_goal_block_id?: string
              p_sport: string
              p_start_date: string
              p_user_id: string
              p_workouts: Json
            }
            Returns: string
          }
        | {
            Args: {
              p_end_date: string
              p_generation_metadata: Json
              p_goal: string
              p_idempotency_key?: string
              p_pending_goal_block_id?: string
              p_replace_existing?: boolean
              p_sport: string
              p_start_date: string
              p_user_id: string
              p_workouts: Json
            }
            Returns: string
          }
      is_linked_coach: {
        Args: { p_coach_id: string; p_player_id: string }
        Returns: boolean
      }
      is_org_coach_or_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_org_owner: {
        Args: { _org_id: string; _user_id: string }
        Returns: boolean
      }
      is_system_user: { Args: { _uid: string }; Returns: boolean }
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
      recompute_library_video_tier: {
        Args: { p_video_id: string }
        Returns: undefined
      }
      replace_video_version: {
        Args: {
          p_file_size?: number
          p_new_url: string
          p_video_id: string
          p_video_type?: string
        }
        Returns: string
      }
      shift_workouts_forward: {
        Args: { p_after_date: string; p_block_id: string; p_days?: number }
        Returns: number
      }
      try_acquire_hie_lock: {
        Args: { p_stale_seconds?: number; p_user_id: string }
        Returns: boolean
      }
      update_block_status: { Args: { p_block_id: string }; Returns: string }
      update_block_status_service: {
        Args: { p_block_id: string }
        Returns: string
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
      drill_tag_category:
        | "skill"
        | "body_part"
        | "equipment"
        | "intensity"
        | "phase"
        | "position"
        | "error_type"
        | "situation"
      mistake_type: "hesitation" | "misread" | "panic" | "over_aggressive"
      module_type: "hitting" | "pitching" | "throwing"
      skill_domain_enum:
        | "hitting"
        | "fielding"
        | "throwing"
        | "base_running"
        | "pitching"
      sport_type: "baseball" | "softball"
      throwing_hand: "R" | "L" | "B"
      training_data_type: "professional_example" | "common_mistake"
      video_status: "uploading" | "processing" | "completed" | "failed"
      video_tag_layer_enum:
        | "movement_pattern"
        | "result"
        | "context"
        | "correction"
      video_type_enum:
        | "drill"
        | "game_at_bat"
        | "practice_rep"
        | "breakdown"
        | "slow_motion"
        | "pov"
        | "comparison"
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
      drill_tag_category: [
        "skill",
        "body_part",
        "equipment",
        "intensity",
        "phase",
        "position",
        "error_type",
        "situation",
      ],
      mistake_type: ["hesitation", "misread", "panic", "over_aggressive"],
      module_type: ["hitting", "pitching", "throwing"],
      skill_domain_enum: [
        "hitting",
        "fielding",
        "throwing",
        "base_running",
        "pitching",
      ],
      sport_type: ["baseball", "softball"],
      throwing_hand: ["R", "L", "B"],
      training_data_type: ["professional_example", "common_mistake"],
      video_status: ["uploading", "processing", "completed", "failed"],
      video_tag_layer_enum: [
        "movement_pattern",
        "result",
        "context",
        "correction",
      ],
      video_type_enum: [
        "drill",
        "game_at_bat",
        "practice_rep",
        "breakdown",
        "slow_motion",
        "pov",
        "comparison",
      ],
    },
  },
} as const
