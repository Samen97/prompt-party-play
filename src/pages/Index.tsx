import { useState } from "react";
import { RoomCreation } from "@/components/game/RoomCreation";
import { PromptSubmission } from "@/components/game/PromptSubmission";
import { GameRound } from "@/components/game/GameRound";
import { GameResults } from "@/components/game/GameResults";
import { GameControls } from "@/components/game/GameControls";
import { LobbyStatus } from "@/components/game/LobbyStatus";
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

  // Subscribe to real-time updates
  useGameSubscription(gameStore.roomCode, gameState, setGameState, startNewRound);

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
    gameStore.setHost(username);
    gameStore.addPlayer(username);
    setGameState("prompt-submission");
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
      
      if (gameStore.isHost) {
        toast.success("Images generated! Waiting for other players...");
      } else {
        setGameState("waiting");
        toast.success("Images generated successfully! Waiting for host to start the game.");
      }
    } catch (error) {
      console.error('Image generation error:', error);
      toast.error("Error generating images. Please try again.");
    }
  };

  const handleSubmitGuess = (guess: string) => {
    const playerId = gameStore.players[gameStore.players.length - 1].id;
    if (guess === gameStore.correctPrompt) {
      gameStore.updateScore(playerId, 100);
      toast.success("Correct guess! +100 points");
    } else {
      toast.error("Wrong guess! The correct prompt was: " + gameStore.correctPrompt);
    }

    if (gameStore.isHost) {
      setTimeout(() => {
        const newState = startNewRound();
        if (newState !== gameState) {
          setGameState(newState);
        }
      }, 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto py-8">
        {gameStore.roomCode && (
          <div className="mb-8 p-6 bg-white rounded-lg shadow-lg text-center">
            <h2 className="text-xl font-bold mb-2">Room Code</h2>
            <p className="text-4xl font-mono bg-gray-100 p-4 rounded select-all cursor-pointer">
              {gameStore.roomCode}
            </p>
            <p className="text-sm text-gray-500 mt-2">Click to copy</p>
          </div>
        )}

        {gameState === "lobby" && (
          <RoomCreation
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {gameState === "prompt-submission" && (
          <>
            <div className="text-center mb-4">
              <h3 className="text-xl font-bold">
                {gameStore.isHost ? "Host View" : "Player View"}
              </h3>
              <p className="text-gray-600">
                {gameStore.isHost
                  ? "Submit your prompts and wait for other players"
                  : "Submit your prompts"}
              </p>
            </div>
            <PromptSubmission onSubmitPrompts={handleSubmitPrompts} />
            <LobbyStatus />
            <GameControls 
              gameState={gameState}
              setGameState={setGameState}
              startNewRound={startNewRound}
            />
          </>
        )}

        {gameState === "waiting" && (
          <div className="text-center p-6">
            <h3 className="text-xl font-bold mb-2">Waiting for Host</h3>
            <p className="text-gray-600">
              Your prompts have been submitted. Please wait for the host to start the game.
            </p>
            <LobbyStatus />
          </div>
        )}

        {gameState === "playing" && (
          <>
            <div className="mb-4">
              <h3 className="text-xl font-bold text-center mb-2">
                Round {gameStore.currentRound} of {gameStore.totalRounds}
              </h3>
              <div className="flex justify-center space-x-4">
                {gameStore.players.map((player) => (
                  <div key={player.id} className="text-center">
                    <p className="font-semibold">{player.username}</p>
                    <p className="text-sm">Score: {player.score}</p>
                  </div>
                ))}
              </div>
            </div>
            <GameRound
              imageUrl={gameStore.currentImage}
              options={gameStore.options}
              onSubmitGuess={handleSubmitGuess}
              timeLeft={30}
            />
          </>
        )}

        {gameState === "results" && <GameResults />}
      </div>
    </div>
  );
};

export default Index;