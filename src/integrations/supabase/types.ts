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
      achievements: {
        Row: {
          categoria: string
          condicion_tipo: string
          condicion_valor: number
          created_at: string
          descripcion: string
          icono: string
          id: string
          nombre: string
          xp_reward: number
        }
        Insert: {
          categoria: string
          condicion_tipo: string
          condicion_valor: number
          created_at?: string
          descripcion: string
          icono: string
          id?: string
          nombre: string
          xp_reward?: number
        }
        Update: {
          categoria?: string
          condicion_tipo?: string
          condicion_valor?: number
          created_at?: string
          descripcion?: string
          icono?: string
          id?: string
          nombre?: string
          xp_reward?: number
        }
        Relationships: []
      }
      calendar_events: {
        Row: {
          color: string | null
          created_at: string
          fecha: string
          hora: string | null
          id: string
          notas: string | null
          subject_id: string | null
          tipo_examen: string
          titulo: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          fecha: string
          hora?: string | null
          id?: string
          notas?: string | null
          subject_id?: string | null
          tipo_examen: string
          titulo: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          fecha?: string
          hora?: string | null
          id?: string
          notas?: string | null
          subject_id?: string | null
          tipo_examen?: string
          titulo?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_ratings: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_ratings_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_channels: {
        Row: {
          created_at: string
          id: string
          name: string
          position: number
          server_id: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          position?: number
          server_id: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          position?: number
          server_id?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_channels_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discord_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_server_members: {
        Row: {
          id: string
          joined_at: string
          role: string
          server_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          role?: string
          server_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          role?: string
          server_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_server_members_server_id_fkey"
            columns: ["server_id"]
            isOneToOne: false
            referencedRelation: "discord_servers"
            referencedColumns: ["id"]
          },
        ]
      }
      discord_servers: {
        Row: {
          created_at: string
          icon_url: string | null
          id: string
          name: string
          owner_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name: string
          owner_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          icon_url?: string | null
          id?: string
          name?: string
          owner_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      discord_voice_participants: {
        Row: {
          channel_id: string
          id: string
          is_camera_on: boolean
          is_deafened: boolean
          is_muted: boolean
          is_screen_sharing: boolean
          is_speaking: boolean
          joined_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          is_camera_on?: boolean
          is_deafened?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_speaking?: boolean
          joined_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          is_camera_on?: boolean
          is_deafened?: boolean
          is_muted?: boolean
          is_screen_sharing?: boolean
          is_speaking?: boolean
          joined_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discord_voice_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "discord_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcard_decks: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          download_count: number
          id: string
          is_public: boolean
          nombre: string
          rating_count: number
          rating_sum: number
          subject_id: string
          total_cards: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_public?: boolean
          nombre: string
          rating_count?: number
          rating_sum?: number
          subject_id: string
          total_cards?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          download_count?: number
          id?: string
          is_public?: boolean
          nombre?: string
          rating_count?: number
          rating_sum?: number
          subject_id?: string
          total_cards?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      flashcards: {
        Row: {
          created_at: string
          deck_id: string
          id: string
          pregunta: string
          respuesta: string
          updated_at: string
          user_id: string
          veces_correcta: number
          veces_incorrecta: number
        }
        Insert: {
          created_at?: string
          deck_id: string
          id?: string
          pregunta: string
          respuesta: string
          updated_at?: string
          user_id: string
          veces_correcta?: number
          veces_incorrecta?: number
        }
        Update: {
          created_at?: string
          deck_id?: string
          id?: string
          pregunta?: string
          respuesta?: string
          updated_at?: string
          user_id?: string
          veces_correcta?: number
          veces_incorrecta?: number
        }
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey"
            columns: ["deck_id"]
            isOneToOne: false
            referencedRelation: "flashcard_decks"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee_id: string
          created_at: string
          id: string
          requester_id: string
          status: string
          updated_at: string
        }
        Insert: {
          addressee_id: string
          created_at?: string
          id?: string
          requester_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          addressee_id?: string
          created_at?: string
          id?: string
          requester_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      invited_users: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
        }
        Relationships: []
      }
      library_files: {
        Row: {
          created_at: string
          folder_id: string | null
          id: string
          nombre: string
          storage_path: string | null
          subject_id: string | null
          tamaño_bytes: number | null
          tipo: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          id?: string
          nombre: string
          storage_path?: string | null
          subject_id?: string | null
          tamaño_bytes?: number | null
          tipo: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          id?: string
          nombre?: string
          storage_path?: string | null
          subject_id?: string | null
          tamaño_bytes?: number | null
          tipo?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_files_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_files_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      library_folders: {
        Row: {
          color: string | null
          created_at: string
          id: string
          nombre: string
          parent_folder_id: string | null
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          id?: string
          nombre: string
          parent_folder_id?: string | null
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string
          id?: string
          nombre?: string
          parent_folder_id?: string | null
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "library_folders_parent_folder_id_fkey"
            columns: ["parent_folder_id"]
            isOneToOne: false
            referencedRelation: "library_folders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_folders_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      notion_documents: {
        Row: {
          contenido: Json | null
          cover_url: string | null
          created_at: string
          emoji: string | null
          id: string
          is_favorite: boolean | null
          subject_id: string | null
          titulo: string
          total_time_seconds: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          contenido?: Json | null
          cover_url?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_favorite?: boolean | null
          subject_id?: string | null
          titulo?: string
          total_time_seconds?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          contenido?: Json | null
          cover_url?: string | null
          created_at?: string
          emoji?: string | null
          id?: string
          is_favorite?: boolean | null
          subject_id?: string | null
          titulo?: string
          total_time_seconds?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notion_documents_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_id: number
          email: string | null
          id: string
          nombre: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_id?: number
          email?: string | null
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_id?: number
          email?: string | null
          id?: string
          nombre?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      room_participants: {
        Row: {
          created_at: string
          id: string
          is_camera_off: boolean
          is_muted: boolean
          is_sharing_screen: boolean
          joined_at: string
          left_at: string | null
          room_id: string
          study_duration_seconds: number
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_camera_off?: boolean
          is_muted?: boolean
          is_sharing_screen?: boolean
          joined_at?: string
          left_at?: string | null
          room_id: string
          study_duration_seconds?: number
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_camera_off?: boolean
          is_muted?: boolean
          is_sharing_screen?: boolean
          joined_at?: string
          left_at?: string | null
          room_id?: string
          study_duration_seconds?: number
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "room_participants_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "room_participants_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_rooms: {
        Row: {
          created_at: string
          host_id: string
          id: string
          is_active: boolean
          max_participants: number
          name: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          host_id: string
          id?: string
          is_active?: boolean
          max_participants?: number
          name: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          host_id?: string
          id?: string
          is_active?: boolean
          max_participants?: number
          name?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_rooms_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      study_sessions: {
        Row: {
          completada: boolean | null
          created_at: string
          duracion_segundos: number
          fecha: string
          id: string
          subject_id: string | null
          tipo: string
          user_id: string
        }
        Insert: {
          completada?: boolean | null
          created_at?: string
          duracion_segundos?: number
          fecha?: string
          id?: string
          subject_id?: string | null
          tipo?: string
          user_id: string
        }
        Update: {
          completada?: boolean | null
          created_at?: string
          duracion_segundos?: number
          fecha?: string
          id?: string
          subject_id?: string | null
          tipo?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_dependencies: {
        Row: {
          created_at: string
          id: string
          requiere_aprobada: string | null
          requiere_regular: string | null
          subject_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requiere_aprobada?: string | null
          requiere_regular?: string | null
          subject_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requiere_aprobada?: string | null
          requiere_regular?: string | null
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_dependencies_requiere_aprobada_fkey"
            columns: ["requiere_aprobada"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_dependencies_requiere_regular_fkey"
            columns: ["requiere_regular"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subject_dependencies_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          año: number
          codigo: string
          created_at: string
          id: string
          nombre: string
          numero_materia: number
        }
        Insert: {
          año: number
          codigo: string
          created_at?: string
          id?: string
          nombre: string
          numero_materia: number
        }
        Update: {
          año?: number
          codigo?: string
          created_at?: string
          id?: string
          nombre?: string
          numero_materia?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_plants: {
        Row: {
          completed_at: string | null
          created_at: string
          died_at: string | null
          growth_percentage: number
          id: string
          is_alive: boolean
          is_completed: boolean
          last_watered_at: string
          plant_type: string
          planted_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          died_at?: string | null
          growth_percentage?: number
          id?: string
          is_alive?: boolean
          is_completed?: boolean
          last_watered_at?: string
          plant_type?: string
          planted_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          died_at?: string | null
          growth_percentage?: number
          id?: string
          is_alive?: boolean
          is_completed?: boolean
          last_watered_at?: string
          plant_type?: string
          planted_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stats: {
        Row: {
          horas_estudio_total: number
          id: string
          mejor_racha: number
          nivel: number
          racha_actual: number
          updated_at: string
          user_id: string
          xp_total: number
        }
        Insert: {
          horas_estudio_total?: number
          id?: string
          mejor_racha?: number
          nivel?: number
          racha_actual?: number
          updated_at?: string
          user_id: string
          xp_total?: number
        }
        Update: {
          horas_estudio_total?: number
          id?: string
          mejor_racha?: number
          nivel?: number
          racha_actual?: number
          updated_at?: string
          user_id?: string
          xp_total?: number
        }
        Relationships: []
      }
      user_subject_status: {
        Row: {
          created_at: string
          estado: string
          fecha_aprobacion: string | null
          id: string
          nota: number | null
          nota_final_examen: number | null
          nota_global: number | null
          nota_parcial_1: number | null
          nota_parcial_2: number | null
          nota_rec_global: number | null
          nota_rec_parcial_1: number | null
          nota_rec_parcial_2: number | null
          subject_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          nota?: number | null
          nota_final_examen?: number | null
          nota_global?: number | null
          nota_parcial_1?: number | null
          nota_parcial_2?: number | null
          nota_rec_global?: number | null
          nota_rec_parcial_1?: number | null
          nota_rec_parcial_2?: number | null
          subject_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          estado?: string
          fecha_aprobacion?: string | null
          id?: string
          nota?: number | null
          nota_final_examen?: number | null
          nota_global?: number | null
          nota_parcial_1?: number | null
          nota_parcial_2?: number | null
          nota_rec_global?: number | null
          nota_rec_parcial_1?: number | null
          nota_rec_parcial_2?: number | null
          subject_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subject_status_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_access_study_room: {
        Args: { room_id: string; user_id: string }
        Returns: boolean
      }
      check_and_unlock_achievements: {
        Args: { p_user_id: string }
        Returns: {
          achievement_id: string
          achievement_name: string
          xp_reward: number
        }[]
      }
      check_invitation_status: {
        Args: { check_email: string }
        Returns: {
          accepted_at: string
          id: string
        }[]
      }
      find_user_for_friend_request: {
        Args: { identifier: string }
        Returns: {
          display_id: number
          user_id: string
          username: string
        }[]
      }
      get_friend_profiles: {
        Args: { friend_user_ids: string[] }
        Returns: {
          avatar_url: string
          display_id: number
          nombre: string
          user_id: string
          username: string
        }[]
      }
      get_server_member_profiles: {
        Args: { member_user_ids: string[] }
        Returns: {
          avatar_url: string
          display_id: number
          nombre: string
          user_id: string
          username: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_server_member: {
        Args: { server_id: string; user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
