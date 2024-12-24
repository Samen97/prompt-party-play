import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";

export const useGameRound = (imageUrl: string, onSubmitGuess: (guess: string) => void) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gameStore = useGameStore();
  
  // Get the current player's username from the last player in the list
  // since that's where we add new players in the store
  const currentUsername = gameStore.players[gameStore.players.length - 1]?.username;

  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl]);

  const checkAllNonHostPlayersAnswered = async (roomId: string) => {
    const { data: playersData, error } = await supabase
      .from("game_players")
      .select("*")
      .eq("room_id", roomId);

    if (error || !playersData) {
      console.error("Error fetching players:", error);
      return false;
    }

    console.log('Current players state:', playersData);

    const nonHostPlayers = playersData?.filter(
      player => player.username !== gameStore.hostUsername
    );
    return nonHostPlayers?.every(player => player.has_answered);
  };

  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing || !currentUsername) return;

    setIsProcessing(true);

    try {
      if (gameStore.isHost) {
        toast("Host does not guess in this mode.");
        setIsProcessing(false);
        return;
      }

      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("code", gameStore.roomCode)
        .single();

      if (roomError || !roomData) {
        toast.error("Room not found");
        setIsProcessing(false);
        return;
      }

      const { data: playerData, error: playerError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id)
        .eq("username", currentUsername)
        .maybeSingle();

      if (playerError) {
        console.error("Error finding player:", playerError);
        toast.error("Error finding your player record");
        setIsProcessing(false);
        return;
      }

      if (!playerData) {
        console.error("No player record found for username:", currentUsername);
        toast.error("Could not find your player record. Please try rejoining the game.");
        setIsProcessing(false);
        return;
      }

      const { error: updateError } = await supabase
        .from("game_players")
        .update({ has_answered: true })
        .eq("id", playerData.id);

      if (updateError) {
        toast.error("Failed to update your answer status");
        setIsProcessing(false);
        return;
      }

      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      const allAnswered = await checkAllNonHostPlayersAnswered(roomData.id);
      console.log("All non-host players answered:", allAnswered);

      if (allAnswered) {
        console.log("All non-host players have answered. Moving to next round.");

        await supabase
          .from("game_players")
          .update({ has_answered: false })
          .eq("room_id", roomData.id);

        const nextRound = (roomData.current_round || 0) + 1;
        await supabase
          .from("game_rooms")
          .update({
            current_round: nextRound,
            current_image: null,
            current_options: null,
            correct_prompt: null,
          })
          .eq("id", roomData.id);

        toast.success("Moving to next round...");
      }
    } catch (error) {
      console.error("Error submitting answer:", error);
      toast.error("Error submitting answer");
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
    currentUsername,
  };
};