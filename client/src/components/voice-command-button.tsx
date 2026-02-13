import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface VoiceCommandButtonProps {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  onToggle: () => void;
}

export function VoiceCommandButton({ isListening, isSupported, transcript, onToggle }: VoiceCommandButtonProps) {
  if (!isSupported) return null;

  return (
    <div className="flex items-center gap-2">
      {isListening && transcript && (
        <Badge variant="secondary" className="text-xs max-w-[120px] truncate">
          {transcript}
        </Badge>
      )}
      <Button
        variant={isListening ? "destructive" : "outline"}
        size="icon"
        onClick={onToggle}
        className={`relative h-9 w-9 ${isListening ? "animate-pulse" : ""}`}
        title={isListening ? "Stop listening" : "Start voice commands"}
      >
        {isListening ? (
          <Mic className="h-4 w-4" />
        ) : (
          <MicOff className="h-4 w-4" />
        )}
        {isListening && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500 animate-ping" />
        )}
      </Button>
    </div>
  );
}
