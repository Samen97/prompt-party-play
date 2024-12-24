// /src/hooks/useGameRound.ts

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { useGameLogic } from "@/hooks/useGameLogic"; // <-- important import

/**
 * Called by the <GameRound> component to handle a user's guess and
 * auto-advance to the next round once everyone has answered.
 * 
 * If the current user is the host, and all non-host players answered,
 * it automatically calls startNewRound() from your existing useGameLogic.ts.
 */
export const useGameRound = (
  imageUrl: string,
  onSubmitGuess: (guess: string) => void
) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Access the global game store to get current user, host, etc.
  const gameStore = useGameStore();

  // Import the "startNewRound" function from your existing useGameLogic
  const { startNewRound } = useGameLogic();

  // Identify the "current player" as the last one in store.players
  const currentUsername =
    gameStore.players[gameStore.players.length - 1]?.username;

  // Reset selection state whenever the round or image changes
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl, gameStore.currentRound]);

  /**
   * Called when the user clicks "Submit Answer"
   */
  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing || !currentUsername) {
      return; // guard
    }

    setIsProcessing(true);
    console.log("Submitting answer for user:", currentUsername);

    try {
      // 1) Fetch the game_room row by code
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("code", gameStore.roomCode)
        .maybeSingle();

      if (roomError || !roomData) {
        console.error("Room error:", roomError);
        toast.error("Error finding game room");
        setIsProcessing(false);
        return;
      }

      // 2) Fetch this player's record from game_players
      const { data: playerData, error: playerError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id)
        .eq("username", currentUsername)
        .maybeSingle();

      if (playerError || !playerData) {
        console.error("Player error:", playerError);
        toast.error("Error finding player record");
        setIsProcessing(false);
        return;
      }

      // 3) Mark this player as "answered"
      const { error: updateError } = await supabase
        .from("game_players")
        .update({ has_answered: true })
        .eq("id", playerData.id);

      if (updateError) {
        console.error("Failed to update answer status:", updateError);
        toast.error("Failed to update answer status");
        setIsProcessing(false);
        return;
      }

      // 4) Locally indicate we have submitted an answer
      onSubmitGuess(selectedOption); // your existing guess handler
      setHasAnswered(true);

      // 5) Check if all non-host players have answered
      const { data: allPlayers, error: playersError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id);

      if (playersError) {
        console.error("Error checking players:", playersError);
        setIsProcessing(false);
        return;
      }

      const nonHostPlayers = allPlayers.filter(
        (p) => p.username !== gameStore.hostUsername
      );
      const allAnswered = nonHostPlayers.every((p) => p.has_answered);

      console.log("All players answered? ", allAnswered);

      if (allAnswered) {
        console.log("All players have answered - preparing next round...");

        // (a) Reset all players' 'has_answered' so they can answer again
        const { error: resetError } = await supabase
          .from("game_players")
          .update({ has_answered: false })
          .eq("room_id", roomData.id);

        if (resetError) {
          console.error("Error resetting player answers:", resetError);
          toast.error("Error preparing next round");
          setIsProcessing(false);
          return;
        }

        // (b) Bump the round # in DB, or set status='completed'
        const nextRound = roomData.current_round + 1;
        const newStatus =
          nextRound > gameStore.totalRounds ? "completed" : "playing";

        const { error: roomUpdateError } = await supabase
          .from("game_rooms")
          .update({
            current_round: nextRound,
            status: newStatus,
          })
          .eq("id", roomData.id);

        if (roomUpdateError) {
          console.error("Error updating room round:", roomUpdateError);
          toast.error("Error moving to next round");
          setIsProcessing(false);
          return;
        }

        // (c) If we have more rounds to play, the HOST triggers "startNewRound"
        if (newStatus === "playing" && gameStore.isHost) {
          console.log("HOST auto-calls startNewRound for round:", nextRound);
          const result = await startNewRound(); 
          // result will be "playing" or "results"
          if (result === "results") {
            toast.success("Game completed!");
          }
        }
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      toast.error("Error processing answer");
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    selectedOption,
    setSelectedOption,
    hasAnswered,
    isProcessing,
    handleSubmit,
  };
};
