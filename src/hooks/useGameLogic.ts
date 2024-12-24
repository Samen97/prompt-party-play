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

    if (round > gameStore.totalRounds && gameStore.totalRounds > 0) {
      console.log("[useGameLogic] All rounds completed -> game over");
      return "results";
    }

    try {
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (roomError || !roomData) {
        console.error("[useGameLogic] Room error:", roomError);
        throw new Error("Room not found");
      }

      // Get prompts specifically assigned to this round number
      const { data: roundPrompt, error: promptError } = await supabase
        .from("game_prompts")
        .select("id, prompt, image_url")
        .eq("room_id", roomData.id)
        .eq("round_number", round)
        .single();

      if (promptError || !roundPrompt) {
        console.error("[useGameLogic] Error fetching round prompt:", promptError);
        toast.error("Failed to fetch prompt for this round");
        return "waiting";
      }

      console.log("[useGameLogic] Selected prompt for round", round, {
        promptId: roundPrompt.id,
        prompt: roundPrompt.prompt,
        image: roundPrompt.image_url
      });

      // Generate false answers
      const { data: response, error: gptError } = await supabase.functions
        .invoke("generate-false-answers", {
          body: { correctPrompt: roundPrompt.prompt },
        });

      if (gptError || !response?.alternatives) {
        console.error("[useGameLogic] GPT error:", gptError);
        toast.error("Error generating game options");
        return "waiting";
      }

      // Combine & shuffle options
      const options = [roundPrompt.prompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // Mark this prompt as used in this round
      const { error: updatePromptError } = await supabase
        .from("game_prompts")
        .update({ used_in_round: round })
        .eq("id", roundPrompt.id);

      if (updatePromptError) {
        console.error("[useGameLogic] Error marking prompt as used:", updatePromptError);
        toast.error("Error updating prompt status");
        return "waiting";
      }

      // Verify the update was successful
      const { data: verifyPrompt } = await supabase
        .from("game_prompts")
        .select("id, prompt, used_in_round")
        .eq("id", roundPrompt.id)
        .single();

      console.log("[useGameLogic] Verification of prompt update:", verifyPrompt);

      // Update game room with new round data
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          status: "playing",
          current_round: round,
          current_image: roundPrompt.image_url,
          current_options: shuffledOptions,
          correct_prompt: roundPrompt.prompt,
        })
        .eq("id", roomData.id);

      if (updateError) {
        console.error("[useGameLogic] Room update error:", updateError);
        toast.error("Error starting new round");
        return "waiting";
      }

      console.log("[useGameLogic] Updated game room for round", round, {
        image: roundPrompt.image_url,
        options: shuffledOptions,
        correctPrompt: roundPrompt.prompt
      });

      // Update store
      gameStore.addUsedPrompt(roundPrompt.prompt);
      gameStore.addUsedImage(roundPrompt.image_url);
      gameStore.setRoundImage(round, roundPrompt.image_url);
      gameStore.setCurrentRound(
        round,
        roundPrompt.image_url,
        shuffledOptions,
        roundPrompt.prompt
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