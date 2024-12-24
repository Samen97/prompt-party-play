import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { generateImage } from "@/services/openai";

interface RoomCreationProps {
  onCreateRoom: (username: string) => void;
  onJoinRoom: (username: string, roomCode: string) => void;
}

export const RoomCreation = ({ onCreateRoom, onJoinRoom }: RoomCreationProps) => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [testImage, setTestImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleCreateRoom = () => {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    onCreateRoom(username);
  };

  const handleJoinRoom = () => {
    if (!username.trim()) {
      toast.error("Please enter a username");
      return;
    }
    if (!roomCode.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    onJoinRoom(username, roomCode);
  };

  const handleTestGeneration = async () => {
    setIsGenerating(true);
    try {
      const imageUrl = await generateImage("A cute cartoon robot playing with colorful building blocks");
      setTestImage(imageUrl);
      toast.success("Test image generated successfully!");
    } catch (error) {
      console.error('Test image generation error:', error);
      toast.error("Failed to generate test image. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 w-full max-w-md mx-auto p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-center">Welcome to PromptParty!</h2>
        <p className="text-center text-gray-600">Create or join a room to start playing</p>
      </div>

      <div className="space-y-4">
        <Input
          placeholder="Enter your username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full"
        />

        {isJoining ? (
          <>
            <Input
              placeholder="Enter room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              className="w-full"
            />
            <div className="space-y-4">
              <Button
                onClick={handleJoinRoom}
                className="w-full bg-primary hover:bg-primary/90"
              >
                Join Room
              </Button>
              <Button
                onClick={() => setIsJoining(false)}
                variant="outline"
                className="w-full"
              >
                Back
              </Button>
              <div className="space-y-4">
                <Button
                  onClick={handleTestGeneration}
                  variant="outline"
                  className="w-full"
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating Test Image..." : "Generate Test Image"}
                </Button>
                {testImage && (
                  <div className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Test Image</h3>
                    <img
                      src={testImage}
                      alt="Test generated image"
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <>
            <Button
              onClick={handleCreateRoom}
              className="w-full bg-primary hover:bg-primary/90"
            >
              Create Room
            </Button>
            <Button
              onClick={() => setIsJoining(true)}
              variant="outline"
              className="w-full"
            >
              Join Existing Room
            </Button>
          </>
        )}
      </div>
    </div>
  );
};