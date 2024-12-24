import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(async () => {
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
    if (round > gameStore.totalRounds && gameStore.totalRounds > 0) {
      console.log("Game over - all rounds completed");
      return "results";
    }

    try {
      // Get the room data to store the current image and prompt
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) {
        console.error("Room not found");
        return "waiting";
      }

      // Get unused prompts and images (not used in previous rounds)
      const unusedPrompts = allPrompts.filter(prompt => !gameStore.usedPrompts.includes(prompt));
      const unusedImages = allImages.filter(image => !gameStore.usedImages.includes(image));
      
      // If we've used all prompts/images, reset the arrays
      if (unusedPrompts.length === 0 || unusedImages.length === 0) {
        console.log("Resetting used prompts and images");
        gameStore.resetUsedItems();
        return startNewRound();
      }

      // Select random prompt and corresponding image
      const randomIndex = Math.floor(Math.random() * unusedPrompts.length);
      const correctPrompt = unusedPrompts[randomIndex];
      const correctImage = unusedImages[randomIndex];

      console.log('Generating false answers for prompt:', correctPrompt);

      // Generate false answers using GPT-4
      const { data: response, error: gptError } = await supabase.functions
        .invoke('generate-false-answers', {
          body: { correctPrompt }
        });

      if (gptError || !response?.alternatives || !Array.isArray(response.alternatives)) {
        console.error('Error generating false answers:', gptError || 'Invalid response format');
        console.log('Response received:', response);
        toast.error('Error generating game options');
        return "waiting";
      }

      console.log('Received alternatives:', response.alternatives);

      // Combine correct answer with AI-generated false answers
      const options = [correctPrompt, ...response.alternatives];
      
      // Shuffle options
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      console.log('Final shuffled options:', shuffledOptions);

      // Update the room with the current image and options
      await supabase
        .from('game_rooms')
        .update({
          current_image: correctImage,
          current_options: shuffledOptions,
          correct_prompt: correctPrompt,
          current_round: round
        })
        .eq('id', roomData.id);

      console.log(`Starting round ${round} of ${gameStore.totalRounds}`);
      
      // Mark prompt and image as used
      gameStore.addUsedPrompt(correctPrompt);
      gameStore.addUsedImage(correctImage);
      gameStore.setCurrentRound(round, correctImage, shuffledOptions, correctPrompt);
      
      return "playing";
    } catch (error) {
      console.error('Error starting new round:', error);
      toast.error('Error starting new round');
      return "waiting";
    }
  }, [gameStore]);

  return { startNewRound };
};