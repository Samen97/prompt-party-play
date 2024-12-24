import { useState } from "react";
import { RoomCreation } from "@/components/game/RoomCreation";
import { PromptSubmission } from "@/components/game/PromptSubmission";
import { GameRound } from "@/components/game/GameRound";
import { GameResults } from "@/components/game/GameResults";
import { LobbyStatus } from "@/components/game/LobbyStatus";
import { GameHeader } from "@/components/game/GameHeader";
import { HostView } from "@/components/game/HostView";
import { generateImage } from "@/services/openai";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useGameSubscription } from "@/hooks/useGameSubscription";
import { useGameLogic } from "@/hooks/useGameLogic";
import { GameState } from "@/types/game";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const gameStore = useGameStore();
  const { startNewRound } = useGameLogic();

  useGameSubscription(gameStore.roomCode, gameState, setGameState, async () => {
    const newState = await startNewRound();
    return newState;
  });

  const handleCreateRoom = async (username: string) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .insert([{ code: roomCode, host_id: username }])
      .select()
      .single();

    if (roomError) {
      toast.error('Failed to create room');
      return;
    }

    gameStore.setRoomCode(roomCode);
    gameStore.setHost(username);
    setGameState("waiting");
    toast.success(`Room created! Share this code with players: ${roomCode}`);
  };

  const handleJoinRoom = async (username: string, roomCode: string) => {
    const { data: roomData, error: roomError } = await supabase
      .from('game_rooms')
      .select()
      .eq('code', roomCode)
      .single();

    if (roomError || !roomData) {
      toast.error('Room not found');
      return;
    }

    const { error: playerError } = await supabase
      .from('game_players')
      .insert([{ 
        room_id: roomData.id, 
        username: username,
      }]);

    if (playerError) {
      toast.error('Failed to join room');
      return;
    }

    gameStore.setRoomCode(roomCode);
    gameStore.addPlayer(username);
    setGameState("prompt-submission");
    toast.success("Joined room successfully!");
  };

  const handleSubmitPrompts = async (prompts: string[]) => {
    toast.info("Generating images... This may take a minute.");
    try {
      const images = await Promise.all(
        prompts.map((prompt) => generateImage(prompt))
      );
      
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      const { data: playerData } = await supabase
        .from('game_players')
        .select()
        .eq('room_id', roomData.id)
        .eq('username', gameStore.players[gameStore.players.length - 1].username)
        .single();

      const { error: promptError } = await supabase
        .from('game_prompts')
        .insert(
          prompts.map((prompt, index) => ({
            room_id: roomData.id,
            player_id: playerData.id,
            prompt: prompt,
            image_url: images[index],
          }))
        );

      if (promptError) {
        toast.error('Failed to save prompts');
        return;
      }

      const playerId = gameStore.players[gameStore.players.length - 1].id;
      gameStore.updatePlayerPrompts(playerId, prompts, images);
      setGameState("waiting");
      toast.success("Images generated successfully! Waiting for other players to finish.");
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error("Error generating images. Please try again.");
    }
  };

  const handleSubmitGuess = (guess: string) => {
    if (guess === gameStore.correctPrompt) {
      const playerId = gameStore.players[gameStore.players.length - 1].id;
      gameStore.updateScore(playerId, 100);
      toast.success("Correct guess! +100 points");
    } else {
      toast.error("Wrong guess! The correct prompt was: " + gameStore.correctPrompt);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto py-8">
        {gameStore.roomCode && <GameHeader />}

        {gameState === "lobby" && (
          <RoomCreation
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {!gameStore.isHost && (
          <>
            {gameState === "prompt-submission" && (
              <>
                <PromptSubmission onSubmitPrompts={handleSubmitPrompts} />
                <LobbyStatus />
              </>
            )}

            {gameState === "waiting" && (
              <div className="text-center p-6">
                <h3 className="text-xl font-bold mb-2">Waiting for Other Players</h3>
                <p className="text-gray-600">
                  Your prompts have been submitted. Please wait for other players to finish.
                </p>
                <LobbyStatus />
              </div>
            )}

            {gameState === "playing" && (
              <GameRound
                imageUrl={gameStore.currentImage}
                options={gameStore.options}
                onSubmitGuess={handleSubmitGuess}
                timeLeft={30}
              />
            )}
          </>
        )}

        {gameStore.isHost && gameState !== "lobby" && <HostView />}
        {gameState === "results" && <GameResults />}
      </div>
    </div>
  );
};

export default Index;