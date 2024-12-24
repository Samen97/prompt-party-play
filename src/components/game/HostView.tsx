import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LobbyStatus } from "./LobbyStatus";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PlayerSubmission {
  username: string;
  hasSubmitted: boolean;
}

interface GamePrompt {
  id: string;
  prompt: string;
  image_url: string;
  player_username: string;
}

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

      // Transform prompts data to include player username
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
        <h2 className="text-2xl font-bold text-center">Host View</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player Submissions Panel */}
          <Card className="p-6">
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
          </Card>

          {/* Prompts and Images Panel */}
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-4">Submitted Prompts</h3>
            <ScrollArea className="h-[300px] pr-4">
              <div className="space-y-4">
                {prompts.map((prompt, index) => (
                  <div key={prompt.id} className="space-y-2 p-3 bg-gray-50 rounded">
                    <p className="text-sm font-medium text-gray-600">
                      From: {prompt.player_username}
                    </p>
                    <p className="text-sm">{prompt.prompt}</p>
                    {prompt.image_url && (
                      <img 
                        src={prompt.image_url} 
                        alt={prompt.prompt}
                        className="w-full h-32 object-cover rounded"
                      />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </Card>
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