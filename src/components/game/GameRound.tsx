import { useEffect } from "react";
import { useGameStore } from "@/store/gameStore";
import { GameProgress } from "./GameProgress";
import { Button } from "@/components/ui/button";
import { useGameRound } from "@/hooks/useGameRound";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface GameRoundProps {
  imageUrl: string;
  options: string[];
  onSubmitGuess: (guess: string) => void;
}

export const GameRound = ({ imageUrl, options, onSubmitGuess }: GameRoundProps) => {
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
      console.log('Waiting for image for round:', gameStore.currentRound);
    }
  }, [currentRoundImage, options, gameStore.currentRound]);

  if (!currentRoundImage || !options?.length) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Loading round {gameStore.currentRound}...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <GameProgress />
      
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">What was the prompt for this image?</h2>
        <p className="text-gray-600">Select the correct prompt that was used to generate this image</p>
      </div>

      <div className="aspect-square w-full max-w-2xl mx-auto">
        <Card className="w-full h-full overflow-hidden">
          <img
            src={currentRoundImage}
            alt="AI Generated Image"
            className="w-full h-full object-cover"
            onError={(e) => {
              console.error('Image failed to load:', currentRoundImage);
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
        {options.map((option, index) => (
          <Button
            key={index}
            variant={selectedOption === option ? "default" : "outline"}
            className={`p-4 h-auto text-lg ${
              hasAnswered ? 'cursor-not-allowed' : ''
            }`}
            onClick={() => !hasAnswered && setSelectedOption(option)}
            disabled={hasAnswered || isProcessing}
          >
            {option}
          </Button>
        ))}
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleSubmit}
          disabled={!selectedOption || hasAnswered || isProcessing}
          className="px-8 py-2"
        >
          {isProcessing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Answer'
          )}
        </Button>
      </div>
    </div>
  );
};