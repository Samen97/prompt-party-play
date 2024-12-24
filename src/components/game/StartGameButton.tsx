import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface StartGameButtonProps {
  roomCode: string;
  canStartGame: boolean;
}

export const StartGameButton = ({ roomCode, canStartGame }: StartGameButtonProps) => {
  const handleStartGame = async () => {
    if (!canStartGame) {
      toast.error("Cannot start game until all players have submitted their prompts");
      return;
    }

    const { data: roomData } = await supabase
      .from('game_rooms')
      .select()
      .eq('code', roomCode)
      .single();

    if (!roomData) {
      toast.error('Room not found');
      return;
    }

    const { error: updateError } = await supabase
      .from('game_rooms')
      .update({ 
        status: 'playing',
        current_round: 1
      })
      .eq('id', roomData.id);

    if (updateError) {
      toast.error('Failed to start game');
      return;
    }

    toast.success('Game started!');
  };

  return (
    <div className="text-center">
      <Button 
        onClick={handleStartGame}
        disabled={!canStartGame}
        className={`px-8 py-4 text-lg ${
          canStartGame 
            ? 'bg-green-500 hover:bg-green-600' 
            : 'bg-gray-300'
        }`}
      >
        {canStartGame ? 'Start Game' : 'Waiting for All Players'}
      </Button>
    </div>
  );
};