import { Button } from "@/components/ui/button";
import { GameState } from "@/types/game";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GameControlsProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  startNewRound: () => GameState;
}

export const GameControls = ({
  gameState,
  setGameState,
  startNewRound,
}: GameControlsProps) => {
  const gameStore = useGameStore();

  const startGame = async () => {
    const { data: roomData } = await supabase
      .from('game_rooms')
      .select()
      .eq('code', gameStore.roomCode)
      .single();

    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ status: 'playing' })
      .eq('id', roomData.id);

    if (updateError) {
      toast.error('Failed to start game');
      return;
    }

    setGameState('playing');
    const newState = startNewRound();
    if (newState !== gameState) {
      setGameState(newState);
    }
  };

  // Only show start button for host and when in prompt-submission state
  if (gameState !== 'prompt-submission' || !gameStore.isHost) {
    return null;
  }

  return (
    <div className="mt-6 text-center">
      <Button onClick={startGame} className="bg-green-500 hover:bg-green-600">
        Start Game
      </Button>
    </div>
  );
};