import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  Car,
  CheckCircle2,
  Clock,
  ParkingSquare,
  Search,
  ShieldCheck,
  Percent,
  Timer,
  DollarSign,
  ArrowRight,
  RotateCcw,
} from "lucide-react";

interface ParkingSession {
  id: string;
  plateDisplay: string;
  plateNormalized: string;
  entryAt: string;
  zoneId: string | null;
  spotNumber: string | null;
}

interface ParkingSettings {
  hourlyRate: number | null;
  currencySymbol?: string;
}

interface ValidationResult {
  session: ParkingSession;
  settings: ParkingSettings | null;
  validations: { id: string; validatorName: string; discountMinutes: number; discountPercent: number; discountAmount: number; validatedAt: string }[];
}

function formatDuration(entryAt: string): string {
  const ms = Date.now() - new Date(entryAt).getTime();
  const mins = Math.floor(ms / 60000);
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  if (hrs > 0) return `${hrs}h ${rem}m`;
  return `${mins}m`;
}

function estimateFee(session: ParkingSession, settings: ParkingSettings | null): number {
  const ms = Date.now() - new Date(session.entryAt).getTime();
  const hrs = ms / 3600000;
  const rate = settings?.hourlyRate || 0;
  return Math.ceil(hrs * rate);
}

type Step = "lookup" | "result" | "discount" | "confirmed";

