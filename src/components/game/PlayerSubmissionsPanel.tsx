import { Card } from "@/components/ui/card";
import { PlayerSubmission } from "@/types/game";

interface PlayerSubmissionsPanelProps {
  playerSubmissions: PlayerSubmission[];
}

export const PlayerSubmissionsPanel = ({ playerSubmissions }: PlayerSubmissionsPanelProps) => {
  return (
    <Card className="p-6">
      <h3 className="text-xl font-semibold mb-4">Player Submissions</h3>
      <div className="space-y-2">
        {playerSubmissions.map((player, index) => (
          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
            <span>{player.username}</span>
            <span className={`px-3 py-1 rounded text-sm ${
              player.hasSubmitted 
                ? 'bg-green-100 text-green-800' 
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {player.hasSubmitted ? 'Submitted' : 'Waiting'}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};