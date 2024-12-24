import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useGameStore } from "@/store/gameStore";
import { Badge } from "@/components/ui/badge";

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
    if (!gameStore.roomCode || !gameStore.players.length) return;

    const currentPlayer = gameStore.players[gameStore.players.length - 1];
    if (!currentPlayer) return;

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
        // Flatten the presence state object into an array of players
        const players = Object.values(presenceState).flat();
        setOnlinePlayers(players);
        console.log('Presence state updated:', players);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED' && currentPlayer) {
          await channel.track({
            username: currentPlayer.username,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      console.log('Cleaning up realtime subscriptions');
      channel.unsubscribe();
    };
  }, [gameStore.roomCode, gameStore.players]);

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