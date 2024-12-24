import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";

interface PromptSubmissionProps {
  onSubmitPrompts: (prompts: string[]) => void;
}

export const PromptSubmission = ({ onSubmitPrompts }: PromptSubmissionProps) => {
  const gameStore = useGameStore();
  const [prompts, setPrompts] = useState<string[]>(['']);
  const promptsRequired = 2; // Each player submits 2 prompts

  const handleAddPrompt = () => {
    if (prompts.length < promptsRequired) {
      setPrompts([...prompts, '']);
    }
  };

  const handlePromptChange = (index: number, value: string) => {
    const newPrompts = [...prompts];
    newPrompts[index] = value;
    setPrompts(newPrompts);
  };

  const handleSubmit = () => {
    if (prompts.every(prompt => prompt.trim())) {
      onSubmitPrompts(prompts);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-4xl mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Submit Your Drawing Prompts</h2>
        <p className="text-center text-gray-600">
          Enter {promptsRequired} prompts for drawings that will be created by AI
        </p>
      </div>

      <Card className="p-6">
        <div className="space-y-4">
          {prompts.map((prompt, index) => (
            <div key={index} className="space-y-2">
              <label className="text-sm font-medium">
                Prompt {index + 1} of {promptsRequired}
              </label>
              <Input
                value={prompt}
                onChange={(e) => handlePromptChange(index, e.target.value)}
                placeholder="Enter a drawing prompt..."
                className="w-full"
              />
            </div>
          ))}

          {prompts.length < promptsRequired && (
            <Button
              onClick={handleAddPrompt}
              variant="outline"
              className="w-full"
            >
              Add Another Prompt
            </Button>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!prompts.every(prompt => prompt.trim()) || prompts.length < promptsRequired}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Submit Prompts
          </Button>
        </div>
      </Card>
    </div>
  );
};