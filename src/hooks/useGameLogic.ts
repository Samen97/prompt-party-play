import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(() => {
    // Get current round from store
    const round = gameStore.currentRound;
    
    // Check if we have any prompts and images before proceeding
    const allPrompts = gameStore.players.flatMap((p) => p.prompts);
    const allImages = gameStore.players.flatMap((p) => p.images);
    
    if (allPrompts.length === 0 || allImages.length === 0) {
      console.error("No prompts or images available");
      return "waiting";
    }

    // Only end game if we've completed all rounds
    if (round >= gameStore.totalRounds) {
      console.log("Game over - all rounds completed");
      return "results";
    }

    // Select random image and prompt for this round
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

    // Shuffle options and update game state
    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    console.log(`Starting round ${round + 1} of ${gameStore.totalRounds}`);
    gameStore.setCurrentRound(round + 1, correctImage, shuffledOptions, correctPrompt);
    
    return "playing";
  }, [gameStore]);

  return { startNewRound };
};