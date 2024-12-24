export interface GameRoom {
  id: string;
  code: string;
  host_id: string;
  status: string;
  current_round: number;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  room_id: string;
  username: string;
  score: number;
  created_at: string;
}

export interface GamePrompt {
  id: string;
  room_id: string;
  player_id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

export type GameState = "lobby" | "prompt-submission" | "waiting" | "playing" | "results";