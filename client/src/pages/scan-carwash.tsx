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
import { ArrowLeft, Camera, Keyboard, Loader2, Car, Sparkles, CircleDot, Star, Award, Lightbulb } from "lucide-react";
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
  const [showMembershipInfo, setShowMembershipInfo] = useState(false);
  const [customerLookup, setCustomerLookup] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const SERVICE_ICONS: Record<ServiceCode, typeof Car> = {
    STANDARD: Car,
    RIM_ONLY: CircleDot,
    TYRE_SHINE_ONLY: Sparkles,
    HEADLIGHT_RESTORATION: Lightbulb,
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

  const handleConfirmPlate = async (plate: string, countryHint: CountryHint) => {
    setShowConfirm(false);
    setPendingPlate({ plate, countryHint });

    // Lookup customer membership/loyalty by plate
    setIsLookingUp(true);
    try {
      const res = await fetch(`/api/customer/lookup-by-plate?plate=${encodeURIComponent(plate)}`, {
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCustomerLookup(data);
        setIsLookingUp(false);
        setShowMembershipInfo(true);
        return;
      }
    } catch (err) {
      console.error("Customer lookup failed:", err);
    }
    setIsLookingUp(false);
    setShowServiceSelect(true);
  };

  const handleMembershipContinue = () => {
    setShowMembershipInfo(false);
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

      {/* Membership/Loyalty Info Screen */}
      {showMembershipInfo && customerLookup && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-md w-full">
            <div className="text-center mb-4">
              {customerLookup.isRegistered ? (
                <Badge className="bg-green-500 text-white mb-2">Registered Member</Badge>
              ) : (
                <Badge variant="secondary" className="mb-2">New Customer</Badge>
              )}
              <h3 className="text-lg font-semibold">
                {customerLookup.crmCustomer?.customerName || customerLookup.crmMembership?.customerName || "Customer"}
              </h3>
              <p className="text-sm text-muted-foreground font-mono">{pendingPlate?.plate}</p>
            </div>

            {customerLookup.crmMembership && (
              <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-2">
                <div className="flex items-center gap-2 mb-2">
                  <Award className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-semibold">Membership</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Member ID</span>
                  <span className="font-mono font-semibold text-xs">{customerLookup.crmMembership.memberNumber}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tier</span>
                  <Badge variant="outline">{customerLookup.crmMembership.tierName}</Badge>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="font-semibold">{Math.round(customerLookup.crmMembership.discountRate * 100)}%</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Points Balance</span>
                  <span className="font-bold text-primary">{customerLookup.crmMembership.loyaltyPoints}</span>
                </div>
                {customerLookup.crmMembership.loyaltyMultiplier > 1 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points Multiplier</span>
                    <Badge className="bg-amber-500 text-white">{customerLookup.crmMembership.loyaltyMultiplier}x</Badge>
                  </div>
                )}
              </div>
            )}

            {customerLookup.crmSubscription && (
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4 mb-4 space-y-2">
                <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">Active Subscription</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Plan</span>
                  <span>{customerLookup.crmSubscription.planName}</span>
                </div>
                {customerLookup.crmSubscription.washesRemaining !== null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Washes Remaining</span>
                    <span className="font-semibold">{customerLookup.crmSubscription.washesRemaining}</span>
                  </div>
                )}
              </div>
            )}

            {!customerLookup.crmMembership && !customerLookup.isRegistered && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 mb-4">
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  Not a registered member — points won't be earned for this wash. Customer can register at the CRM website.
                </p>
              </div>
            )}

            <Button className="w-full" onClick={handleMembershipContinue}>
              Continue to Service Selection
            </Button>
          </Card>
        </div>
      )}

      {/* Customer Lookup Loading */}
      {isLookingUp && (
        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
          <Card className="p-6 flex items-center gap-4">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span>Looking up customer...</span>
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
