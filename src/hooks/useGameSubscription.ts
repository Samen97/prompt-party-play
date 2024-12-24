import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { GameRoom, GameState } from "@/types/game";

export const useGameSubscription = (
  roomCode: string | null,
  gameState: GameState,
  setGameState: (state: GameState) => void,
  startNewRound: () => Promise<GameState> | GameState
) => {
  const gameStore = useGameStore();
  const subscriptionRef = useRef<{
    roomChannel: any;
    playerChannel: any;
    promptChannel: any;
  }>({ roomChannel: null, playerChannel: null, promptChannel: null });

  useEffect(() => {
    if (!roomCode) {
      console.log("No room code available for subscriptions");
      return;
    }

    if (!subscriptionRef.current.roomChannel) {
      console.log("Setting up realtime subscriptions for room:", roomCode);

      // Room channel subscription
      const roomChannel = supabase
        .channel(`room-${roomCode}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_rooms",
            filter: `code=eq.${roomCode}`,
          },
          async (payload) => {
            console.log("Room update received:", payload);
            const newRoom = payload.new as GameRoom;

            if (newRoom.current_round !== null) {
              gameStore.setCurrentRound(
                newRoom.current_round,
                newRoom.current_image ?? "",
                newRoom.current_options ?? [],
                newRoom.correct_prompt ?? ""
              );
            }

            if (newRoom.status === "playing") {
              console.log("Game starting - transitioning to playing state");
              setGameState("playing");
              
              if (gameStore.isHost) {
                console.log("Host starting new round");
                const newState = await startNewRound();
                if (newState !== gameState) {
                  setGameState(newState);
                }
              }
            } else if (newRoom.status === "completed") {
              toast.success("Game completed!");
              setGameState("results");
            }
          }
        )
        .subscribe();

      // Player channel subscription
      const playerChannel = supabase
        .channel(`players-${roomCode}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_players",
            filter: `room_id=eq.${roomCode}`,
          },
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newPlayer = payload.new;
              gameStore.addPlayer(newPlayer.username);
              toast.success(`${newPlayer.username} joined the game!`);
            } else if (payload.eventType === "UPDATE") {
              const updatedPlayer = payload.new;
              gameStore.updateScore(updatedPlayer.id, updatedPlayer.score);
            }
          }
        )
        .subscribe();

      // Prompt channel subscription with enhanced handling
      const promptChannel = supabase
        .channel(`prompts-${roomCode}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "game_prompts",
            filter: `room_id=eq.${roomCode}`,
          },
          async (payload) => {
            console.log("Prompt update received:", payload);
            
            if (payload.eventType === "INSERT") {
              const newPrompt = payload.new;
              if (gameStore.isHost) {
                // Re-fetch all prompts to get the latest state
                const { data: roomData } = await supabase
                  .from("game_rooms")
                  .select()
                  .eq("code", roomCode)
                  .single();

                if (roomData) {
                  const { data: promptsData } = await supabase
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

                  if (promptsData) {
                    const formattedPrompts = promptsData.map(prompt => ({
                      id: prompt.id,
                      prompt: prompt.prompt,
                      image_url: prompt.image_url,
                      player_username: prompt.game_players?.username || "Unknown Player"
                    }));
                    gameStore.setPrompts(formattedPrompts);
                  }
                }
              }
              toast.info("New prompt submitted!");
            } else if (payload.eventType === "UPDATE") {
              // Handle image URL updates
              if (payload.new.image_url && !payload.old.image_url) {
                toast.success("Image generated for prompt!");
                if (gameStore.isHost) {
                  // Re-fetch to get the latest state
                  const { data: roomData } = await supabase
                    .from("game_rooms")
                    .select()
                    .eq("code", roomCode)
                    .single();

                  if (roomData) {
                    const { data: promptsData } = await supabase
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

                    if (promptsData) {
                      const formattedPrompts = promptsData.map(prompt => ({
                        id: prompt.id,
                        prompt: prompt.prompt,
                        image_url: prompt.image_url,
                        player_username: prompt.game_players?.username || "Unknown Player"
                      }));
                      gameStore.setPrompts(formattedPrompts);
                    }
                  }
                }
              }
            }
          }
        )
        .subscribe();

      subscriptionRef.current = {
        roomChannel,
        playerChannel,
        promptChannel,
      };
    }

    return () => {
      if (subscriptionRef.current.roomChannel) {
        console.log("Cleaning up realtime subscriptions");
        supabase.removeChannel(subscriptionRef.current.roomChannel);
        supabase.removeChannel(subscriptionRef.current.playerChannel);
        supabase.removeChannel(subscriptionRef.current.promptChannel);
        subscriptionRef.current = {
          roomChannel: null,
          playerChannel: null,
          promptChannel: null,
        };
      }
    };
  }, [roomCode]);
};