export default function ParkingValidator() {
  const { toast } = useToast();

  // Validator identity (would normally be pre-configured per kiosk)
  const [validatorCode, setValidatorCode] = useState("");
  const [validatorName, setValidatorName] = useState("");
  const [plate, setPlate] = useState("");
  const [step, setStep] = useState<Step>("lookup");
  const [lookupResult, setLookupResult] = useState<ValidationResult | null>(null);
  const [discountType, setDiscountType] = useState<"minutes" | "percent" | "amount">("minutes");
  const [discountValue, setDiscountValue] = useState("");
  const [tenantId] = useState("default");

  const lookupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/parking/validate/lookup?plate=${encodeURIComponent(plate)}&tenantId=${tenantId}`
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "No active session found for this plate.");
      }
      return res.json() as Promise<ValidationResult>;
    },
    onSuccess: (data) => {
      setLookupResult(data);
      setStep("result");
    },
    onError: (err: Error) => {
      toast({ title: "Not found", description: err.message, variant: "destructive" });
    },
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const payload: Record<string, unknown> = {
        plate,
        validatorCode,
        validatorName,
        tenantId,
        discountMinutes: 0,
        discountPercent: 0,
        discountAmount: 0,
      };
      const val = parseFloat(discountValue) || 0;
      if (discountType === "minutes") payload.discountMinutes = Math.round(val);
      if (discountType === "percent") payload.discountPercent = Math.round(val);
      if (discountType === "amount") payload.discountAmount = Math.round(val * 100); // rands → cents
      return apiRequest("POST", "/api/parking/validate/apply", payload);
    },
    onSuccess: () => {
      setStep("confirmed");
    },
    onError: () => {
      toast({ title: "Validation failed", description: "Could not apply discount. Please try again.", variant: "destructive" });
    },
  });

  const reset = () => {
    setPlate("");
    setDiscountValue("");
    setLookupResult(null);
    setStep("lookup");
  };

  const sym = lookupResult?.settings?.currencySymbol || "R";

  const discountOptions = [
    { value: "minutes", label: "Free minutes", icon: Timer, placeholder: "e.g. 60" },
    { value: "percent", label: "% discount", icon: Percent, placeholder: "e.g. 50" },
    { value: "amount", label: "Fixed amount (R)", icon: DollarSign, placeholder: "e.g. 15.00" },
  ] as const;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-lg mx-auto px-4 py-8 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Parking Validation</h1>
            <p className="text-muted-foreground text-sm">
              Apply a discount to a customer's parking session
            </p>
          </div>

          <AnimatePresence mode="wait">
            {/* STEP 1 — Validator identity + plate lookup */}
            {step === "lookup" && (
              <motion.div
                key="lookup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Your store details</CardTitle>
                    <CardDescription className="text-xs">
                      Enter the validator code issued to your store by the parking operator.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Store / Validator name</Label>
                      <Input
                        value={validatorName}
                        onChange={(e) => setValidatorName(e.target.value)}
                        placeholder="e.g. Woolworths Food"
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Validator code</Label>
                      <Input
                        value={validatorCode}
                        onChange={(e) => setValidatorCode(e.target.value.toUpperCase())}
                        placeholder="e.g. WW-001"
                        className="text-sm font-mono"
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Search className="w-4 h-4 text-primary" />
                      Find parking session
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Customer licence plate</Label>
                      <Input
                        value={plate}
                        onChange={(e) => setPlate(e.target.value.toUpperCase())}
                        placeholder="e.g. ABC 123 GP"
                        className="text-sm font-mono text-lg tracking-widest"
                        onKeyDown={(e) => e.key === "Enter" && plate.length >= 3 && lookupMutation.mutate()}
                      />
                    </div>
                    <Button
                      className="w-full gap-2"
                      disabled={!plate.trim() || !validatorCode.trim() || !validatorName.trim() || lookupMutation.isPending}
                      onClick={() => lookupMutation.mutate()}
                    >
                      {lookupMutation.isPending ? (
                        <span className="flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Searching...
                        </span>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Find parking session
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* STEP 2 — Session found */}
            {step === "result" && lookupResult && (
              <motion.div
                key="result"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* Session card */}
                <Card className="border-primary/30 bg-primary/5">
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-xl font-bold font-mono tracking-widest">{lookupResult.session.plateDisplay}</p>
                        <p className="text-xs text-muted-foreground">Active parking session</p>
                      </div>
                    </div>
                    <Separator className="mb-4" />
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Duration so far</p>
                        <p className="font-semibold flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3.5 h-3.5 text-amber-500" />
                          {formatDuration(lookupResult.session.entryAt)}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Estimated fee</p>
                        <p className="font-semibold mt-0.5">
                          {sym} {(estimateFee(lookupResult.session, lookupResult.settings) / 100).toFixed(2)}
                        </p>
                      </div>
                      {lookupResult.session.zoneId && (
                        <div>
                          <p className="text-xs text-muted-foreground">Zone</p>
                          <p className="font-semibold mt-0.5 flex items-center gap-1">
                            <ParkingSquare className="w-3.5 h-3.5 text-primary" />
                            {lookupResult.session.zoneId}
                          </p>
                        </div>
                      )}
                    </div>

                    {lookupResult.validations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border">
                        <p className="text-xs text-muted-foreground mb-2">Already validated by</p>
                        <div className="flex flex-wrap gap-1.5">
                          {lookupResult.validations.map((v) => (
                            <Badge key={v.id} variant="secondary" className="text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3 text-green-500" />
                              {v.validatorName}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={reset} className="flex-1 gap-2">
                    <RotateCcw className="w-4 h-4" />
                    Search again
                  </Button>
                  <Button onClick={() => setStep("discount")} className="flex-1 gap-2">
                    Apply discount
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* STEP 3 — Choose discount */}
            {step === "discount" && lookupResult && (
              <motion.div
                key="discount"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base">Choose discount type</CardTitle>
                    <CardDescription className="text-xs">
                      Validating for <span className="font-semibold text-foreground font-mono">{lookupResult.session.plateDisplay}</span>
                      {" "}— parked for {formatDuration(lookupResult.session.entryAt)}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    {/* Discount type selector */}
                    <div className="grid grid-cols-3 gap-2">
                      {discountOptions.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setDiscountType(opt.value)}
                          className={`p-3 rounded-xl border-2 text-center transition-all space-y-1.5 ${
                            discountType === opt.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          <opt.icon className="w-5 h-5 mx-auto" />
                          <p className="text-xs font-medium leading-tight">{opt.label}</p>
                        </button>
                      ))}
                    </div>

                    {/* Discount value input */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">
                        {discountType === "minutes" ? "Free minutes to grant" :
                         discountType === "percent" ? "Percentage discount (%)" :
                         "Fixed discount amount (R)"}
                      </Label>
                      <Input
                        type="number"
                        value={discountValue}
                        onChange={(e) => setDiscountValue(e.target.value)}
                        placeholder={discountOptions.find((o) => o.value === discountType)?.placeholder}
                        className="text-lg font-semibold text-center"
                        min={0}
                      />
                      {discountType === "minutes" && discountValue && (
                        <p className="text-xs text-muted-foreground text-center">
                          Customer gets {discountValue} minutes free of charge
                        </p>
                      )}
                      {discountType === "percent" && discountValue && (
                        <p className="text-xs text-muted-foreground text-center">
                          {discountValue}% off their total parking fee
                        </p>
                      )}
                      {discountType === "amount" && discountValue && (
                        <p className="text-xs text-muted-foreground text-center">
                          {sym}{discountValue} deducted from their parking fee
                        </p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" onClick={() => setStep("result")} className="flex-1">
                        Back
                      </Button>
                      <Button
                        onClick={() => applyMutation.mutate()}
                        disabled={!discountValue || parseFloat(discountValue) <= 0 || applyMutation.isPending}
                        className="flex-1 gap-2"
                      >
                        {applyMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                            Applying...
                          </span>
                        ) : (
                          <>
                            <ShieldCheck className="w-4 h-4" />
                            Confirm validation
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* STEP 4 — Confirmed */}
            {step === "confirmed" && lookupResult && (
              <motion.div
                key="confirmed"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-5"
              >
                <div className="py-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }}
                    className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mx-auto mb-5"
                  >
                    <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <h2 className="text-xl font-bold mb-2">Validation Applied!</h2>
                  <p className="text-muted-foreground text-sm">
                    Discount has been applied to{" "}
                    <span className="font-semibold text-foreground font-mono">{lookupResult.session.plateDisplay}</span>
                    's parking session. The discount will be deducted automatically at exit.
                  </p>
                </div>

                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950 text-left">
                  <CardContent className="pt-4 pb-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Plate</span>
                      <span className="font-semibold font-mono">{lookupResult.session.plateDisplay}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Validated by</span>
                      <span className="font-semibold">{validatorName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-semibold text-green-700 dark:text-green-400">
                        {discountType === "minutes" && `${discountValue} free minutes`}
                        {discountType === "percent" && `${discountValue}% off`}
                        {discountType === "amount" && `${sym}${discountValue} off`}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Button onClick={reset} className="w-full gap-2" size="lg">
                  <RotateCcw className="w-4 h-4" />
                  Validate another vehicle
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
