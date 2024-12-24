export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: string;
  current_round: number;
  created_at: string;
  current_image: string | null;
  current_options: string[] | null;
  correct_prompt: string | null;
}

export interface GamePlayer {
  id: string;
  username: string;
}

export type GameState = "lobby" | "prompt-submission" | "waiting" | "playing" | "results";