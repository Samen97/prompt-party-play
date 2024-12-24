import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LobbyStatus } from "./LobbyStatus";

interface PlayerSubmission {
  username: string;
  hasSubmitted: boolean;
}

export const HostView = () => {
  const gameStore = useGameStore();
  const [playerSubmissions, setPlayerSubmissions] = useState<PlayerSubmission[]>([]);
  const [canStartGame, setCanStartGame] = useState(false);

  useEffect(() => {
    if (!gameStore.roomCode) return;

    const fetchSubmissions = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) return;

      const { data: players } = await supabase
        .from('game_players')
        .select('username')
        .eq('room_id', roomData.id);

      const { data: prompts } = await supabase
        .from('game_prompts')
        .select('player_id')
        .eq('room_id', roomData.id);

      const submissions = players?.map(player => ({
        username: player.username,
        hasSubmitted: prompts?.some(prompt => prompt.player_id === player.id) || false
      })) || [];

      setPlayerSubmissions(submissions);
      setCanStartGame(submissions.every(player => player.hasSubmitted));
    };

    // Initial fetch
    fetchSubmissions();

    // Subscribe to changes
    const channel = supabase
      .channel(`room_${gameStore.roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_prompts',
        },
        () => {
          fetchSubmissions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameStore.roomCode]);

  const handleStartGame = async () => {
    if (!canStartGame) {
      toast.error("Cannot start game until all players have submitted their prompts");
      return;
    }

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

    toast.success('Game started!');
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <GameProgress />
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Waiting Room</h2>
        <div className="bg-white rounded-lg p-6 shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Player Submissions</h3>
          <div className="space-y-2">
            {playerSubmissions.map((player, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span>{player.username}</span>
                <span className={`px-3 py-1 rounded text-sm ${
                  player.hasSubmitted 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {player.hasSubmitted ? 'Submitted' : 'Waiting'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <LobbyStatus />

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
      </div>
    </div>
  );
};