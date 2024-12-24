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

export interface PlayerSubmission {
  username: string;
  hasSubmitted: boolean;
}

export interface GamePrompt {
  id: string;
  prompt: string;
  image_url: string;
  player_username: string;
}

export interface Player {
  id: string;
  username: string;
  score: number;
  prompts: string[];
  images: string[];
}

export interface GameStoreState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  currentImage: string;
  options: string[];
  correctPrompt: string;
  roomCode: string;
  hostUsername: string | null;
  isHost: boolean;
  usedPrompts: string[];
  usedImages: string[];
  roundImages: Record<number, string>;
  prompts: GamePrompt[];
  setPrompts: (prompts: GamePrompt[]) => void;
}