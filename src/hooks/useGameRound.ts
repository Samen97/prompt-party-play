// /src/hooks/useGameRound.ts

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { useGameLogic } from "@/hooks/useGameLogic";

export const useGameRound = (
  imageUrl: string,
  onSubmitGuess: (guess: string) => void
) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gameStore = useGameStore();
  const { startNewRound } = useGameLogic();
  
  const currentPlayer = gameStore.players[gameStore.players.length - 1];

  // Reset state when round/image changes
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl, gameStore.currentRound]);

  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing || !currentPlayer) {
      return;
    }

    setIsProcessing(true);
    
    try {
      // 1. Get current room data
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) {
        throw new Error('Room not found');
      }

      // 2. Mark current player as answered
      const { error: playerError } = await supabase
        .from('game_players')
        .update({ has_answered: true })
        .eq('room_id', roomData.id)
        .eq('username', currentPlayer.username);

      if (playerError) {
        throw new Error('Failed to update player status');
      }

      // 3. Process the guess
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // 4. Check if all non-host players have answered
      const { data: players } = await supabase
        .from('game_players')
        .select('username, has_answered')
        .eq('room_id', roomData.id);

      if (!players) {
        throw new Error('Failed to fetch players');
      }

      const nonHostPlayers = players.filter(p => p.username !== gameStore.hostUsername);
      const allAnswered = nonHostPlayers.every(p => p.has_answered);

      console.log('[useGameRound] Check all answered:', {
        allAnswered,
        isHost: gameStore.isHost,
        currentRound: gameStore.currentRound,
        totalRounds: gameStore.totalRounds
      });

      if (allAnswered) {
        // Reset all players' answered status
        await supabase
          .from('game_players')
          .update({ has_answered: false })
          .eq('room_id', roomData.id);

        const nextRound = roomData.current_round + 1;
        const isGameOver = nextRound > gameStore.totalRounds;

        // Update room status
        await supabase
          .from('game_rooms')
          .update({
            current_round: nextRound,
            status: isGameOver ? 'completed' : 'playing'
          })
          .eq('id', roomData.id);

        // If game continues and current user is host, start next round
        if (!isGameOver && gameStore.isHost) {
          console.log('[useGameRound] Host starting next round:', nextRound);
          const result = await startNewRound();
          if (result === "results") {
            toast.success("Game completed!");
          }
        }
      }

    } catch (error) {
      console.error('[useGameRound] Error:', error);
      toast.error(error.message);
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