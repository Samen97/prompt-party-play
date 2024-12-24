import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useGameStore } from '@/store/gameStore';
import { toast } from 'sonner';
import { GameRoom, GameState } from '@/types/game';

export const useGameSubscription = (
  roomCode: string | null,
  gameState: GameState,
  setGameState: (state: GameState) => void,
  startNewRound: () => GameState
) => {
  const gameStore = useGameStore();

  useEffect(() => {
    if (!roomCode) return;

    const roomChannel = supabase
      .channel('room-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Room update:', payload);
          const newRoom = payload.new as GameRoom;
          if (newRoom?.status === 'playing' && gameState === 'waiting') {
            setGameState('playing');
            const newState = startNewRound();
            if (newState !== gameState) {
              setGameState(newState);
            }
          }
        }
      )
      .subscribe();

    const playerChannel = supabase
      .channel('player-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_players',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Player update:', payload);
          if (payload.eventType === 'UPDATE' && payload.new) {
            const updatedPlayer = payload.new;
            gameStore.updateScore(updatedPlayer.id, updatedPlayer.score);
          }
        }
      )
      .subscribe();

    const promptChannel = supabase
      .channel('prompt-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_prompts',
          filter: `room_id=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Prompt update:', payload);
          if (payload.eventType === 'INSERT') {
            toast.info('New prompts have been submitted!');
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
      supabase.removeChannel(playerChannel);
      supabase.removeChannel(promptChannel);
    };
  }, [roomCode, gameState, setGameState, startNewRound, gameStore]);
};
