import { useEffect, useState } from "react";
import { useGameStore } from "@/store/gameStore";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GameControls } from "./GameControls";
import { PlayerSubmissionsPanel } from "./PlayerSubmissionsPanel";
import { PromptsPanel } from "./PromptsPanel";
import { GameProgress } from "./GameProgress";
import { Loader2 } from "lucide-react";
import { GameRoom } from "@/types/game";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export const HostView = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [room, setRoom] = useState<GameRoom | null>(null);
  const gameStore = useGameStore();

  useEffect(() => {
    const fetchRoom = async () => {
      try {
        const { data: roomData, error } = await supabase
          .from('game_rooms')
          .select()
          .eq('code', gameStore.roomCode)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!roomData) {
          toast.error('Room not found');
          return;
        }

        setRoom(roomData);
      } catch (error) {
        console.error('[HostView] Could not fetch room:', error);
        toast.error('Failed to load room data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRoom();

    // Set up realtime subscription
    const roomSubscription = supabase
      .channel(`room:${gameStore.roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_rooms',
          filter: `code=eq.${gameStore.roomCode}`,
        },
        (payload: RealtimePostgresChangesPayload<GameRoom>) => {
          if (payload.new && 'status' in payload.new) {
            setRoom(payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      roomSubscription.unsubscribe();
    };
  }, [gameStore.roomCode]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!room) {
    return (
      <Card className="p-6 text-center">
        <h2 className="text-xl font-bold mb-2">Room Not Found</h2>
        <p className="text-gray-600">The game room could not be found. Please check the room code and try again.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Game Host View</h2>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-600">Room Code</p>
              <p className="text-xl font-bold">{room.code}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <p className="text-xl font-bold capitalize">{room.status}</p>
            </div>
          </div>
          
          <GameProgress />
          
          <GameControls 
            gameState={room.status as any}
            setGameState={(status) => {
              supabase
                .from('game_rooms')
                .update({ status })
                .eq('id', room.id)
                .then(({ error }) => {
                  if (error) {
                    toast.error('Failed to update game status');
                  }
                });
            }}
            startNewRound={() => {
              // Implementation handled by subscription
              return room.status as any;
            }}
          />
        </div>
      </Card>

      <PlayerSubmissionsPanel />
      <PromptsPanel />
    </div>
  );
};