import { useGameStore } from "@/store/gameStore";

export const GameProgress = () => {
  const gameStore = useGameStore();

  return (
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
  );
};