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

  // If user is host, don't show the prompt submission form
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
    newPrompts[index] = value.startsWith("A child's drawing of") ? value : `A child's drawing of ${value}`;
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

    onSubmitPrompts(prompts);
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Enter Your Prompts</h2>
        <p className="text-center text-gray-600">
          Create {requiredPrompts} unique prompts for AI image generation
        </p>
        <p className="text-center text-sm text-gray-500">
          All prompts will start with "A child's drawing of"
        </p>
      </div>

      <div className="space-y-4">
        {prompts.map((prompt, index) => (
          <div key={index} className="flex items-center space-x-2">
            <span className="text-sm text-gray-500 w-6">{index + 1}.</span>
            <Input
              value={prompt.replace("A child's drawing of", "").trim()}
              onChange={(e) => handlePromptChange(index, e.target.value)}
              placeholder="Enter what to draw..."
              className="flex-1"
            />
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