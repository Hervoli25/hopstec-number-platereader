import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, RotateCcw, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraCaptureProps {
  onCapture: (imageData: string) => void;
  onCancel: () => void;
}

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("Could not access camera. Please grant permission or enter plate manually.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  }, []);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedImage(imageData);
      stopCamera();
    }
  }, [stopCamera]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    startCamera();
  }, [startCamera]);

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage);
    }
  }, [capturedImage, onCapture]);

  // Start camera on mount
  useState(() => {
    startCamera();
    return () => stopCamera();
  });

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold">Capture License Plate</h2>
        <Button variant="ghost" size="icon" onClick={() => { stopCamera(); onCancel(); }} data-testid="button-camera-cancel">
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex-1 relative bg-black overflow-hidden">
        <AnimatePresence mode="wait">
          {error ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center p-6"
            >
              <Card className="p-6 text-center max-w-sm">
                <Camera className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">{error}</p>
                <div className="flex gap-2 justify-center">
                  <Button onClick={startCamera} data-testid="button-retry-camera">
                    Try Again
                  </Button>
                  <Button variant="outline" onClick={onCancel} data-testid="button-skip-camera">
                    Enter Manually
                  </Button>
                </div>
              </Card>
            </motion.div>
          ) : capturedImage ? (
            <motion.img
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              src={capturedImage}
              alt="Captured plate"
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <motion.video
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="absolute inset-0 w-full h-full object-cover"
            />
          )}
        </AnimatePresence>

        {isStreaming && !capturedImage && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] max-w-md aspect-[3/1] border-2 border-primary/70 rounded-lg">
              <div className="absolute -top-8 left-0 right-0 text-center">
                <span className="text-xs text-white bg-black/50 px-2 py-1 rounded">
                  Align plate within frame
                </span>
              </div>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      <div className="p-4 bg-background border-t border-border">
        {capturedImage ? (
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1"
              onClick={retakePhoto}
              data-testid="button-retake-photo"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Retake
            </Button>
            <Button
              className="flex-1"
              onClick={confirmPhoto}
              data-testid="button-confirm-photo"
            >
              <Check className="mr-2 h-4 w-4" />
              Use Photo
            </Button>
          </div>
        ) : (
          <Button
            size="lg"
            className="w-full"
            onClick={capturePhoto}
            disabled={!isStreaming}
            data-testid="button-capture-photo"
          >
            <Camera className="mr-2 h-5 w-5" />
            Capture
          </Button>
        )}
      </div>
    </div>
  );
}
