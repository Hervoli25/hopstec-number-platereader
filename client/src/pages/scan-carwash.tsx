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
import { enqueueRequest } from "@/lib/offline-queue";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Camera, Keyboard, Loader2, Car, Award,
  Clock, ChevronRight, CheckCircle2
} from "lucide-react";
import type { CountryHint, VehicleSize } from "@shared/schema";
import { SERVICE_PACKAGES, SERVICE_TIER_COLORS, VEHICLE_SIZES } from "@shared/schema";
import type { ServiceTier } from "@shared/schema";

const VEHICLE_SIZE_LABELS: Record<VehicleSize, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

// Sort packages by price (small vehicle)
const PACKAGE_ORDER = Object.entries(SERVICE_PACKAGES).sort(
  ([, a], [, b]) => a.pricing.small - b.pricing.small
);

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
  const [showVehicleSize, setShowVehicleSize] = useState(false);
  const [selectedPackageCode, setSelectedPackageCode] = useState<string | null>(null);
  const [pendingPlate, setPendingPlate] = useState<{ plate: string; countryHint: CountryHint } | null>(null);
  const [showMembershipInfo, setShowMembershipInfo] = useState(false);
  const [customerLookup, setCustomerLookup] = useState<any>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const createJobMutation = useMutation({
    mutationFn: async ({ plate, countryHint, photo, servicePackageCode, vehicleSize }: {
      plate: string;
      countryHint: CountryHint;
      photo?: string;
      servicePackageCode: string;
      vehicleSize: VehicleSize;
    }) => {
      const payload = { plateDisplay: plate, countryHint, photo, servicePackageCode, vehicleSize };

      if (!navigator.onLine) {
        await enqueueRequest("POST", "/api/wash-jobs", payload);
        return { _queued: true, plateDisplay: plate } as any;
      }

      try {
        const res = await apiRequest("POST", "/api/wash-jobs", payload);
        return res.json();
      } catch (err) {
        if (err instanceof TypeError && err.message.includes("fetch")) {
          await enqueueRequest("POST", "/api/wash-jobs", payload);
          return { _queued: true, plateDisplay: plate } as any;
        }
        throw err;
      }
    },
    onSuccess: (job) => {
      if (job._queued) {
        toast({
          title: "Queued for sync",
          description: `Job for ${job.plateDisplay} will be created when back online`,
        });
        setLocation("/");
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
      setCreatedJob(job);
      setShowCustomerUrl(true);
      const pkg = selectedPackageCode ? SERVICE_PACKAGES[selectedPackageCode] : null;
      toast({
        title: "Wash job created",
        description: `${pkg?.label || "Job"} started for ${job.plateDisplay}`,
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

    try {
      const res = await fetch("/api/ocr/plate-candidates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: imageData }),
        credentials: "include",
      });
      if (res.ok) {
        const data = await res.json();
        setCandidates(data.candidates || []);
      } else {
        setCandidates([]);
      }
    } catch {
      setCandidates([]);
    }
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

  const handlePackageSelect = (code: string) => {
    setSelectedPackageCode(code);
    setShowServiceSelect(false);
    setShowVehicleSize(true);
  };

  const handleVehicleSizeSelect = (size: VehicleSize) => {
    setShowVehicleSize(false);
    if (pendingPlate && selectedPackageCode) {
      createJobMutation.mutate({
        plate: pendingPlate.plate,
        countryHint: pendingPlate.countryHint,
        photo: capturedImage || undefined,
        servicePackageCode: selectedPackageCode,
        vehicleSize: size,
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

  const selectedPkg = selectedPackageCode ? SERVICE_PACKAGES[selectedPackageCode] : null;

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

      {/* Service Package Selection */}
      {showServiceSelect && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 overflow-y-auto">
          <div className="min-h-full flex items-start justify-center p-4 py-8">
            <Card className="p-5 max-w-md w-full">
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-lg font-semibold">Select Service</h3>
                <Badge variant="outline" className="font-mono">{pendingPlate?.plate}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose a wash package for this vehicle
              </p>

              <div className="space-y-2.5">
                {PACKAGE_ORDER.map(([code, pkg]) => (
                  <Card
                    key={code}
                    className="p-3.5 cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-[0.99]"
                    onClick={() => handlePackageSelect(code)}
                    data-testid={`package-${code}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold">{pkg.label}</p>
                          <Badge className={`${SERVICE_TIER_COLORS[pkg.tier]} text-white text-[10px] px-1.5 py-0`}>
                            {pkg.tier}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {pkg.durationMinutes} min
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {pkg.steps.length} steps
                          </span>
                          <span className="text-sm font-semibold text-primary">
                            from R{pkg.pricing.small}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{pkg.description}</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pkg.steps.slice(0, 4).map((step) => (
                            <span key={step} className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
                              {step}
                            </span>
                          ))}
                          {pkg.steps.length > 4 && (
                            <span className="text-[10px] text-muted-foreground px-1.5 py-0.5">
                              +{pkg.steps.length - 4} more
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-1" />
                    </div>
                  </Card>
                ))}
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
        </div>
      )}

      {/* Vehicle Size Selection */}
      {showVehicleSize && selectedPkg && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <Card className="p-6 max-w-sm w-full">
            <div className="text-center mb-4">
              <Badge className={`${SERVICE_TIER_COLORS[selectedPkg.tier]} text-white mb-2`}>
                {selectedPkg.tier}
              </Badge>
              <h3 className="text-lg font-semibold">{selectedPkg.label}</h3>
              <p className="text-sm text-muted-foreground">{selectedPkg.durationMinutes} min</p>
            </div>

            <p className="text-sm font-medium mb-3 text-center">Select vehicle size</p>

            <div className="space-y-2">
              {VEHICLE_SIZES.map((size) => (
                <Card
                  key={size}
                  className="p-4 cursor-pointer hover:bg-primary/5 hover:border-primary/30 transition-colors active:scale-[0.98]"
                  onClick={() => handleVehicleSizeSelect(size)}
                  data-testid={`size-${size}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Car className={`h-6 w-6 text-primary ${
                        size === "small" ? "scale-75" : size === "large" ? "scale-110" : ""
                      }`} />
                      <span className="font-medium">{VEHICLE_SIZE_LABELS[size]}</span>
                    </div>
                    <span className="text-lg font-bold text-primary">
                      R{selectedPkg.pricing[size]}
                    </span>
                  </div>
                </Card>
              ))}
            </div>

            {/* Steps preview */}
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {selectedPkg.steps.length} steps included:
              </p>
              <div className="space-y-1">
                {selectedPkg.steps.map((step, i) => (
                  <div key={step} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3 w-3 text-green-500 flex-shrink-0" />
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              className="w-full mt-4"
              onClick={() => {
                setShowVehicleSize(false);
                setShowServiceSelect(true);
              }}
            >
              Back to Services
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
                <Badge variant="secondary" className="mb-2">Walk-in Customer</Badge>
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
                  Walk-in customer — not registered. Loyalty points won't be earned. Customer can register at the CRM website.
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
