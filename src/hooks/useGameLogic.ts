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
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (roomError || !roomData) {
        console.error("[useGameLogic] Room error:", roomError);
        throw new Error("Room not found");
      }

      // Debug: Log all prompts for this room to see what's used/unused
      const { data: allPrompts } = await supabase
        .from("game_prompts")
        .select("id, prompt, image_url, used_in_round")
        .eq("room_id", roomData.id);

      console.log("[useGameLogic] ALL prompts in room:", {
        roomId: roomData.id,
        prompts: allPrompts?.map(p => ({
          id: p.id,
          prompt: p.prompt,
          used_in_round: p.used_in_round
        }))
      });

      // Get prompts that haven't been used in any round yet
      const { data: availablePrompts, error: promptError } = await supabase
        .from("game_prompts")
        .select("id, prompt, image_url")
        .eq("room_id", roomData.id)
        .is("used_in_round", null);

      console.log("[useGameLogic] Available UNUSED prompts:", {
        count: availablePrompts?.length,
        prompts: availablePrompts?.map(p => ({
          id: p.id,
          prompt: p.prompt
        })),
        currentRound: round
      });

      if (promptError) {
        console.error("[useGameLogic] Error fetching prompts:", promptError);
        toast.error("Failed to fetch prompts");
        return "waiting";
      }

      if (!availablePrompts?.length) {
        console.error("[useGameLogic] No unused prompts available!");
        toast.error("No more prompts available");
        return "results";
      }

      // Randomly select one unused prompt
      const randomIndex = Math.floor(Math.random() * availablePrompts.length);
      const selectedPrompt = availablePrompts[randomIndex];
      
      console.log("[useGameLogic] Selected prompt for round", round, {
        promptId: selectedPrompt.id,
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

      console.log("[useGameLogic] Marked prompt as used:", {
        promptId: selectedPrompt.id,
        round: round
      });

      // Verify the update was successful
      const { data: verifyPrompt } = await supabase
        .from("game_prompts")
        .select("id, prompt, used_in_round")
        .eq("id", selectedPrompt.id)
        .single();

      console.log("[useGameLogic] Verification of prompt update:", verifyPrompt);

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

      console.log("[useGameLogic] Updated game room for round", round, {
        image: selectedPrompt.image_url,
        options: shuffledOptions,
        correctPrompt: selectedPrompt.prompt
      });

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