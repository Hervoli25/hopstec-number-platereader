import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Camera, X, Check } from "lucide-react";
import { CameraCapture } from "@/components/camera-capture";

interface PhotoCheckpointDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stageName: string;
  onConfirm: (photo?: string) => void;
  isOptional?: boolean;
}

export function PhotoCheckpointDialog({ 
  open, 
  onOpenChange, 
  stageName,
  onConfirm,
  isOptional = true
}: PhotoCheckpointDialogProps) {
  const [showCamera, setShowCamera] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  const handleCapture = (imageData: string) => {
    setCapturedPhoto(imageData);
    setShowCamera(false);
  };

  const handleConfirm = () => {
    onConfirm(capturedPhoto || undefined);
    // Reset state
    setCapturedPhoto(null);
    setShowCamera(false);
  };

  const handleSkip = () => {
    onConfirm(undefined);
    // Reset state
    setCapturedPhoto(null);
    setShowCamera(false);
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    setShowCamera(true);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => {
          setShowCamera(false);
          if (!capturedPhoto && !isOptional) {
            // If photo is required and no photo captured, don't close the dialog
            return;
          }
        }}
      />
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Photo for {stageName}?</DialogTitle>
          <DialogDescription>
            {isOptional 
              ? "You can optionally add a photo to document this stage of the wash process."
              : "A photo is required for this stage of the wash process."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {capturedPhoto ? (
            <div className="space-y-3">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img 
                  src={capturedPhoto} 
                  alt="Captured photo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={handleRetake}
                  data-testid="button-retake-photo"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Retake
                </Button>
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setCapturedPhoto(null)}
                  data-testid="button-remove-photo"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <Button 
              variant="outline" 
              className="w-full h-24"
              onClick={() => setShowCamera(true)}
              data-testid="button-take-photo"
            >
              <Camera className="mr-2 h-5 w-5" />
              Take Photo
            </Button>
          )}
        </div>

        <DialogFooter>
          {isOptional && (
            <Button 
              variant="outline" 
              onClick={handleSkip}
              data-testid="button-skip-photo"
            >
              Skip
            </Button>
          )}
          <Button 
            onClick={handleConfirm}
            disabled={!isOptional && !capturedPhoto}
            data-testid="button-confirm-photo"
          >
            <Check className="mr-2 h-4 w-4" />
            {capturedPhoto ? "Confirm with Photo" : "Continue without Photo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

