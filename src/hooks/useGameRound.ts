// /src/hooks/useGameRound.ts

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { useGameLogic } from "@/hooks/useGameLogic"; // important import

/**
 * Called by <GameRound> to handle a user's guess and
 * automatically advance the game once everyone has answered.
 *
 * If all non-host players have answered, and the current user is the HOST,
 * we call `startNewRound()` from your existing useGameLogic.ts.
 */
export const useGameRound = (
  imageUrl: string,
  onSubmitGuess: (guess: string) => void
) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gameStore = useGameStore();
  const { startNewRound } = useGameLogic();

  // Identify the "current player" as the last one in store.players
  const currentUsername =
    gameStore.players[gameStore.players.length - 1]?.username;

  // Whenever the round/image changes, reset selection
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl, gameStore.currentRound]);

  /**
   * Called when user clicks "Submit Answer".
   * 1) Marks this player as "has_answered" in Supabase
   * 2) Checks if all non-host players have answered.
   *    - If yes, and user is HOST, calls startNewRound().
   */
  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing || !currentUsername) {
      return; // guard
    }

    setIsProcessing(true);
    try {
      // 1) Get the room row
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

      // 2) Get the player's row from game_players
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

      // 4) Locally record that we have answered, call parent guess handler
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // 5) Check if all non-host players have answered
      const { data: allPlayers, error: playersError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id);

      if (playersError) {
        console.error("Error checking all players:", playersError);
        setIsProcessing(false);
        return;
      }

      const nonHostPlayers = allPlayers.filter(
        (p) => p.username !== gameStore.hostUsername
      );
      const allAnswered = nonHostPlayers.every((p) => p.has_answered);

      console.log(
        "[useGameRound] All players answered? ",
        allAnswered,
        "| Host? ",
        gameStore.isHost
      );

      // If everyone answered, we move to next round
      if (allAnswered) {
        // (a) Reset has_answered for next round
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

        // (b) Bump round # or mark 'completed'
        const nextRound = (roomData.current_round || 1) + 1;
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
          console.error("Error updating next round:", roomUpdateError);
          toast.error("Error moving to next round");
          setIsProcessing(false);
          return;
        }

        // (c) If not completed, have the HOST auto-start the next round
        if (newStatus === "playing" && gameStore.isHost) {
          console.log("[useGameRound] Host auto-calls startNewRound");
          const result = await startNewRound();
          if (result === "results") {
            toast.success("Game completed!");
          }
        } else if (newStatus === "completed") {
          toast.success("All rounds finished!"); // triggers final
        }
      }
    } catch (error) {
      console.error("Error in handleSubmit guess:", error);
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
