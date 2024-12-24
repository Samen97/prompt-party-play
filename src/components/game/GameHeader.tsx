import { useGameStore } from "@/store/gameStore";

export const GameHeader = () => {
  const gameStore = useGameStore();

  return (
    <div className="mb-8 p-6 bg-white rounded-lg shadow-lg text-center">
      <h2 className="text-xl font-bold mb-2">Room Code</h2>
      <p className="text-4xl font-mono bg-gray-100 p-4 rounded select-all cursor-pointer">
        {gameStore.roomCode}
      </p>
      <p className="text-sm text-gray-500 mt-2">Click to copy</p>
    </div>
  );
};