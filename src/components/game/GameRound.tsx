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
  // Assumes you have a reliable way to get the *current player's* username.
  // If you store it differently, adjust as needed.
  const currentUsername = gameStore.currentPlayerUsername; 
  // e.g., gameStore.user?.username or similar

  // Reset local state whenever the image changes (i.e. new round).
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl]);

  /**
   * Checks whether *all* players in the room (including the host)
   * have answered. If you want only non-host to guess, adjust accordingly.
   */
  const checkAllPlayersAnswered = async (roomId: string) => {
    const { data: playersData, error } = await supabase
      .from("game_players")
      .select("*")
      .eq("room_id", roomId);

    if (error || !playersData) {
      console.error("Error fetching players:", error);
      return false;
    }

    console.log("Current players state:", playersData);
    // Example: everyone must have has_answered = true.
    return playersData.every((player) => player.has_answered === true);
  };

  const handleSubmit = async () => {
    // Block if no option selected, or if already answered/processing
    if (!selectedOption || hasAnswered || isProcessing) return;

    setIsProcessing(true);

    try {
      // Find the current room
      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (roomError || !roomData) {
        toast.error("Room not found");
        setIsProcessing(false);
        return;
      }

      // 1) Update current player's has_answered (host or not)
      const { data: playerData, error: playerError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id)
        .eq("username", currentUsername) // <-- use the *actual* current user
        .single();

      if (playerError || !playerData) {
        toast.error("Could not find your player record");
        setIsProcessing(false);
        return;
      }

      // Mark this player as answered
      const { error: updateError } = await supabase
        .from("game_players")
        .update({ has_answered: true })
        .eq("id", playerData.id);

      if (updateError) {
        toast.error("Failed to update your answer status");
        setIsProcessing(false);
        return;
      }

      // 2) Run your guess handler
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // 3) Check if *all* players have answered
      const allAnswered = await checkAllPlayersAnswered(roomData.id);
      console.log("All players answered:", allAnswered);

      if (allAnswered) {
        console.log("All players have answered. Proceeding to next round.");

        // (a) Reset everyone's has_answered
        await supabase
          .from("game_players")
          .update({ has_answered: false })
          .eq("room_id", roomData.id);

        // (b) Move the room to the next round
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

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Which prompt created this image?</h2>
        <p className="text-gray-600">
          Round {gameStore.currentRound} of {gameStore.totalRounds}
        </p>
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
