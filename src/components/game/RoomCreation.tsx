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
  const [testImages, setTestImages] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateRandomUsername = () => {
    const adjectives = ['Happy', 'Lucky', 'Clever', 'Bright', 'Swift'];
    const nouns = ['Panda', 'Tiger', 'Dragon', 'Phoenix', 'Unicorn'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(Math.random() * 1000);
    return `${randomAdjective}${randomNoun}${randomNumber}`;
  };

  const handleCreateRoom = () => {
    const generatedUsername = generateRandomUsername();
    onCreateRoom(generatedUsername);
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
    const testPrompts = [
      "A child's drawing of a friendly dragon having a tea party",
      "A child's drawing of a spaceship landing in a garden full of flowers"
    ];
    
    try {
      toast.info("Starting image generation test...");
      console.log('Testing image generation with prompts:', testPrompts);
      
      const images = await Promise.all(
        testPrompts.map(async (prompt, index) => {
          console.log(`Generating image ${index + 1}/${testPrompts.length}`);
          try {
            const imageUrl = await generateImage(prompt);
            console.log(`Successfully generated image ${index + 1}:`, imageUrl);
            return imageUrl;
          } catch (error) {
            console.error(`Failed to generate image ${index + 1}:`, error);
            throw error;
          }
        })
      );

      setTestImages(images);
      toast.success("Test images generated successfully!");
    } catch (error) {
      console.error('Test image generation error:', error);
      toast.error(`Failed to generate test images: ${error.message}`);
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
        {isJoining ? (
          <>
            <Input
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full"
            />
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
                  {isGenerating ? "Generating Test Images..." : "Generate Test Images"}
                </Button>
                {testImages.map((image, index) => (
                  <div key={index} className="mt-4">
                    <h3 className="text-lg font-semibold mb-2">Test Image {index + 1}</h3>
                    <img
                      src={image}
                      alt={`Test generated image ${index + 1}`}
                      className="w-full rounded-lg shadow-lg"
                    />
                  </div>
                ))}
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