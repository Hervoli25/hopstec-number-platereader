import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CameraCapture } from "@/components/camera-capture";
import { PlateConfirmDialog } from "@/components/plate-confirm-dialog";
import { CustomerUrlDialog } from "@/components/customer-url-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Camera, Keyboard, Loader2, Car, Sparkles, CircleDot, Star } from "lucide-react";
import type { CountryHint, ServiceCode } from "@shared/schema";
import { SERVICE_TYPE_CONFIG, SERVICE_CODES } from "@shared/schema";

export default function ScanCarwash() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCamera, setShowCamera] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCustomerUrl, setShowCustomerUrl] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<{ plate: string; confidence: number }[]>([]);
  const [createdJob, setCreatedJob] = useState<{ id: string; customerUrl: string; plateDisplay: string } | null>(null);
  const [showServiceSelect, setShowServiceSelect] = useState(false);
  const [selectedServiceCode, setSelectedServiceCode] = useState<ServiceCode>("STANDARD");
  const [pendingPlate, setPendingPlate] = useState<{ plate: string; countryHint: CountryHint } | null>(null);

  const SERVICE_ICONS: Record<ServiceCode, typeof Car> = {
    STANDARD: Car,
    RIM_ONLY: CircleDot,
    TYRE_SHINE_ONLY: Sparkles,
    FULL_VALET: Star,
  };

  const createJobMutation = useMutation({
    mutationFn: async ({ plate, countryHint, photo, serviceCode }: { plate: string; countryHint: CountryHint; photo?: string; serviceCode: ServiceCode }) => {
      const res = await apiRequest("POST", "/api/wash-jobs", {
        plateDisplay: plate,
        countryHint,
        photo,
        serviceCode,
      });
      return res.json();
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
      setCreatedJob(job);
      setShowCustomerUrl(true);
      toast({
        title: "Wash job created",
        description: `Job started for plate ${job.plateDisplay}`,
      });
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
    
    // Try OCR (in real app, this would call the backend)
    // For MVP, we'll show empty candidates and let user type
    setCandidates([]);
    setShowConfirm(true);
  };

  const handleManualEntry = () => {
    setCapturedImage(null);
    setCandidates([]);
    setShowConfirm(true);
  };

  const handleConfirmPlate = (plate: string, countryHint: CountryHint) => {
    setShowConfirm(false);
    setPendingPlate({ plate, countryHint });
    setShowServiceSelect(true);
  };

  const handleServiceSelect = (code: ServiceCode) => {
    setSelectedServiceCode(code);
    setShowServiceSelect(false);
    if (pendingPlate) {
      createJobMutation.mutate({
        plate: pendingPlate.plate,
        countryHint: pendingPlate.countryHint,
        photo: capturedImage || undefined,
        serviceCode: code,
      });
    }
  };

  if (showCamera) {
    return (
      <CameraCapture
        onCapture={handleCapture}
        onCancel={() => setShowCamera(false)}
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
          <h1 className="font-semibold">Start Carwash</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Scan License Plate</h2>
            <p className="text-muted-foreground">
              Capture or enter the vehicle's license plate
            </p>
          </div>

          <Card 
            className="p-8 text-center hover-elevate active-elevate-2 cursor-pointer border-dashed border-2"
            onClick={() => setShowCamera(true)}
            data-testid="card-open-camera"
          >
            <Camera className="w-16 h-16 mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Capture Plate Photo</h3>
            <p className="text-muted-foreground text-sm">
              Take a photo of the plate, then enter the plate number
            </p>
          </Card>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">or</span>
            </div>
          </div>

          <Button 
            variant="outline" 
            className="w-full h-16 text-lg"
            onClick={handleManualEntry}
            data-testid="button-manual-entry"
          >
            <Keyboard className="mr-3 h-5 w-5" />
            Enter Manually
          </Button>
        </motion.div>
      </main>

      <PlateConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        candidates={candidates}
        capturedImage={capturedImage || undefined}
        onConfirm={handleConfirmPlate}
      />

      {createdJob && (
        <CustomerUrlDialog
          open={showCustomerUrl}
          onOpenChange={(open) => {
            setShowCustomerUrl(open);
            if (!open && createdJob) {
              setLocation(`/wash-job/${createdJob.id}`);
            }
          }}
          customerUrl={createdJob.customerUrl}
          plateDisplay={createdJob.plateDisplay}
        />
      )}

      {/* Service Type Selection */}
      {showServiceSelect && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-1">Select Service</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {pendingPlate?.plate}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {SERVICE_CODES.map(code => {
                const cfg = SERVICE_TYPE_CONFIG[code];
                const Icon = SERVICE_ICONS[code];
                return (
                  <Card
                    key={code}
                    className="p-4 text-center cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors"
                    onClick={() => handleServiceSelect(code)}
                  >
                    <Icon className="w-8 h-8 mx-auto mb-2 text-primary" />
                    <p className="font-medium text-sm">{cfg.label}</p>
                    <p className="text-xs text-muted-foreground mt-1">{cfg.description}</p>
                    {cfg.mode === "timer" && (
                      <Badge variant="secondary" className="mt-2 text-xs">Timer</Badge>
                    )}
                  </Card>
                );
              })}
            </div>
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={() => setShowServiceSelect(false)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}

      {createJobMutation.isPending && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="p-6 flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Creating wash job...</span>
          </Card>
        </div>
      )}
    </div>
  );
}
