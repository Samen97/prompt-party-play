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
      // Get the room data
      const { data: roomData } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (!roomData) {
        throw new Error("Room not found");
      }

      // Get unused prompts for this room that haven't been used in a round yet
      const { data: availablePrompts } = await supabase
        .from("game_prompts")
        .select("prompt, image_url")
        .eq("room_id", roomData.id)
        .is("used_in_round", null);

      console.log("[useGameLogic] Available prompts:", availablePrompts?.length);

      if (!availablePrompts?.length) {
        console.error("[useGameLogic] No unused prompts available!");
        toast.error("No more prompts available");
        return "results";
      }

      // Randomly select one unused prompt
      const randomIndex = Math.floor(Math.random() * availablePrompts.length);
      const selectedPrompt = availablePrompts[randomIndex];
      
      console.log("[useGameLogic] Selected prompt for round", round, {
        prompt: selectedPrompt.prompt,
        image: selectedPrompt.image_url
      });

      // Generate false answers
      const { data: response, error: gptError } = await supabase.functions
        .invoke("generate-false-answers", {
          body: { correctPrompt: selectedPrompt.prompt },
        });

      if (gptError || !response?.alternatives) {
        console.error("[useGameLogic] GPT error:", gptError);
        toast.error("Error generating game options");
        return "waiting";
      }

      // Combine & shuffle options
      const options = [selectedPrompt.prompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // Update game room with new round data
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          current_round: round,
          current_image: selectedPrompt.image_url,
          current_options: shuffledOptions,
          correct_prompt: selectedPrompt.prompt,
        })
        .eq("id", roomData.id);

      if (updateError) {
        console.error("[useGameLogic] Room update error:", updateError);
        toast.error("Error starting new round");
        return "waiting";
      }

      // Mark prompt as used in this round
      await supabase
        .from("game_prompts")
        .update({ used_in_round: round })
        .eq("room_id", roomData.id)
        .eq("prompt", selectedPrompt.prompt);

      // Update store
      gameStore.addUsedPrompt(selectedPrompt.prompt);
      gameStore.addUsedImage(selectedPrompt.image_url);
      gameStore.setRoundImage(round, selectedPrompt.image_url);
      gameStore.setCurrentRound(
        round,
        selectedPrompt.image_url,
        shuffledOptions,
        selectedPrompt.prompt
      );

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