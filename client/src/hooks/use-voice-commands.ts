import { useState, useEffect, useCallback, useRef } from "react";

type VoiceCommand = "next" | "complete";

interface UseVoiceCommandsOptions {
  onCommand: (command: VoiceCommand) => void;
  enabled: boolean;
}

// Extend Window for SpeechRecognition
interface SpeechRecognitionEvent {
  results: { [key: number]: { [key: number]: { transcript: string } } };
  resultIndex: number;
}

const NEXT_PATTERNS = /\b(next|advance|forward|step)\b/i;
const COMPLETE_PATTERNS = /\b(done|complete|finish|finished)\b/i;

export function useVoiceCommands({ onCommand, enabled }: UseVoiceCommandsOptions) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);
  const onCommandRef = useRef(onCommand);
  onCommandRef.current = onCommand;

  const isSupported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const startListening = useCallback(() => {
    if (!isSupported || !enabled) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const last = event.results[Object.keys(event.results).length - 1];
      const text = last?.[0]?.transcript?.trim() || "";
      setTranscript(text);

      if (NEXT_PATTERNS.test(text)) {
        onCommandRef.current("next");
      } else if (COMPLETE_PATTERNS.test(text)) {
        onCommandRef.current("complete");
      }
    };

    recognition.onend = () => {
      // Auto-restart if still supposed to be listening
      if (recognitionRef.current === recognition) {
        try {
          recognition.start();
        } catch {
          setIsListening(false);
        }
      }
    };

    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") {
        setIsListening(false);
        recognitionRef.current = null;
      }
      // For other errors (network, etc.), onend will auto-restart
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsListening(true);
      setTranscript("");
    } catch {
      setIsListening(false);
    }
  }, [isSupported, enabled]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      const recognition = recognitionRef.current;
      recognitionRef.current = null;
      try {
        recognition.stop();
      } catch {
        // ignore
      }
    }
    setIsListening(false);
    setTranscript("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  // Clean up on unmount or when disabled
  useEffect(() => {
    if (!enabled && isListening) {
      stopListening();
    }
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [enabled]);

  return {
    isSupported,
    isListening,
    transcript,
    toggleListening,
    startListening,
    stopListening,
  };
}
