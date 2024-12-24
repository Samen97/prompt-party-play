// /src/hooks/useGameLogic.ts

import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(async () => {
    const round = gameStore.currentRound;
    console.log("[useGameLogic] Starting round #", round, {
      totalPlayers: gameStore.players.length,
      totalRounds: gameStore.totalRounds,
      usedPrompts: gameStore.usedPrompts,
      usedImages: gameStore.usedImages,
    });

    // Check if we've completed all rounds
    if (round > gameStore.totalRounds && gameStore.totalRounds > 0) {
      console.log("[useGameLogic] All rounds completed -> game over");
      return "results";
    }

    try {
      // 1) Build array of ALL available prompt-image pairs
      const allPairs: Array<{ prompt: string; image: string }> = [];
      for (const player of gameStore.players) {
        player.prompts.forEach((prompt, idx) => {
          // Only add if not already used
          if (!gameStore.usedPrompts.includes(prompt) && 
              !gameStore.usedImages.includes(player.images[idx])) {
            allPairs.push({ 
              prompt, 
              image: player.images[idx] 
            });
          }
        });
      }

      console.log("[useGameLogic] Available pairs:", allPairs.length);

      if (allPairs.length === 0) {
        console.error("[useGameLogic] No unused pairs available!");
        toast.error("No more prompts available");
        return "results";
      }

      // 2) Randomly select one unused pair
      const randomIndex = Math.floor(Math.random() * allPairs.length);
      const { prompt: correctPrompt, image: correctImage } = allPairs[randomIndex];
      
      console.log("[useGameLogic] Selected pair for round", round, {
        prompt: correctPrompt,
        image: correctImage
      });

      // 3) Generate false answers
      const { data: response, error: gptError } = await supabase.functions
        .invoke("generate-false-answers", {
          body: { correctPrompt },
        });

      if (gptError || !response?.alternatives) {
        console.error("[useGameLogic] GPT error:", gptError);
        toast.error("Error generating game options");
        return "waiting";
      }

      // 4) Combine & shuffle options
      const options = [correctPrompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // 5) Update game room with new round data
      const { data: roomData } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (!roomData) {
        console.error("[useGameLogic] Room not found:", gameStore.roomCode);
        return "waiting";
      }

      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          current_round: round,
          current_image: correctImage,
          current_options: shuffledOptions,
          correct_prompt: correctPrompt,
        })
        .eq("id", roomData.id);

      if (updateError) {
        console.error("[useGameLogic] Room update error:", updateError);
        toast.error("Error starting new round");
        return "waiting";
      }

      // 6) Mark items as used & update store
      gameStore.addUsedPrompt(correctPrompt);
      gameStore.addUsedImage(correctImage);
      gameStore.setRoundImage(round, correctImage);
      gameStore.setCurrentRound(round, correctImage, shuffledOptions, correctPrompt);

      console.log("[useGameLogic] Round", round, "setup complete!");
      return "playing";

    } catch (error) {
      console.error("[useGameLogic] Error in startNewRound:", error);
      toast.error("Error starting new round");
      return "waiting";
    }
  }, [gameStore]);

  return { startNewRound };
};