import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { supabase } from "@/integrations/supabase/client";
import { LobbyStatus } from "./LobbyStatus";
import { PlayerSubmissionsPanel } from "./PlayerSubmissionsPanel";
import { PromptsPanel } from "./PromptsPanel";
import { StartGameButton } from "./StartGameButton";
import { PlayerSubmission, GamePrompt } from "@/types/game";

export const HostView = () => {
  const gameStore = useGameStore();
  const [playerSubmissions, setPlayerSubmissions] = useState<PlayerSubmission[]>([]);
  const [canStartGame, setCanStartGame] = useState(false);
  const [prompts, setPrompts] = useState<GamePrompt[]>([]);

  useEffect(() => {
    if (!gameStore.roomCode) return;

    const fetchSubmissions = async () => {
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) return;

      // Fetch players
      const { data: players } = await supabase
        .from('game_players')
        .select('id, username')
        .eq('room_id', roomData.id);

      // Fetch all prompts with their associated player usernames
      const { data: promptsData } = await supabase
        .from('game_prompts')
        .select(`
          id,
          prompt,
          image_url,
          player_id,
          game_players (
            username
          )
        `)
        .eq('room_id', roomData.id);

      // Transform prompts data
      const formattedPrompts = promptsData?.map(prompt => ({
        id: prompt.id,
        prompt: prompt.prompt,
        image_url: prompt.image_url,
        player_username: prompt.game_players?.username || 'Unknown Player'
      })) || [];

      setPrompts(formattedPrompts);

      const submissions = players?.map((player) => ({
        username: player.username,
        hasSubmitted: promptsData?.some(prompt => 
          prompt.player_id === player.id && prompt.image_url
        ) || false
      })) || [];

      setPlayerSubmissions(submissions);
      setCanStartGame(submissions.every(player => player.hasSubmitted));

      if (submissions.length > 0) {
        const totalRounds = submissions.length * 2;
        gameStore.setTotalRounds(totalRounds);
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

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <GameProgress />
      
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-center">Host View</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PlayerSubmissionsPanel playerSubmissions={playerSubmissions} />
          <PromptsPanel prompts={prompts} />
        </div>

        <LobbyStatus />

        <StartGameButton 
          roomCode={gameStore.roomCode} 
          canStartGame={canStartGame} 
        />
      </div>
    </div>
  );
};