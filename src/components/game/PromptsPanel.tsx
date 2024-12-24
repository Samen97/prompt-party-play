import { ScrollArea } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { GamePrompt } from "@/types/game";

interface PromptsPanelProps {
  prompts: GamePrompt[];
}

export const PromptsPanel = ({ prompts }: PromptsPanelProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Submitted Prompts</h3>
      <ScrollArea className="h-[300px] pr-4">
        <div className="space-y-4">
          {prompts.map((prompt) => (
            <div key={prompt.id} className="space-y-2 p-3 bg-gray-50 rounded">
              <p className="text-sm font-medium text-gray-600">
                From: {prompt.player_username}
              </p>
              <p className="text-sm">{prompt.prompt}</p>
              {prompt.image_url && (
                <img 
                  src={prompt.image_url} 
                  alt={prompt.prompt}
                  className="w-full h-32 object-cover rounded"
                />
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </Card>
  );
};