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
    
    // Make sure we have prompts and images
    if (allPrompts.length === 0 || allImages.length === 0) {
      console.error("No prompts or images available");
      return "results";
    }

    const randomIndex = Math.floor(Math.random() * allImages.length);
    const correctImage = allImages[randomIndex];
    const correctPrompt = allPrompts[randomIndex];

    // Get 3 random different prompts for options
    const options = [correctPrompt];
    const availablePrompts = allPrompts.filter(p => p !== correctPrompt);
    
    while (options.length < 4 && availablePrompts.length > 0) {
      const randomPrompt = availablePrompts[Math.floor(Math.random() * availablePrompts.length)];
      if (!options.includes(randomPrompt)) {
        options.push(randomPrompt);
        availablePrompts.splice(availablePrompts.indexOf(randomPrompt), 1);
      }
    }

    // If we don't have enough unique prompts, duplicate some
    while (options.length < 4) {
      options.push(correctPrompt);
    }

    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    gameStore.setCurrentRound(round + 1, correctImage, shuffledOptions, correctPrompt);
    return "playing";
  }, [gameStore]);

  return { startNewRound };
};