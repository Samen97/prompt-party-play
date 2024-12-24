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
    
    console.log('Starting new round with:', {
      round,
      totalPrompts: allPrompts.length,
      totalImages: allImages.length,
      usedPrompts: gameStore.usedPrompts.length,
      usedImages: gameStore.usedImages.length
    });
    
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
      
      console.log('Available items:', {
        unusedPrompts: unusedPrompts.length,
        unusedImages: unusedImages.length
      });
      
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

      console.log('Selected for round:', {
        round,
        prompt: correctPrompt,
        imageUrl: correctImage
      });

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

      // Combine correct answer with AI-generated false answers
      const options = [correctPrompt, ...response.alternatives];
      
      // Shuffle options
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // Update the room with the current image and options
      const { error: updateError } = await supabase
        .from('game_rooms')
        .update({
          current_image: correctImage,
          current_options: shuffledOptions,
          correct_prompt: correctPrompt,
          current_round: round,
          status: 'playing'
        })
        .eq('id', roomData.id);

      if (updateError) {
        console.error('Error updating room:', updateError);
        toast.error('Error starting new round');
        return "waiting";
      }

      console.log('Round setup complete:', {
        round,
        image: correctImage,
        options: shuffledOptions,
        correctPrompt
      });
      
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