// /src/hooks/useGameLogic.ts

import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Start a new round:
 * 1) Build a single array of (prompt, image) pairs from all players
 * 2) Exclude pairs already used
 * 3) Randomly pick one pair -> set it as the new "correct prompt/image"
 * 4) Insert false answers from GPT, shuffle, push to Supabase
 * 5) Mark pair as used, store in local state
 */
export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(async () => {
    const round = gameStore.currentRound;
    console.log("[useGameLogic] Starting new round #", round, {
      totalPlayers: gameStore.players.length,
      totalRounds: gameStore.totalRounds,
      usedPrompts: gameStore.usedPrompts.length,
      usedImages: gameStore.usedImages.length,
    });

    // If we exceeded totalRounds, game ends
    if (round > gameStore.totalRounds && gameStore.totalRounds > 0) {
      console.log("[useGameLogic] All rounds completed -> game over");
      return "results";
    }

    // 1) Build a single array of prompt-image pairs across *all* players
    const allPairs: Array<{ prompt: string; image: string }> = [];
    for (const player of gameStore.players) {
      // Each player has matching indexes for prompts[] & images[]
      player.prompts.forEach((prompt, idx) => {
        allPairs.push({ prompt, image: player.images[idx] });
      });
    }

    // 2) Filter out those pairs we have already used
    const unusedPairs = allPairs.filter(
      (pair) =>
        !gameStore.usedPrompts.includes(pair.prompt) &&
        !gameStore.usedImages.includes(pair.image)
    );

    if (unusedPairs.length === 0) {
      // If none left, reset used arrays so we can re-use them
      console.log("[useGameLogic] No unused pairs left, resetting used arrays...");
      gameStore.resetUsedItems();
      return startNewRound(); // re-call after reset
    }

    try {
      // 3) Randomly pick one unused pair
      const randomIndex = Math.floor(Math.random() * unusedPairs.length);
      const { prompt: correctPrompt, image: correctImage } = unusedPairs[randomIndex];
      console.log("[useGameLogic] Picked pair:", { correctPrompt, correctImage });

      // 4) Generate false answers from GPT
      const { data: response, error: gptError } = await supabase.functions
        .invoke("generate-false-answers", {
          body: { correctPrompt },
        });

      if (gptError || !response?.alternatives) {
        console.error("[useGameLogic] GPT error generating false answers:", gptError);
        toast.error("Error generating game options");
        return "waiting";
      }

      // Combine correct prompt + the 3 false ones, then shuffle
      const options = [correctPrompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // 5) Update "game_rooms" in Supabase with new round data
      const { data: roomData } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("code", gameStore.roomCode)
        .single();

      if (!roomData) {
        console.error("[useGameLogic] Could not find game_room for code:", gameStore.roomCode);
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
        console.error("[useGameLogic] Error updating game_rooms:", updateError);
        toast.error("Error starting new round");
        return "waiting";
      }

      // Mark them as used so we don't pick them again
      gameStore.addUsedPrompt(correctPrompt);
      gameStore.addUsedImage(correctImage);

      // Store the image in our local store for round #N
      gameStore.setRoundImage(round, correctImage);

      // Also set local "current round" data
      gameStore.setCurrentRound(round, correctImage, shuffledOptions, correctPrompt);

      console.log("[useGameLogic] Round setup complete -> playing!");
      return "playing";
    } catch (error) {
      console.error("[useGameLogic] Error in startNewRound:", error);
      toast.error("Error starting new round");
      return "waiting";
    }
  }, [gameStore]);

  return { startNewRound };
};
