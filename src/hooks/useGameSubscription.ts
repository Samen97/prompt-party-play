import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { GameRoom, GameState } from '@/types/game';

export const useGameSubscription = (
  roomCode: string | null,
  gameState: GameState,
  setGameState: (state: GameState) => void,
  startNewRound: () => Promise<GameState> | GameState
) => {
  const gameStore = useGameStore();

  useEffect(() => {
    if (!roomCode) {
      console.log('No room code available for subscriptions');
      return;
    }

    console.log('Setting up realtime subscriptions for room:', roomCode);

    const roomChannel = supabase
      .channel(`room-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `code=eq.${roomCode}`,
        },
        async (payload) => {
          console.log('Room update received:', payload);
          const newRoom = payload.new as GameRoom;
          
          if (newRoom?.status === 'playing' && gameState === 'waiting') {
            console.log('Game starting - transitioning to playing state');
            setGameState('playing');
            const newState = await startNewRound();
            if (newState !== gameState) {
              setGameState(newState);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Room channel status: ${status}`);
      });

    const playerChannel = supabase
      .channel(`players-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Player update received:', payload);
          if (payload.eventType === 'INSERT') {
            const newPlayer = payload.new;
            gameStore.addPlayer(newPlayer.username);
            toast.success(`${newPlayer.username} joined the game!`);
          } else if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new;
            gameStore.updateScore(updatedPlayer.id, updatedPlayer.score);
          }
        }
      )
      .subscribe((status) => {
        console.log(`Player channel status: ${status}`);
      });

    const promptChannel = supabase
      .channel(`prompts-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_prompts',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Prompt update received:', payload);
          if (payload.eventType === 'INSERT') {
            const newPrompt = payload.new;
            if (newPrompt.image_url) {
              gameStore.addPrompt(newPrompt.prompt, newPrompt.image_url);
              toast.info(`New prompt submitted!`);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Prompt channel status: ${status}`);
      });

    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(promptChannel);
    };
  }, [roomCode, gameState, setGameState, startNewRound, gameStore]);
};