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

interface GamePlayer {
  id: string;
  username: string;
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
        .select('id, username')
        .eq('room_id', roomData.id);

      const { data: prompts } = await supabase
        .from('game_prompts')
        .select('player_id')
        .eq('room_id', roomData.id)
        .is('round_number', null);

      const submissions = players?.map((player: GamePlayer) => ({
        username: player.username,
        hasSubmitted: prompts?.some(prompt => prompt.player_id === player.id) || false
      })) || [];

      setPlayerSubmissions(submissions);
      setCanStartGame(submissions.every(player => player.hasSubmitted));

      // Update total rounds based on submissions
      if (submissions.length > 0) {
        const totalRounds = submissions.length * 2; // Each player contributes 2 prompts
        gameStore.setTotalRounds(totalRounds);
      }

      // Update game store with current game state
      if (roomData.current_image && roomData.current_options && roomData.correct_prompt) {
        gameStore.setCurrentRound(
          roomData.current_round,
          roomData.current_image,
          roomData.current_options,
          roomData.correct_prompt
        );
      }
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
          table: 'game_rooms',
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

    if (!roomData) {
      toast.error('Room not found');
      return;
    }

    // Assign round numbers to prompts
    const { data: prompts } = await supabase
      .from('game_prompts')
      .select()
      .eq('room_id', roomData.id)
      .is('round_number', null);

    if (prompts) {
      for (let i = 0; i < prompts.length; i++) {
        await supabase
          .from('game_prompts')
          .update({ round_number: i + 1 })
          .eq('id', prompts[i].id);
      }
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