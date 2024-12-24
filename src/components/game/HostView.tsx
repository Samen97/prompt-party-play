import { useEffect, useState, useCallback } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { supabase } from "@/integrations/supabase/client";
import { LobbyStatus } from "./LobbyStatus";
import { PlayerSubmissionsPanel } from "./PlayerSubmissionsPanel";
import { PromptsPanel } from "./PromptsPanel";
import { StartGameButton } from "./StartGameButton";
import { PlayerSubmission, GamePrompt } from "@/types/game";
import { toast } from "sonner";
import { debounce } from "lodash";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export const HostView = () => {
  const gameStore = useGameStore();
  const [playerSubmissions, setPlayerSubmissions] = useState<PlayerSubmission[]>([]);
  const [canStartGame, setCanStartGame] = useState(false);
  const [prompts, setPrompts] = useState<GamePrompt[]>([]);
  const [isProcessingGameStart, setIsProcessingGameStart] = useState(false);

  // Debounced version of fetchSubmissions to prevent multiple rapid calls
  const debouncedFetchSubmissions = useCallback(
    debounce(async () => {
      if (!gameStore.roomCode) return;

      const { data: roomData, error: roomError } = await supabase
        .from("game_rooms")
        .select()
        .eq("code", gameStore.roomCode)
        .single();

      if (roomError || !roomData) {
        console.error("[HostView] Could not fetch room:", roomError);
        return;
      }

      const { data: players, error: playersError } = await supabase
        .from("game_players")
        .select("id, username")
        .eq("room_id", roomData.id);

      if (playersError) {
        console.error("[HostView] Error fetching players:", playersError);
      }

      const { data: promptsData, error: promptsError } = await supabase
        .from("game_prompts")
        .select(`
          id,
          prompt,
          image_url,
          player_id,
          game_players (
            username
          )
        `)
        .eq("room_id", roomData.id);

      if (promptsError) {
        console.error("[HostView] Error fetching prompts:", promptsError);
      }

      const formattedPrompts: GamePrompt[] = (promptsData || []).map((p) => ({
        id: p.id,
        prompt: p.prompt,
        image_url: p.image_url,
        player_username: p.game_players?.username || "Unknown Player",
      }));

      setPrompts(formattedPrompts);
      gameStore.setPrompts(formattedPrompts);

      const submissions = (players || []).map((player) => ({
        username: player.username,
        hasSubmitted: (promptsData || []).some(
          (pr) => pr.player_id === player.id && pr.image_url
        ),
      }));

      setPlayerSubmissions(submissions);
      const canStart = submissions.every((player) => player.hasSubmitted);
      setCanStartGame(canStart);

      if (submissions.length > 0) {
        const totalRounds = submissions.length * 2;
        gameStore.setTotalRounds(totalRounds);
      }

      console.log("[HostView] fetchSubmissions done:", {
        roomId: roomData.id,
        players,
        promptsData,
      });
    }, 500),
    [gameStore]
  );

  useEffect(() => {
    if (!gameStore.roomCode) {
      console.log("No room code available for subscriptions");
      return;
    }

    console.log("[HostView] Setting up subscriptions for room:", gameStore.roomCode);

    const roomChannel = supabase
      .channel(`room_${gameStore.roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_rooms",
          filter: `code=eq.${gameStore.roomCode}`,
        },
        async (payload: RealtimePostgresChangesPayload<any>) => {
          console.log("[HostView] game_rooms update:", payload);
          
          // Only process game start once
          if (payload.new?.status === 'playing' && !isProcessingGameStart) {
            setIsProcessingGameStart(true);
            await debouncedFetchSubmissions();
            setIsProcessingGameStart(false);
          }
        }
      )
      .subscribe();

    const promptsChannel = supabase
      .channel(`prompts_${gameStore.roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_prompts",
        },
        (payload) => {
          console.log("[HostView] game_prompts update:", payload);
          debouncedFetchSubmissions();
        }
      )
      .subscribe();

    debouncedFetchSubmissions();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(promptsChannel);
    };
  }, [gameStore.roomCode, debouncedFetchSubmissions]);

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