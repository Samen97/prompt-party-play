export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

// Split into smaller interfaces for better organization
export interface GamePlayer {
  id: string;
  room_id: string | null;
  username: string;
  score: number | null;
  created_at: string | null;
  has_answered: boolean | null;
}

export interface GamePrompt {
  id: string;
  room_id: string | null;
  player_id: string | null;
  prompt: string;
  image_url: string | null;
  created_at: string | null;
}

export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: string;
  current_round: number | null;
  created_at: string | null;
}

// Main Database type
export type Database = {
  public: {
    Tables: {
      game_players: {
        Row: GamePlayer;
        Insert: Partial<GamePlayer> & { username: string };
        Update: Partial<GamePlayer>;
        Relationships: [
          {
            foreignKeyName: "game_players_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      game_prompts: {
        Row: GamePrompt;
        Insert: Partial<GamePrompt> & { prompt: string };
        Update: Partial<GamePrompt>;
        Relationships: [
          {
            foreignKeyName: "game_prompts_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "game_players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_prompts_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "game_rooms"
            referencedColumns: ["id"]
          }
        ]
      }
      game_rooms: {
        Row: GameRoom;
        Insert: Partial<GameRoom> & { code: string; host_id: string };
        Update: Partial<GameRoom>;
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Utility types for better type inference
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row'];
export type Insertable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];
export type Updatable<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update'];