import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(async () => {
    const round = gameStore.currentRound;
    
    console.log('Starting new round with:', {
      round,
      totalPrompts: gameStore.players.flatMap((p) => p.prompts).length,
      totalImages: gameStore.players.flatMap((p) => p.images).length,
      usedPrompts: gameStore.usedPrompts.length,
      usedImages: gameStore.usedImages.length
    });
    
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
      // Get the room data
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) {
        console.error("Room not found");
        return "waiting";
      }

      // Get unused prompts and images
      const unusedPrompts = allPrompts.filter(prompt => !gameStore.usedPrompts.includes(prompt));
      const unusedImages = allImages.filter(image => !gameStore.usedImages.includes(image));
      
      console.log('Available items for round:', {
        round,
        unusedPrompts: unusedPrompts.length,
        unusedImages: unusedImages.length
      });
      
      // If we've used all prompts/images, reset the arrays
      if (unusedPrompts.length === 0 || unusedImages.length === 0) {
        console.log("Resetting used prompts and images");
        gameStore.resetUsedItems();
        return startNewRound();
      }

      // Select random prompt and image
      const randomIndex = Math.floor(Math.random() * unusedPrompts.length);
      const correctPrompt = unusedPrompts[randomIndex];
      const correctImage = unusedImages[randomIndex];

      console.log('Selected for round:', {
        round,
        prompt: correctPrompt,
        imageUrl: correctImage
      });

      // Generate false answers
      const { data: response, error: gptError } = await supabase.functions
        .invoke('generate-false-answers', {
          body: { correctPrompt }
        });

      if (gptError || !response?.alternatives) {
        console.error('Error generating false answers:', gptError);
        toast.error('Error generating game options');
        return "waiting";
      }

      // Combine and shuffle options
      const options = [correctPrompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // Update the room with current round data
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

      // Update game store state
      gameStore.addUsedPrompt(correctPrompt);
      gameStore.addUsedImage(correctImage);
      gameStore.setRoundImage(round, correctImage);
      gameStore.setCurrentRound(round, correctImage, shuffledOptions, correctPrompt);
      
      console.log('Round setup complete:', {
        round,
        image: correctImage,
        options: shuffledOptions
      });

      return "playing";
    } catch (error) {
      console.error('Error in startNewRound:', error);
      toast.error('Error starting new round');
      return "waiting";
    }
  }, [gameStore]);

  return { startNewRound };
};