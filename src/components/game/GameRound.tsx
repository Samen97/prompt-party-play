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

/**
 * GameRound
 * - The host does NOT guess (skips the entire "submit guess" flow).
 * - Only non-host players do guess; once all non-hosts have answered,
 *   we automatically advance to the next round.
 */
export const GameRound = ({
  imageUrl,
  options,
  onSubmitGuess,
}: GameRoundProps) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const gameStore = useGameStore();

  // If you store the current player's username differently, adjust here.
  // For example: const currentUsername = gameStore.user?.username;
  const currentUsername = gameStore.currentPlayerUsername;

  // Reset local guess state whenever the displayed image changes.
  useEffect(() => {
    setSelectedOption(null);
    setHasAnswered(false);
    setIsProcessing(false);
  }, [imageUrl]);

  /**
   * Checks whether all non-host players in the room have answered.
   */
  const checkAllNonHostPlayersAnswered = async (roomId: string) => {
    const { data: playersData, error } = await supabase
      .from("game_players")
      .select("*")
      .eq("room_id", roomId);

    if (error || !playersData) {
      console.error("Error fetching players:", error);
      return false;
    }

    // Filter out the host by their username
    const nonHostPlayers = playersData.filter(
      (player) => player.username !== gameStore.hostUsername
    );

    // We want *all non-host* players to have has_answered = true
    return nonHostPlayers.every((player) => player.has_answered === true);
  };

  /**
   * Submits the user's guess (non-host only).
   * - Marks the current player as has_answered.
   * - Checks if all non-host players are done => moves to next round.
   */
  const handleSubmit = async () => {
    if (!selectedOption || hasAnswered || isProcessing) return;

    setIsProcessing(true);

    try {
      // 1) If the user is the host, do nothing and bail out
      if (gameStore.isHost) {
        toast("Host does not guess in this mode.");
        setIsProcessing(false);
        return;
      }

      // 2) Get the current room
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

      // 3) Find the current player's record (non-host user)
      const { data: playerData, error: playerError } = await supabase
        .from("game_players")
        .select("*")
        .eq("room_id", roomData.id)
        .eq("username", currentUsername)
        .single();

      if (playerError || !playerData) {
        toast.error("Could not find your player record");
        setIsProcessing(false);
        return;
      }

      // 4) Mark this player as answered
      const { error: updateError } = await supabase
        .from("game_players")
        .update({ has_answered: true })
        .eq("id", playerData.id);

      if (updateError) {
        toast.error("Failed to update your answer status");
        setIsProcessing(false);
        return;
      }

      // 5) Run your guess callback
      onSubmitGuess(selectedOption);
      setHasAnswered(true);

      // 6) Check if all non-host players are done
      const allAnswered = await checkAllNonHostPlayersAnswered(roomData.id);
      console.log("All non-host players answered:", allAnswered);

      if (allAnswered) {
        console.log("All non-host players have answered. Moving to next round.");

        // Reset everyone’s has_answered for the next round
        await supabase
          .from("game_players")
          .update({ has_answered: false })
          .eq("room_id", roomData.id);

        // Increment current_round and clear the current round’s data
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
        disabled={gameStore.isHost || !selectedOption || hasAnswered || isProcessing}
        className="w-full max-w-md mx-auto bg-primary hover:bg-primary/90"
      >
        {gameStore.isHost
          ? "Host Cannot Guess"
          : isProcessing
          ? "Processing..."
          : hasAnswered
          ? "Waiting for other players..."
          : "Submit Guess"}
      </Button>
    </div>
  );
};
