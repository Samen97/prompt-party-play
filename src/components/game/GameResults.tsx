import { useGameStore } from "@/store/gameStore";

export const GameResults = () => {
  const gameStore = useGameStore();

  return (
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
  );
};