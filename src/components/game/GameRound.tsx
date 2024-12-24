import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";

interface GameRoundProps {
  imageUrl: string;
  options: string[];
  onSubmitGuess: (guess: string) => void;
  timeLeft?: number;
}

export const GameRound = ({
  imageUrl,
  options,
  onSubmitGuess,
  timeLeft,
}: GameRoundProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const gameStore = useGameStore();

  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
  }, [imageUrl]);

  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered) return;

    setHasAnswered(true);
    onSubmitGuess(selectedOption);

    // Update the player's answer status in the database
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select()
      .eq('code', gameStore.roomCode)
      .single();

    if (roomData) {
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
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Which prompt created this image?</h2>
        {timeLeft !== undefined && (
          <p className="text-center text-gray-600">Time left: {timeLeft}s</p>
        )}
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
        disabled={!selectedOption || hasAnswered}
        className="w-full max-w-md mx-auto bg-primary hover:bg-primary/90"
      >
        {hasAnswered ? "Waiting for other players..." : "Submit Guess"}
      </Button>
    </div>
  );
};