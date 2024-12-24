import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";

export const HostView = () => {
  const gameStore = useGameStore();

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <GameProgress />
      
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Current Round</h2>
        <p className="text-center text-xl">Correct prompt: {gameStore.correctPrompt}</p>
      </div>

      <div className="aspect-square w-full max-w-2xl mx-auto">
        <img
          src={gameStore.currentImage}
          alt="AI Generated Image"
          className="w-full h-full object-cover rounded-lg shadow-lg"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {gameStore.options.map((option, index) => (
          <div
            key={index}
            className="p-4 border rounded-lg bg-white"
          >
            <p className="text-lg">{option}</p>
          </div>
        ))}
      </div>

      <div className="text-center text-gray-600">
        Waiting for players to submit their answers...
      </div>
    </div>
  );
};