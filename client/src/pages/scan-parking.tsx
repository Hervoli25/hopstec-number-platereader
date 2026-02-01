import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraCapture } from "@/components/camera-capture";
import { PlateConfirmDialog } from "@/components/plate-confirm-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Camera, Keyboard, Loader2, LogIn, LogOut } from "lucide-react";
import type { CountryHint } from "@shared/schema";

type ParkingAction = "entry" | "exit";

export default function ScanParking() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<{ plate: string; confidence: number }[]>([]);
  const [action, setAction] = useState<ParkingAction | null>(null);

  const parkingMutation = useMutation({
    mutationFn: async ({ 
      plate, 
      countryHint, 
      photo, 
      action 
    }: { 
      plate: string; 
      countryHint: CountryHint; 
      photo?: string;
      action: ParkingAction;
    }) => {
      const endpoint = action === "entry" ? "/api/parking/entry" : "/api/parking/exit";
      const res = await apiRequest("POST", endpoint, { 
        plateDisplay: plate, 
        countryHint,
        photo 
      });
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking"] });
      toast({
        title: variables.action === "entry" ? "Vehicle entered" : "Vehicle exited",
        description: `Plate ${variables.plate} recorded successfully`,
      });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleCapture = async (imageData: string) => {
    setCapturedImage(imageData);
    setShowCamera(false);
    setCandidates([]);
    setShowConfirm(true);
  };

  const handleManualEntry = () => {
    setCapturedImage(null);
    setCandidates([]);
    setShowConfirm(true);
  };

  const handleConfirmPlate = (plate: string, countryHint: CountryHint) => {
    if (!action) return;
    setShowConfirm(false);
    parkingMutation.mutate({ plate, countryHint, photo: capturedImage || undefined, action });
  };

  const startScan = (selectedAction: ParkingAction) => {
    setAction(selectedAction);
    setShowCamera(true);
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => { setShowCamera(false); setAction(null); }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Parking Scan</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        {!action ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">Parking Action</h2>
              <p className="text-muted-foreground">
                Select entry or exit for the vehicle
              </p>
            </div>

            <div className="grid gap-4">
              <Card 
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20"
                onClick={() => startScan("entry")}
                data-testid="card-parking-entry"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                    <LogIn className="w-7 h-7 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Vehicle Entry</h3>
                    <p className="text-muted-foreground">Scan plate for new parking session</p>
                  </div>
                </div>
              </Card>

              <Card 
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20"
                onClick={() => startScan("exit")}
                data-testid="card-parking-exit"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-orange-500/20 flex items-center justify-center">
                    <LogOut className="w-7 h-7 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold">Vehicle Exit</h3>
                    <p className="text-muted-foreground">Close existing parking session</p>
                  </div>
                </div>
              </Card>
            </div>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">or enter manually</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Button 
                variant="outline" 
                className="h-14"
                onClick={() => { setAction("entry"); handleManualEntry(); }}
                data-testid="button-manual-entry-in"
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Entry
              </Button>
              <Button 
                variant="outline" 
                className="h-14"
                onClick={() => { setAction("exit"); handleManualEntry(); }}
                data-testid="button-manual-exit-in"
              >
                <Keyboard className="mr-2 h-4 w-4" />
                Exit
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">
                {action === "entry" ? "Vehicle Entry" : "Vehicle Exit"}
              </h2>
              <p className="text-muted-foreground">
                Capture or enter the license plate
              </p>
            </div>

            <Card 
              className="p-8 text-center hover-elevate active-elevate-2 cursor-pointer border-dashed border-2"
              onClick={() => setShowCamera(true)}
              data-testid="card-open-camera"
            >
              <Camera className="w-16 h-16 mx-auto mb-4 text-primary" />
              <h3 className="text-lg font-semibold mb-2">Take Photo</h3>
              <p className="text-muted-foreground">
                Use camera to capture license plate
              </p>
            </Card>

            <Button 
              variant="outline" 
              className="w-full h-14"
              onClick={handleManualEntry}
              data-testid="button-manual-entry"
            >
              <Keyboard className="mr-3 h-5 w-5" />
              Enter Manually
            </Button>
          </motion.div>
        )}
      </main>

      <PlateConfirmDialog
        open={showConfirm}
        onOpenChange={(open) => { setShowConfirm(open); if (!open) setAction(null); }}
        candidates={candidates}
        capturedImage={capturedImage || undefined}
        onConfirm={handleConfirmPlate}
      />

      {parkingMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="p-6 flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Recording {action}...</span>
          </Card>
        </div>
      )}
    </div>
  );
}
