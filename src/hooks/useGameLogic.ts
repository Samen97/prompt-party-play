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

      // Select random image and prompt for this round
      const unusedPrompts = allPrompts.filter(prompt => prompt !== gameStore.correctPrompt);
      const unusedImages = allImages.filter(image => image !== gameStore.currentImage);
      
      const randomIndex = Math.floor(Math.random() * unusedPrompts.length);
      const correctImage = unusedImages[randomIndex];
      const correctPrompt = unusedPrompts[randomIndex];

      // Generate false answers using GPT-4
      const { data: falseAnswers, error: gptError } = await supabase.functions
        .invoke('generate-false-answers', {
          body: { correctPrompt }
        });

      if (gptError) {
        console.error('Error generating false answers:', gptError);
        toast.error('Error generating game options');
        return "waiting";
      }

      // Combine correct answer with AI-generated false answers
      const options = [correctPrompt, ...falseAnswers.alternatives];
      
      // Shuffle options
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

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