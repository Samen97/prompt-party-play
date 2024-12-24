import { useState, useCallback } from "react";
import { ApiKeyInput } from "@/components/game/ApiKeyInput";
import { RoomCreation } from "@/components/game/RoomCreation";
import { PromptSubmission } from "@/components/game/PromptSubmission";
import { GameRound } from "@/components/game/GameRound";
import { generateImage } from "@/services/openai";
import { useGameStore } from "@/store/gameStore";
import { toast } from "sonner";

type GameState = "api-key" | "lobby" | "prompt-submission" | "playing" | "results";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("api-key");
  const [apiKey, setApiKey] = useState("");
  const gameStore = useGameStore();

  const handleApiKeySet = (key: string) => {
    setApiKey(key);
    setGameState("lobby");
  };

  const handleCreateRoom = (username: string) => {
    const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    gameStore.setRoomCode(roomCode);
    gameStore.addPlayer(username);
    setGameState("prompt-submission");
    toast.success(`Room created! Your room code is: ${roomCode}`);
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
        prompts.map((prompt) => generateImage(prompt, apiKey))
      );
      
      const playerId = gameStore.players[gameStore.players.length - 1].id;
      gameStore.updatePlayerPrompts(playerId, prompts, images);
      
      setGameState("playing");
      if (gameStore.isHost) {
        startNewRound();
      }
      
      toast.success("Images generated successfully!");
    } catch (error) {
      toast.error("Error generating images. Please check your API key and try again.");
    }
  };

  const startNewRound = useCallback(() => {
    const round = gameStore.currentRound;
    if (round >= gameStore.totalRounds) {
      setGameState("results");
      return;
    }

    // Get all prompts and select random ones for options
    const allPrompts = gameStore.players.flatMap((p) => p.prompts);
    const allImages = gameStore.players.flatMap((p) => p.images);
    
    // Select random image and its corresponding prompt
    const randomIndex = Math.floor(Math.random() * allImages.length);
    const correctImage = allImages[randomIndex];
    const correctPrompt = allPrompts[randomIndex];

    // Generate options (including the correct one)
    const options = [correctPrompt];
    while (options.length < 4) {
      const randomPrompt = allPrompts[Math.floor(Math.random() * allPrompts.length)];
      if (!options.includes(randomPrompt)) {
        options.push(randomPrompt);
      }
    }

    // Shuffle options
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
        {gameState === "api-key" && (
          <ApiKeyInput onApiKeySet={handleApiKeySet} />
        )}

        {gameState === "lobby" && (
          <RoomCreation
            onCreateRoom={handleCreateRoom}
            onJoinRoom={handleJoinRoom}
          />
        )}

        {gameState === "prompt-submission" && (
          <PromptSubmission onSubmitPrompts={handleSubmitPrompts} />
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
          <div className="space-y-6 w-full max-w-md mx-auto p-6">
            <h2 className="text-2xl font-bold text-center">Game Over!</h2>
            <div className="space-y-4">
              {gameStore.players
                .sort((a, b) => b.score - a.score)
                .map((player, index) => (
                  <div
                    key={player.id}
                    className="flex justify-between items-center p-4 bg-white rounded-lg shadow"
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