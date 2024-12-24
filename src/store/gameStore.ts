import { create } from 'zustand';

interface Player {
  id: string;
  username: string;
  score: number;
  prompts: string[];
  images: string[];
}

interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  currentImage: string;
  options: string[];
  correctPrompt: string;
  roomCode: string;
  hostUsername: string | null;
  isHost: boolean;
  addPlayer: (username: string) => void;
  setRoomCode: (code: string) => void;
  setHost: (username: string) => void;
  updatePlayerPrompts: (playerId: string, prompts: string[], images: string[]) => void;
  updateScore: (playerId: string, points: number) => void;
  setCurrentRound: (round: number, image: string, options: string[], correctPrompt: string) => void;
  addPrompt: (prompt: string, imageUrl: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  players: [],
  currentRound: 0,
  totalRounds: 3, // Reduced number of rounds for testing
  currentImage: '',
  options: [],
  correctPrompt: '',
  roomCode: '',
  hostUsername: null,
  isHost: false,

  addPlayer: (username) =>
    set((state) => ({
      players: [
        ...state.players,
        {
          id: Math.random().toString(36).substr(2, 9),
          username,
          score: 0,
          prompts: [],
          images: [],
        },
      ],
    })),

  setRoomCode: (code) => set({ roomCode: code }),

  setHost: (username) => set({ hostUsername: username, isHost: true }),

  updatePlayerPrompts: (playerId, prompts, images) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, prompts, images } : player
      ),
    })),

  updateScore: (playerId, points) =>
    set((state) => ({
      players: state.players.map((player) =>
        player.id === playerId ? { ...player, score: player.score + points } : player
      ),
    })),

  setCurrentRound: (round, image, options, correctPrompt) =>
    set({
      currentRound: round,
      currentImage: image,
      options,
      correctPrompt,
    }),

  addPrompt: (prompt, imageUrl) =>
    set((state) => {
      const lastPlayer = state.players[state.players.length - 1];
      if (!lastPlayer) return state;

      return {
        players: state.players.map((player) =>
          player.id === lastPlayer.id
            ? {
                ...player,
                prompts: [...player.prompts, prompt],
                images: [...player.images, imageUrl],
              }
            : player
        ),
      };
    }),

  reset: () =>
    set({
      players: [],
      currentRound: 0,
      currentImage: '',
      options: [],
      correctPrompt: '',
      roomCode: '',
      hostUsername: null,
      isHost: false,
    }),
}));