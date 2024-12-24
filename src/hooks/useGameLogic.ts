import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(() => {
    const round = gameStore.currentRound;
    if (round >= gameStore.totalRounds) {
      return "results";
    }

    const allPrompts = gameStore.players.flatMap((p) => p.prompts);
    const allImages = gameStore.players.flatMap((p) => p.images);
    
    const randomIndex = Math.floor(Math.random() * allImages.length);
    const correctImage = allImages[randomIndex];
    const correctPrompt = allPrompts[randomIndex];

    const options = [correctPrompt];
    while (options.length < 4) {
      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      if (!options.includes(randomPrompt)) {
        options.push(randomPrompt);
      }
    }

    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    gameStore.setCurrentRound(round + 1, correctImage, shuffledOptions, correctPrompt);
    return "playing";
  }, [gameStore]);

  return { startNewRound };
};