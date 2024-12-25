import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  const startNewRound = useCallback(async () => {
    const round = gameStore.currentRound;
    console.log("[useGameLogic] Starting round #", round);

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

      // Get all prompts that haven't been used in a round yet
      const { data: availablePrompts, error: promptError } = await supabase
        .from("game_prompts")
        .select("id, prompt, image_url")
        .eq("room_id", roomData.id)
        .is("used_in_round", null);

      if (promptError || !availablePrompts || availablePrompts.length === 0) {
        console.error("[useGameLogic] Error fetching available prompts:", promptError);
        toast.error("No more prompts available");
        return "results";
      }

      // Randomly select one of the available prompts
      const randomIndex = Math.floor(Math.random() * availablePrompts.length);
      const selectedPrompt = availablePrompts[randomIndex];

      console.log("[useGameLogic] Selected prompt for round", round, selectedPrompt);

      // Mark this prompt as used in this round
      const { error: updatePromptError } = await supabase
        .from("game_prompts")
        .update({ used_in_round: round })
        .eq("id", selectedPrompt.id);

      if (updatePromptError) {
        console.error("[useGameLogic] Error marking prompt as used:", updatePromptError);
        toast.error("Error updating prompt status");
        return "waiting";
      }

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

      // Update store
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