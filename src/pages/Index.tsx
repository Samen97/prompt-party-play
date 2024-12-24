import { useState } from "react";
import { RoomCreation } from "@/components/game/RoomCreation";
import { PromptSubmission } from "@/components/game/PromptSubmission";
import { GameRound } from "@/components/game/GameRound";
import { toast } from "sonner";

type GameState = "lobby" | "prompt-submission" | "playing" | "results";

const Index = () => {
  const [gameState, setGameState] = useState<GameState>("lobby");
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");

  // Temporary mock data for demonstration
  const mockImage = "https://picsum.photos/800/800";
  const mockOptions = [
    "A serene landscape with floating islands",
    "A cyberpunk city at sunset",
    "A magical forest with glowing mushrooms",
    "An underwater palace made of coral",
  ];

  const handleCreateRoom = (username: string) => {
    setUsername(username);
    setRoomCode(Math.random().toString(36).substring(2, 8).toUpperCase());
    setGameState("prompt-submission");
    toast.success(`Room created! Your room code is: ${roomCode}`);
  };

  const handleJoinRoom = (username: string, roomCode: string) => {
    setUsername(username);
    setRoomCode(roomCode);
    setGameState("prompt-submission");
    toast.success("Joined room successfully!");
  };

  const handleSubmitPrompts = (prompts: string[]) => {
    console.log("Submitted prompts:", prompts);
    setGameState("playing");
    toast.success("Prompts submitted successfully!");
  };

  const handleSubmitGuess = (guess: string) => {
    console.log("Submitted guess:", guess);
    toast.success("Guess submitted!");
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50">
      <div className="container mx-auto py-8">
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
          <GameRound
            imageUrl={mockImage}
            options={mockOptions}
            onSubmitGuess={handleSubmitGuess}
            timeLeft={30}
          />
        )}
      </div>
    </div>
  );
};

export default Index;