import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameRoundProps {
  imageUrl: string;
  options: string[];
  onSubmitGuess: (guess: string) => void;
}

export const GameRound = ({
  imageUrl,
  options,
  onSubmitGuess,
}: GameRoundProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const gameStore = useGameStore();

  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl]);

  const checkAllPlayersAnswered = async (roomId: string) => {
    const { data: playersData } = await supabase
      .from('game_players')
      .select('*')
      .eq('room_id', roomId);

    console.log('Current players state:', playersData);

    // For host, we only check if non-host players have answered
    if (gameStore.isHost) {
      const nonHostPlayers = playersData?.filter(
        player => player.username !== gameStore.hostUsername
      );
      return nonHostPlayers?.every(player => player.has_answered);
    }

    // For non-host players, we check if all non-host players (including themselves) have answered
    const nonHostPlayers = playersData?.filter(
      player => player.username !== gameStore.hostUsername
    );
    return nonHostPlayers?.every(player => player.has_answered);
  };

  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing) return;

    setIsProcessing(true);

    try {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) {
        toast.error('Room not found');
        setIsProcessing(false);
        return;
      }

      // Update current player's answer status if they're not the host
      if (!gameStore.isHost) {
        const { data: playerData } = await supabase
          .from('game_players')
          .select()
          .eq('room_id', roomData.id)
          .eq('username', gameStore.players[gameStore.players.length - 1].username)
          .single();

        if (playerData) {
          await supabase
            .from('game_players')
            .update({ has_answered: true })
            .eq('id', playerData.id);
        }
      }

      // Process the guess
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // Check if all players have answered
      const allAnswered = await checkAllPlayersAnswered(roomData.id);
      console.log('All players answered:', allAnswered);

      if (allAnswered) {
        console.log('All players have answered, proceeding to next round');
        
        // Reset all players' has_answered status
        await supabase
          .from('game_players')
          .update({ has_answered: false })
          .eq('room_id', roomData.id);

        // Update room to next round
        const nextRound = roomData.current_round + 1;
        await supabase
          .from('game_rooms')
          .update({ 
            current_round: nextRound,
            current_image: null,
            current_options: null,
            correct_prompt: null
          })
          .eq('id', roomData.id);

        toast.success('Moving to next round...');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('Error submitting answer');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Which prompt created this image?</h2>
        <p className="text-gray-600">Round {gameStore.currentRound} of {gameStore.totalRounds}</p>
      </div>

      <div className="aspect-square w-full max-w-2xl mx-auto">
        <img
          src={imageUrl}
          alt="AI Generated Image"
          className="w-full h-full object-cover rounded-lg shadow-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, index) => (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-all ${
              selectedOption === option
                ? "border-primary border-2"
                : "hover:border-gray-400"
            }`}
            onClick={() => !hasAnswered && setSelectedOption(option)}
          >
            <p className="text-lg">{option}</p>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || hasAnswered || isProcessing}
        className="w-full max-w-md mx-auto bg-primary hover:bg-primary/90"
      >
        {isProcessing 
          ? "Processing..." 
          : hasAnswered 
            ? "Waiting for other players..." 
            : "Submit Guess"}
      </Button>
    </div>
  );
};