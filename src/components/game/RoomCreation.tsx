import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface RoomCreationProps {
  onCreateRoom: (username: string) => void;
  onJoinRoom: (username: string, roomCode: string) => void;
}

export const RoomCreation = ({ onCreateRoom, onJoinRoom }: RoomCreationProps) => {
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);

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
          <Input
            placeholder="Enter room code"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            className="w-full"
          />
        ) : null}

        <div className="space-y-2">
          {!isJoining ? (
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
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
};