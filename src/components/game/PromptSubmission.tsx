import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useGameStore } from "@/store/gameStore";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface PromptSubmissionProps {
  onSubmitPrompts: (prompts: string[]) => void;
}

export const PromptSubmission = ({ onSubmitPrompts }: PromptSubmissionProps) => {
  const gameStore = useGameStore();
  const [prompts, setPrompts] = useState<string[]>(['']);
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  const handleSubmit = async () => {
    if (!prompts.every(prompt => prompt.trim())) {
      toast.error("Please fill in all prompts");
      return;
    }

    try {
      setIsSubmitting(true);
      
      // Get the current room data
      const { data: roomData } = await supabase
        .from('game_rooms')
        .select()
        .eq('code', gameStore.roomCode)
        .single();

      if (!roomData) {
        throw new Error('Room not found');
      }

      // Get the current player
      const { data: playerData } = await supabase
        .from('game_players')
        .select()
        .eq('room_id', roomData.id)
        .eq('username', gameStore.players[gameStore.players.length - 1].username)
        .single();

      if (!playerData) {
        throw new Error('Player not found');
      }

      // Submit each prompt with its round number
      await Promise.all(prompts.map(async (prompt, index) => {
        const roundNumber = index + 1; // First prompt is round 1, second is round 2
        await supabase
          .from('game_prompts')
          .insert([{
            room_id: roomData.id,
            player_id: playerData.id,
            prompt: prompt,
            round_number: roundNumber
          }]);
      }));

      await onSubmitPrompts(prompts);
      toast.success("Prompts submitted successfully!");
    } catch (error) {
      console.error('Error submitting prompts:', error);
      toast.error("Failed to submit prompts. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-lg font-medium">Generating your images...</p>
        <p className="text-sm text-gray-500">Please wait while we process your prompts</p>
      </div>
    );
  }

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
            disabled={!prompts.every(prompt => prompt.trim()) || prompts.length < promptsRequired || isSubmitting}
            className="w-full bg-primary hover:bg-primary/90"
          >
            Submit Prompts
          </Button>
        </div>
      </Card>
    </div>
  );
};