import { useState, useCallback } from "react";
import { RoomCreation } from "@/components/game/RoomCreation";
import { PromptSubmission } from "@/components/game/PromptSubmission";
import { GameRound } from "@/components/game/GameRound";
import { generateImage } from "@/services/openai";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type GameState = "lobby" | "prompt-submission" | "playing" | "results";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const gameStore = useGameStore();

  const handleCreateRoom = (username: string) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameStore.setRoomCode(roomCode);
    gameStore.setHost(username);
    gameStore.addPlayer(username);
    setGameState("prompt-submission");
    toast.success(`Room created! Share this code with players: ${roomCode}`);
  };

  const handleJoinRoom = (username: string, roomCode: string) => {
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

  const startGame = () => {
    setGameState("playing");
    startNewRound();
  };

  const startNewRound = useCallback(() => {
    const round = gameStore.currentRound;
    if (round >= gameStore.totalRounds) {
      setGameState("results");
      return;
    }

    const allPrompts = gameStore.players.flatMap((p) => p.prompts);
    const allImages = gameStore.players.flatMap((p) => p.images);
    
    const randomIndex = Math.floor(Math.random() * allImages.length);
    const correctImage = allImages[randomIndex];
    const correctPrompt = allPrompts[randomIndex];

    const options = [correctPrompt];
    while (options.length < 4) {
      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      if (!options.includes(randomPrompt)) {
        options.push(randomPrompt);
      }
    }

    const shuffledOptions = options.sort(() => Math.random() - 0.5);
    gameStore.setCurrentRound(round + 1, correctImage, shuffledOptions, correctPrompt);
  }, [gameStore]);

  const handleSubmitGuess = (guess: string) => {
    const playerId = gameStore.players[gameStore.players.length - 1].id;
    if (guess === gameStore.correctPrompt) {
      gameStore.updateScore(playerId, 100);
      toast.success("Correct guess! +100 points");
    } else {
      toast.error("Wrong guess! The correct prompt was: " + gameStore.correctPrompt);
    }

    if (gameStore.isHost) {
      setTimeout(startNewRound, 2000);
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
            {gameStore.isHost && gameStore.players.length > 1 && (
              <div className="mt-6 text-center">
                <Button onClick={startGame} className="bg-green-500 hover:bg-green-600">
                  Start Game
                </Button>
              </div>
            )}
          </>
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

        {gameState === "results" && (
          <div className="space-y-6 w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow">
            <h2 className="text-2xl font-bold text-center">Game Over!</h2>
            <div className="space-y-4">
              {gameStore.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
                  >
                    <span className="font-semibold">
                      {index + 1}. {player.username}
                    </span>
                    <span className="text-lg">{player.score} points</span>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;