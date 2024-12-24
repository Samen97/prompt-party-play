import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { useGameRound } from "@/hooks/useGameRound";
import { useEffect } from "react";

interface GameRoundProps {
  imageUrl: string;
  options: string[];
  onSubmitGuess: (guess: string) => void;
}

export const GameRound = ({
  imageUrl,
  options,
  onSubmitGuess,
}: GameRoundProps) => {
  const gameStore = useGameStore();
  const {
    selectedOption,
    setSelectedOption,
    hasAnswered,
    isProcessing,
    handleSubmit,
  } = useGameRound(imageUrl, onSubmitGuess);

  const currentRoundImage = gameStore.getRoundImage(gameStore.currentRound);

  useEffect(() => {
    console.log('GameRound rendered with:', {
      round: gameStore.currentRound,
      imageUrl: currentRoundImage,
      hasOptions: options?.length > 0
    });

    if (!currentRoundImage) {
      console.error('No image URL provided for round:', gameStore.currentRound);
    }
  }, [currentRoundImage, options, gameStore.currentRound]);

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">Which prompt created this image?</h2>
        <p className="text-gray-600">
          Round {gameStore.currentRound} of {gameStore.totalRounds}
        </p>
      </div>

      <div className="aspect-square w-full max-w-2xl mx-auto">
        {currentRoundImage ? (
          <img
            src={currentRoundImage}
            alt="AI Generated Image"
            className="w-full h-full object-cover rounded-lg shadow-lg"
            onError={(e) => {
              console.error('Image failed to load:', currentRoundImage);
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-lg">
            <p className="text-gray-500">Loading image...</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {options.map((option, index) => (
          <Card
            key={index}
            className={`p-4 cursor-pointer transition-all ${
              selectedOption === option
                ? "border-primary border-2"
                : "hover:border-gray-400"
            }`}
            onClick={() => !hasAnswered && setSelectedOption(option)}
          >
            <p className="text-lg">{option}</p>
          </Card>
        ))}
      </div>

      <Button
        onClick={handleSubmit}
        disabled={!selectedOption || hasAnswered || isProcessing || gameStore.isHost}
        className="w-full max-w-md mx-auto bg-primary hover:bg-primary/90"
      >
        {gameStore.isHost
          ? "Host Cannot Guess"
          : isProcessing
          ? "Processing..."
          : hasAnswered
          ? "Waiting for other players..."
          : "Submit Guess"}
      </Button>
    </div>
  );
};