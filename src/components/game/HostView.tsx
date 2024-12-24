import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { supabase } from "@/integrations/supabase/client";
import { LobbyStatus } from "./LobbyStatus";
import { PlayerSubmissionsPanel } from "./PlayerSubmissionsPanel";
import { PromptsPanel } from "./PromptsPanel";
import { StartGameButton } from "./StartGameButton";
import { PlayerSubmission, GamePrompt } from "@/types/game";
import { toast } from "sonner";

export const HostView = () => {
  const gameStore = useGameStore();
  const [playerSubmissions, setPlayerSubmissions] = useState<PlayerSubmission[]>([]);
  const [canStartGame, setCanStartGame] = useState(false);
  const [prompts, setPrompts] = useState<GamePrompt[]>([]);

  // -----------------------------------------
  // 1) We'll define a fetchSubmissions function
  //    that re-fetches players & prompts.
  // -----------------------------------------
  const fetchSubmissions = async () => {
    // Make sure we have a valid roomCode
    if (!gameStore.roomCode) return;

    // Query the game_rooms table to find the single row
    const { data: roomData, error: roomError } = await supabase
      .from("game_rooms")
      .select()
      .eq("code", gameStore.roomCode)
      .single();

    if (roomError || !roomData) {
      console.error("[HostView] Could not fetch room:", roomError);
      return;
    }

    // Fetch the players for that room
    const { data: players, error: playersError } = await supabase
      .from("game_players")
      .select("id, username")
      .eq("room_id", roomData.id);

    if (playersError) {
      console.error("[HostView] Error fetching players:", playersError);
    }

    // Fetch all prompts w/ their associated player usernames
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

    // Transform prompts data to match your GamePrompt interface
    const formattedPrompts: GamePrompt[] = (promptsData || []).map((p) => ({
      id: p.id,
      prompt: p.prompt,
      image_url: p.image_url,
      player_username: p.game_players?.username || "Unknown Player",
    }));

    // Put them in local state so we can pass to <PromptsPanel />
    setPrompts(formattedPrompts);

    // Build an array of { username, hasSubmitted }
    const submissions = (players || []).map((player) => ({
      username: player.username,
      hasSubmitted: (promptsData || []).some(
        (pr) => pr.player_id === player.id && pr.image_url
      ),
    }));

    setPlayerSubmissions(submissions);

    // If every player has submitted, we can start the game
    const canStart = submissions.every((player) => player.hasSubmitted);
    setCanStartGame(canStart);

    // Optionally update totalRounds
    if (submissions.length > 0) {
      const totalRounds = submissions.length * 2;
      gameStore.setTotalRounds(totalRounds);
    }

    // **** OPTIONAL console log for debugging ****
    console.log("[HostView] fetchSubmissions done:", {
      roomId: roomData.id,
      players,
      promptsData,
    });
  };

  // -----------------------------------------
  // 2) Use an effect to set up subscriptions
  // -----------------------------------------
  useEffect(() => {
    if (!gameStore.roomCode) return;

    console.log("[HostView] Setting up subscriptions for room:", gameStore.roomCode);

    // Subscribe to changes in "game_rooms"
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
        (payload) => {
          console.log("[HostView] game_rooms update:", payload);
          // Re-fetch so we see updated status, round, etc.
          fetchSubmissions();
        }
      )
      .subscribe();

    // Subscribe to changes in "game_prompts"
    const promptsChannel = supabase
      .channel(`prompts_${gameStore.roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_prompts",
          // filter: `room_id=eq.${someRoomId}`,  // optionally use if you want
        },
        (payload) => {
          // *** HERE is our console.log for new/updated game_prompts: ***
          console.log("[HostView] game_prompts update:", payload);
          // If new prompts or updated image_url, let’s fetch again
          fetchSubmissions();
        }
      )
      .subscribe();

    // Cleanup on unmount
    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(promptsChannel);
    };
  }, [gameStore.roomCode]);

  // 3) Actually fetch once on mount, if we have a roomCode
  useEffect(() => {
    fetchSubmissions();
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
