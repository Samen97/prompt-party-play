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
  usedPrompts: string[];
  usedImages: string[];
  roundImages: Record<number, string>;
  addPlayer: (username: string) => void;
  setRoomCode: (code: string) => void;
  setHost: (username: string) => void;
  updatePlayerPrompts: (playerId: string, prompts: string[], images: string[]) => void;
  updateScore: (playerId: string, points: number) => void;
  setCurrentRound: (round: number, image: string, options: string[], correctPrompt: string) => void;
  setTotalRounds: (rounds: number) => void;
  addPrompt: (prompt: string, imageUrl: string) => void;
  addUsedPrompt: (prompt: string) => void;
  addUsedImage: (image: string) => void;
  setRoundImage: (round: number, imageUrl: string) => void;
  getRoundImage: (round: number) => string | undefined;
  resetUsedItems: () => void;
  reset: () => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  players: [],
  currentRound: 1,
  totalRounds: 0,
  currentImage: '',
  options: [],
  correctPrompt: '',
  roomCode: '',
  hostUsername: null,
  isHost: false,
  usedPrompts: [],
  usedImages: [],
  roundImages: {},

  addPlayer: (username) =>
    set((state) => {
      const newPlayers = [
        ...state.players,
        {
          id: Math.random().toString(36).substr(2, 9),
          username,
          score: 0,
          prompts: [],
          images: [],
        },
      ];
      const totalRounds = newPlayers.length * 2;
      return {
        players: newPlayers,
        totalRounds
      };
    }),

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
    set((state) => ({
      currentRound: round,
      currentImage: image,
      options,
      correctPrompt,
      roundImages: {
        ...state.roundImages,
        [round]: image
      }
    })),

  setTotalRounds: (rounds) => set({ totalRounds: rounds }),

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

  addUsedPrompt: (prompt) =>
    set((state) => ({
      usedPrompts: [...state.usedPrompts, prompt],
    })),

  addUsedImage: (image) =>
    set((state) => ({
      usedImages: [...state.usedImages, image],
    })),

  setRoundImage: (round, imageUrl) =>
    set((state) => ({
      roundImages: {
        ...state.roundImages,
        [round]: imageUrl
      }
    })),

  getRoundImage: (round) => get().roundImages[round],

  resetUsedItems: () =>
    set({
      usedPrompts: [],
      usedImages: [],
    }),

  reset: () =>
    set({
      players: [],
      currentRound: 1,
      totalRounds: 0,
      currentImage: '',
      options: [],
      correctPrompt: '',
      roomCode: '',
      hostUsername: null,
      isHost: false,
      usedPrompts: [],
      usedImages: [],
      roundImages: {},
    }),
}));