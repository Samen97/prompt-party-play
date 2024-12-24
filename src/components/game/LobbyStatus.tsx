import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface PlayerPresence {
  username: string;
  online_at: string;
}

interface PresenceState {
  [key: string]: {
    username: string;
    online_at: string;
  }[];
}

export const LobbyStatus = () => {
  const gameStore = useGameStore();
  const [onlinePlayers, setOnlinePlayers] = useState<PlayerPresence[]>([]);

  useEffect(() => {
    if (!gameStore.roomCode) {
      console.log('No room code available');
      return;
    }

    console.log('Setting up presence channel for room:', gameStore.roomCode);
    
    // Get the current player (last added player)
    const currentPlayer = gameStore.players[gameStore.players.length - 1];
    if (!currentPlayer) {
      console.log('No current player found');
      return;
    }

    const channel = supabase.channel(`room_${gameStore.roomCode}`, {
      config: {
        presence: {
          key: currentPlayer.username,
        },
      },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const presenceState = channel.presenceState() as PresenceState;
        const players = Object.values(presenceState).flat();
        console.log('Presence state updated:', players);
        setOnlinePlayers(players);
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        console.log('Player joined:', key, newPresences);
        toast.success(`${key} joined the game!`);
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
        console.log('Player left:', key, leftPresences);
        toast.info(`${key} left the game`);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          console.log('Channel subscribed, tracking presence for:', currentPlayer.username);
          await channel.track({
            username: currentPlayer.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log('Cleaning up presence channel');
      channel.unsubscribe();
    };
  }, [gameStore.roomCode, gameStore.players]);

  if (!onlinePlayers.length) {
    return (
      <div className="mt-4">
        <h3 className="text-lg font-semibold mb-2">Waiting for players to join...</h3>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Players in Lobby:</h3>
      <div className="flex flex-wrap gap-2">
        {onlinePlayers.map((player, index) => (
          <Badge key={index} variant="secondary" className="px-3 py-1">
            {player.username}
          </Badge>
        ))}
      </div>
    </div>
  );
};