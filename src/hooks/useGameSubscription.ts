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

    // Only set up subscriptions if they don't already exist
    if (!subscriptionRef.current.roomChannel) {
      console.log("Setting up realtime subscriptions for room:", roomCode);

      /**
       * SUBSCRIBE: game_rooms
       */
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
            if (newRoom.status === "playing") {
              gameStore.setCurrentRound(
                newRoom.current_round ?? 1,
                newRoom.current_image ?? "",
                newRoom.current_options ?? [],
                newRoom.correct_prompt ?? ""
              );

              if (gameState === "waiting") {
                console.log("Game starting - transitioning to playing state");
                setGameState("playing");
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

      /**
       * SUBSCRIBE: game_players
       */
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

      /**
       * SUBSCRIBE: game_prompts
       */
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
          (payload) => {
            if (payload.eventType === "INSERT") {
              const newPrompt = payload.new;
              if (newPrompt.image_url) {
                gameStore.addPrompt(newPrompt.prompt, newPrompt.image_url);
                toast.info(`New prompt submitted!`);
              }
            }
          }
        )
        .subscribe();

      // Store the channels in the ref
      subscriptionRef.current = {
        roomChannel,
        playerChannel,
        promptChannel,
      };
    }

    // Cleanup function
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
  }, [roomCode]); // Only re-run if roomCode changes
};