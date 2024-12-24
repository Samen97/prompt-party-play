import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useGameStore } from "@/store/gameStore";

interface PromptSubmissionProps {
  onSubmitPrompts: (prompts: string[]) => void;
  requiredPrompts?: number;
}

export const PromptSubmission = ({
  onSubmitPrompts,
  requiredPrompts = 2,
}: PromptSubmissionProps) => {
  const [prompts, setPrompts] = useState<string[]>([""]);
  const gameStore = useGameStore();

  if (gameStore.isHost) {
    return (
      <div className="space-y-6 w-full max-w-md mx-auto p-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-center">Waiting for Players</h2>
          <p className="text-center text-gray-600">
            As the host, you'll wait for other players to submit their prompts
          </p>
        </div>
      </div>
    );
  }

  const handleAddPrompt = () => {
    if (prompts.length < requiredPrompts) {
      setPrompts([...prompts, ""]);
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const handleSubmit = () => {
    if (prompts.length < requiredPrompts) {
      toast.error(`Please enter ${requiredPrompts} prompts`);
      return;
    }

    if (prompts.some((prompt) => !prompt.trim())) {
      toast.error("Please fill in all prompts");
      return;
    }

    if (prompts.some(prompt => prompt.trim().length < 3)) {
      toast.error("Each prompt must be at least 3 characters long");
      return;
    }

    // Add "A child's drawing of" prefix when submitting
    const formattedPrompts = prompts.map(prompt => 
      `A child's drawing of ${prompt.trim()}`
    );

    onSubmitPrompts(formattedPrompts);
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Enter Your Prompts</h2>
        <p className="text-center text-gray-600">
          Create {requiredPrompts} unique prompts for AI image generation
        </p>
        <p className="text-center text-sm text-gray-500">
          All prompts will start with "A child's drawing of". Be creative and descriptive!
        </p>
      </div>

      <div className="space-y-4">
        {prompts.map((prompt, index) => (
          <div key={index} className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
              <Input
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                placeholder="Enter a detailed description..."
                className="flex-1"
              />
            </div>
            <p className="text-xs text-gray-500 ml-8">
              Example: "a happy dinosaur playing with a red ball in a sunny park"
            </p>
          </div>
        ))}

        {prompts.length < requiredPrompts && (
          <Button
            onClick={handleAddPrompt}
            variant="outline"
            className="w-full"
          >
            Add Prompt ({prompts.length}/{requiredPrompts})
          </Button>
        )}

        {prompts.length === requiredPrompts && (
          <Button
            onClick={handleSubmit}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Submit Prompts
          </Button>
        )}
      </div>
    </div>
  );
};