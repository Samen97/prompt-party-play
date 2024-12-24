import { useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useGameLogic = () => {
  const gameStore = useGameStore();

  /**
   * Start a new round:
   * 1. Check if we've used all rounds -> game ends.
   * 2. Select a random prompt/image from the unused set.
   * 3. Generate false answers from GPT.
   * 4. Shuffle everything, store in Supabase, and update local game store.
   */
  const startNewRound = useCallback(async () => {
    const round = gameStore.currentRound;
    console.log("Starting new round with:", {
      round,
      totalPrompts: gameStore.players.flatMap((p) => p.prompts).length,
      totalImages: gameStore.players.flatMap((p) => p.images).length,
      usedPrompts: gameStore.usedPrompts.length,
      usedImages: gameStore.usedImages.length,
    });

    const allPrompts = gameStore.players.flatMap((p) => p.prompts);
    const allImages = gameStore.players.flatMap((p) => p.images);

    // No prompts or images -> can't start
    if (allPrompts.length === 0 || allImages.length === 0) {
      console.error("No prompts or images available");
      return "waiting";
    }

    // If we've exceeded totalRounds, game is over
    if (round > gameStore.totalRounds && gameStore.totalRounds > 0) {
      console.log("Game over - all rounds completed");
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
        console.error("Room not found");
        return "waiting";
      }

      // Filter out prompts/images already used
      const unusedPrompts = allPrompts.filter(
        (prompt) => !gameStore.usedPrompts.includes(prompt)
      );
      const unusedImages = allImages.filter(
        (image) => !gameStore.usedImages.includes(image)
      );

      console.log("Available items for round:", {
        round,
        unusedPrompts: unusedPrompts.length,
        unusedImages: unusedImages.length,
      });

      // If we've run out, reset used arrays & recursively restart
      if (unusedPrompts.length === 0 || unusedImages.length === 0) {
        console.log("Resetting used prompts and images, and restarting round...");
        gameStore.resetUsedItems();
        return startNewRound();
      }

      // Pick a random index for the next round
      const randomIndex = Math.floor(Math.random() * unusedPrompts.length);
      const correctPrompt = unusedPrompts[randomIndex];
      const correctImage = unusedImages[randomIndex];

      console.log("Selected for round:", {
        round,
        prompt: correctPrompt,
        imageUrl: correctImage,
      });

      // Generate false answers from GPT
      const { data: response, error: gptError } = await supabase.functions
        .invoke("generate-false-answers", {
          body: { correctPrompt },
        });

      if (gptError || !response?.alternatives) {
        console.error("Error generating false answers:", gptError);
        toast.error("Error generating game options");
        return "waiting";
      }

      // Combine & shuffle
      const options = [correctPrompt, ...response.alternatives];
      const shuffledOptions = options.sort(() => Math.random() - 0.5);

      // Update the room in Supabase with new round data
      const { error: updateError } = await supabase
        .from("game_rooms")
        .update({
          current_image: correctImage,
          current_options: shuffledOptions,
          correct_prompt: correctPrompt,
          current_round: round,
          status: "playing",
        })
        .eq("id", roomData.id);

      if (updateError) {
        console.error("Error updating room:", updateError);
        toast.error("Error starting new round");
        return "waiting";
      }

      // Mark them as used so they won't be picked again
      gameStore.addUsedPrompt(correctPrompt);
      gameStore.addUsedImage(correctImage);

      // IMPORTANT: Store the image in our local store for round N
      gameStore.setRoundImage(round, correctImage);

      // Also set current round data
      gameStore.setCurrentRound(round, correctImage, shuffledOptions, correctPrompt);

      console.log("Round setup complete:", {
        round,
        image: correctImage,
        options: shuffledOptions,
      });

      return "playing";
    } catch (error) {
      console.error("Error in startNewRound:", error);
      toast.error("Error starting new round");
      return "waiting";
    }
  }, [gameStore]);

  return { startNewRound };
};
