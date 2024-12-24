import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";

export const useGameRound = (imageUrl: string, onSubmitGuess: (guess: string) => void) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gameStore = useGameStore();
  const currentUsername = gameStore.players[gameStore.players.length - 1]?.username;

  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl]);

  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing || !currentUsername) return;

    setIsProcessing(true);
    console.log('Submitting answer for user:', currentUsername);

    try {
      // Get room data
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

      // Get player data
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

      // Mark player as answered
      const { error: updateError } = await supabase
        .from("game_players")
        .update({ has_answered: true })
        .eq("id", playerData.id);

      if (updateError) {
        console.error("Update error:", updateError);
        toast.error("Failed to update answer status");
        setIsProcessing(false);
        return;
      }

      // Process the guess
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // Check if all non-host players have answered
      const { data: allPlayers, error: playersError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id);

      if (playersError) {
        console.error("Error checking players:", playersError);
        setIsProcessing(false);
        return;
      }

      const nonHostPlayers = allPlayers.filter(p => p.username !== gameStore.hostUsername);
      const allAnswered = nonHostPlayers.every(p => p.has_answered);

      console.log('All players answered:', allAnswered);
      console.log('Non-host players:', nonHostPlayers);

      if (allAnswered) {
        console.log('All players have answered, updating game state');
        
        // Reset all players' answer status
        const { error: resetError } = await supabase
          .from("game_players")
          .update({ has_answered: false })
          .eq("room_id", roomData.id);

        if (resetError) {
          console.error("Error resetting player answers:", resetError);
          toast.error("Error preparing for next round");
          setIsProcessing(false);
          return;
        }

        // Update room to next round
        const nextRound = roomData.current_round + 1;
        const { error: roomUpdateError } = await supabase
          .from("game_rooms")
          .update({
            current_round: nextRound,
            current_image: null,
            current_options: null,
            correct_prompt: null
          })
          .eq("id", roomData.id);

        if (roomUpdateError) {
          console.error("Error updating room:", roomUpdateError);
          toast.error("Error moving to next round");
          setIsProcessing(false);
          return;
        }

        gameStore.setCurrentRound(nextRound, '', [], '');
        toast.success("Moving to next round...");
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
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