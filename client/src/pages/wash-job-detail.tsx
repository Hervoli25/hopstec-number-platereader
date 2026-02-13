import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PhotoCheckpointDialog } from "@/components/photo-checkpoint-dialog";
import {
  ArrowLeft, Check, Loader2, Camera, Trash2,
  Droplets, Wind, Sparkles, CircleDot, Car, Clock, Calendar, Award
} from "lucide-react";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { VoiceCommandButton } from "@/components/voice-command-button";
import type { WashJob, WashStatus, ServiceCode } from "@shared/schema";
import { WASH_STATUS_ORDER, SERVICE_TYPE_CONFIG } from "@shared/schema";
import { formatDistanceToNow, format, differenceInMinutes, differenceInSeconds } from "date-fns";

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins < 60) return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
}

function formatElapsedHHMMSS(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds]
    .map(v => String(v).padStart(2, "0"))
    .join(":");
}

function calculateStageDurations(stageTimestamps: Record<string, string> | null | undefined): { stage: string; duration: number; startTime: string }[] {
  if (!stageTimestamps) return [];
  
  // Use explicit stage order to ensure correct calculation
  const orderedStages = ["received", "prewash", "rinse", "dry_vacuum", "simple_polish", "detailing_polish", "tyre_shine", "clay_treatment", "complete"];
  const presentStages = orderedStages.filter(s => stageTimestamps[s]);
  const durations: { stage: string; duration: number; startTime: string }[] = [];
  
  for (let i = 0; i < presentStages.length; i++) {
    const stage = presentStages[i];
    // Skip the complete stage - we only show time spent IN each stage
    if (stage === "complete") continue;
    
    const startTime = new Date(stageTimestamps[stage]);
    // Find the next available timestamp (could be the next stage or complete)
    let endTime = startTime;
    for (let j = i + 1; j < presentStages.length; j++) {
      if (stageTimestamps[presentStages[j]]) {
        endTime = new Date(stageTimestamps[presentStages[j]]);
        break;
      }
    }
    
    const duration = differenceInSeconds(endTime, startTime);
    
    // Only include if we have a valid end time (duration > 0)
    if (duration > 0) {
      durations.push({
        stage,
        duration,
        startTime: stageTimestamps[stage],
      });
    }
  }
  
  return durations;
}

const STATUS_CONFIG: Record<WashStatus, { label: string; icon: typeof Car; color: string }> = {
  received: { label: "Received", icon: Car, color: "bg-blue-500" },
  prewash: { label: "Pre-Wash", icon: Droplets, color: "bg-cyan-500" },
  rinse: { label: "Rinse", icon: Droplets, color: "bg-teal-500" },
  dry_vacuum: { label: "Dry & Vacuum", icon: Wind, color: "bg-amber-500" },
  simple_polish: { label: "Simple Polish", icon: Sparkles, color: "bg-purple-500" },
  detailing_polish: { label: "Detailing Polish", icon: Sparkles, color: "bg-indigo-500" },
  tyre_shine: { label: "Tyre Shine", icon: Sparkles, color: "bg-pink-500" },
  clay_treatment: { label: "Clay Treatment", icon: Sparkles, color: "bg-rose-500" },
  complete: { label: "Complete", icon: Check, color: "bg-green-500" },
};

export default function WashJobDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<WashStatus | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const canDelete = user?.role === "manager" || user?.role === "admin" || user?.role === "super_admin";

  const { data: job, isLoading } = useQuery<WashJob>({
    queryKey: ["/api/wash-jobs", params.id],
  });

  // ETA & queue position
  const { data: queuePosition } = useQuery<{
    position: number;
    estimatedMinutes: number;
    estimatedReadyAt: string | null;
    totalInQueue: number;
  }>({
    queryKey: ["/api/wash-jobs", params.id, "queue-position"],
    queryFn: async () => {
      const res = await fetch(`/api/wash-jobs/${params.id}/queue-position`, { credentials: "include" });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!job && job.status !== "complete",
    refetchInterval: 30000,
  });

  const { data: loyaltyData } = useQuery<{
    account: { membershipNumber: string; pointsBalance: number; tier: string; totalWashes: number } | null;
    transaction: { points: number; balanceAfter: number } | null;
  }>({
    queryKey: ["/api/loyalty/by-wash-job", params.id],
    enabled: !!job && job.status === "complete",
  });

  const addPhotoMutation = useMutation({
    mutationFn: async ({ photo }: { photo: string }) => {
      const res = await apiRequest("POST", `/api/wash-jobs/${params.id}/photos`, { photo });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
      toast({ title: "Photo added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error adding photo", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: WashStatus) => {
      const res = await apiRequest("PATCH", `/api/wash-jobs/${params.id}/status`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/loyalty/by-wash-job", params.id] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const deleteJobMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/wash-jobs/${params.id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
      toast({ title: "Job removed" });
      setLocation("/");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Voice command handler
  const handleVoiceCommand = useCallback(async (command: "next" | "complete") => {
    if (!job || job.status === "complete") return;

    const sc = (job.serviceCode || "STANDARD") as ServiceCode;
    const cfg = SERVICE_TYPE_CONFIG[sc];
    const isTimer = cfg?.mode === "timer";
    const currentIdx = WASH_STATUS_ORDER.indexOf(job.status as WashStatus);

    if (command === "next") {
      if (isTimer) return; // No intermediate steps in timer mode
      const nextIdx = currentIdx + 1;
      if (nextIdx >= WASH_STATUS_ORDER.length) return;
      const nextStatus = WASH_STATUS_ORDER[nextIdx];

      const result = await Swal.fire({
        title: `Advance to ${STATUS_CONFIG[nextStatus]?.label || nextStatus}?`,
        text: 'Voice command: "next step"',
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#3b82f6",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, advance",
        cancelButtonText: "Cancel",
        timer: 10000,
        timerProgressBar: true,
      });
      if (result.isConfirmed) {
        updateStatusMutation.mutate(nextStatus);
      }
    } else if (command === "complete") {
      const result = await Swal.fire({
        title: "Mark as Complete?",
        text: 'Voice command: "complete"',
        icon: "question",
        showCancelButton: true,
        confirmButtonColor: "#22c55e",
        cancelButtonColor: "#6b7280",
        confirmButtonText: "Yes, complete",
        cancelButtonText: "Cancel",
        timer: 10000,
        timerProgressBar: true,
      });
      if (result.isConfirmed) {
        updateStatusMutation.mutate("complete" as WashStatus);
      }
    }
  }, [job, updateStatusMutation]);

  const voiceCommands = useVoiceCommands({
    onCommand: handleVoiceCommand,
    enabled: !!job && job.status !== "complete",
  });

  const handleStatusClick = (newStatus: WashStatus) => {
    // Show photo dialog before updating status
    setPendingStatus(newStatus);
    setShowPhotoDialog(true);
  };

  const handlePhotoConfirm = async (photo?: string) => {
    setShowPhotoDialog(false);

    // Add photo if provided
    if (photo && pendingStatus) {
      await addPhotoMutation.mutateAsync({ photo });
    }

    // Update status
    if (pendingStatus) {
      updateStatusMutation.mutate(pendingStatus);
      setPendingStatus(null);
    }
  };

  // Timer effect for timer-mode services — runs every second while job is active
  useEffect(() => {
    if (!job?.startAt || job.status === "complete") return;
    const sc = (job?.serviceCode || "STANDARD") as ServiceCode;
    const cfg = SERVICE_TYPE_CONFIG[sc];
    if (cfg?.mode !== "timer") return;

    const startTime = new Date(job.startAt).getTime();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job?.startAt, job?.status, job?.serviceCode]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Skeleton className="h-6 w-32" />
          </div>
        </header>
        <main className="max-w-lg mx-auto px-4 py-6">
          <Skeleton className="h-32 mb-6" />
          <Skeleton className="h-16 mb-3" />
          <Skeleton className="h-16 mb-3" />
          <Skeleton className="h-16" />
        </main>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">Job not found</p>
          <Button onClick={() => setLocation("/")}>Go Home</Button>
        </Card>
      </div>
    );
  }

  const serviceCode = (job?.serviceCode || "STANDARD") as ServiceCode;
  const serviceConfig = SERVICE_TYPE_CONFIG[serviceCode];
  const isTimerMode = serviceConfig?.mode === "timer";

  const currentStatusIndex = WASH_STATUS_ORDER.indexOf(job.status as WashStatus);
  const isComplete = job.status === "complete";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold flex-1">Wash Job</h1>
          {!isComplete && (
            <VoiceCommandButton
              isListening={voiceCommands.isListening}
              isSupported={voiceCommands.isSupported}
              transcript={voiceCommands.transcript}
              onToggle={voiceCommands.toggleListening}
            />
          )}
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {/* ETA & Queue Position */}
        {!isComplete && queuePosition && queuePosition.position > 0 && (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
            <Card className="p-4 bg-primary/5 border-primary/20">
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">
                    Queue position: <span className="font-bold">#{queuePosition.position}</span> of {queuePosition.totalInQueue}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Estimated wait: ~{queuePosition.estimatedMinutes} min
                  </p>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">License Plate</p>
                <p className="text-2xl font-mono font-bold" data-testid="text-plate-display">
                  {job.plateDisplay}
                </p>
              </div>
              <Badge 
                className={`${STATUS_CONFIG[job.status as WashStatus].color} text-white`}
                data-testid="badge-current-status"
              >
                {STATUS_CONFIG[job.status as WashStatus].label}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div>
                <span>Started </span>
                <span>{job.startAt ? formatDistanceToNow(new Date(job.startAt), { addSuffix: true }) : "N/A"}</span>
              </div>
              {job.countryHint && job.countryHint !== "OTHER" && (
                <Badge variant="outline">{job.countryHint}</Badge>
              )}
            </div>
          </Card>

          {isTimerMode ? (
            <div className="space-y-3 mb-6">
              <h2 className="text-lg font-semibold mb-4">{serviceConfig.label}</h2>
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground mb-2">
                  {isComplete ? "Total Time" : "Elapsed Time"}
                </p>
                <p className="text-5xl font-mono font-bold tracking-wider mb-6" data-testid="text-timer-display">
                  {isComplete && job.startAt && job.endAt
                    ? formatElapsedHHMMSS(differenceInSeconds(new Date(job.endAt), new Date(job.startAt)))
                    : formatElapsedHHMMSS(elapsedSeconds)
                  }
                </p>
                {!isComplete && (
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    onClick={() => handleStatusClick("complete" as WashStatus)}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <Check className="w-5 h-5 mr-2" />
                    )}
                    Mark Complete
                  </Button>
                )}
              </Card>
            </div>
          ) : (
            <div className="space-y-3 mb-6">
              <h2 className="text-lg font-semibold mb-4">Wash Progress</h2>

              {WASH_STATUS_ORDER.map((status, index) => {
                const config = STATUS_CONFIG[status];
                const Icon = config.icon;
                const isPast = index < currentStatusIndex;
                const isCurrent = index === currentStatusIndex;
                const isFutureClickable = index > currentStatusIndex && !isComplete;
                const isFuture = index > currentStatusIndex;

                return (
                  <motion.div
                    key={status}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card
                      className={`p-4 flex items-center gap-4 transition-all ${
                        isCurrent ? "ring-2 ring-primary" : ""
                      } ${isPast ? "opacity-60" : ""} ${
                        isFutureClickable ? "hover-elevate active-elevate-2 cursor-pointer" : ""
                      } ${isFuture && !isFutureClickable ? "opacity-40" : ""}`}
                      onClick={() => {
                        if (isFutureClickable) {
                          handleStatusClick(status);
                        }
                      }}
                      data-testid={`card-status-${status}`}
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isPast || isCurrent ? config.color : "bg-muted"
                      }`}>
                        {isPast ? (
                          <Check className="w-5 h-5 text-white" />
                        ) : (
                          <Icon className={`w-5 h-5 ${isPast || isCurrent ? "text-white" : "text-muted-foreground"}`} />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`font-medium ${isFuture ? "text-muted-foreground" : ""}`}>
                          {config.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">Current stage</p>
                        )}
                        {isFutureClickable && (
                          <p className="text-xs text-primary">Tap to advance</p>
                        )}
                      </div>
                      {updateStatusMutation.isPending && isFutureClickable && (
                        <Loader2 className="w-5 h-5 animate-spin text-primary" />
                      )}
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              <Card className="p-6 bg-green-500/10 border-green-500/20">
                <div className="flex items-center gap-3 mb-4">
                  <Check className="w-10 h-10 text-green-500" />
                  <div>
                    <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                      Wash Complete!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Vehicle is ready for customer
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 border-t border-green-500/20 pt-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="font-medium" data-testid="text-completion-date">
                      {job.endAt ? format(new Date(job.endAt), "MMM d, yyyy 'at' h:mm a") : "N/A"}
                    </span>
                  </div>
                  
                  {job.serviceCode && (
                    <div className="flex items-center gap-2 text-sm">
                      <CircleDot className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Service:</span>
                      <Badge variant="outline" data-testid="badge-service-code">{job.serviceCode}</Badge>
                    </div>
                  )}
                  
                  {job.startAt && job.endAt && (
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Total Time:</span>
                      <span className="font-medium" data-testid="text-total-time">
                        {formatDuration(differenceInSeconds(new Date(job.endAt), new Date(job.startAt)))}
                      </span>
                    </div>
                  )}
                </div>
              </Card>
              
              {job.stageTimestamps && Object.keys(job.stageTimestamps).length > 1 && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3 text-sm">Time per Stage</h4>
                  <div className="space-y-2">
                    {calculateStageDurations(job.stageTimestamps as Record<string, string>)
                      .filter(s => s.stage !== "complete")
                      .map(({ stage, duration }) => (
                        <div key={stage} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {STATUS_CONFIG[stage as WashStatus]?.label || stage}
                          </span>
                          <span className="font-mono font-medium" data-testid={`text-stage-time-${stage}`}>
                            {formatDuration(duration)}
                          </span>
                        </div>
                      ))}
                  </div>
                </Card>
              )}

              {/* Loyalty Points Earned */}
              {loyaltyData?.transaction && loyaltyData?.account && (
                <Card className="p-4 bg-amber-500/5 border-amber-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Award className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-amber-700 dark:text-amber-400">
                        +{loyaltyData.transaction.points} Loyalty Points Earned
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Member #{loyaltyData.account.membershipNumber}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-bold text-lg">{loyaltyData.account.pointsBalance}</p>
                      <p className="text-xs text-muted-foreground">Total Points</p>
                    </div>
                    <div className="text-center p-2 bg-background rounded">
                      <p className="font-bold text-lg">{loyaltyData.account.totalWashes}</p>
                      <p className="text-xs text-muted-foreground">Total Washes</p>
                    </div>
                  </div>
                </Card>
              )}
            </motion.div>
          )}

          <div className="mt-6 space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation("/")}
              data-testid="button-done"
            >
              Done
            </Button>
            {canDelete && (
              <Button
                variant="ghost"
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={async () => {
                  const result = await Swal.fire({
                    title: 'Remove this job?',
                    text: `Remove job for ${job.plateDisplay}? This cannot be undone.`,
                    icon: 'warning',
                    showCancelButton: true,
                    confirmButtonColor: '#ef4444',
                    cancelButtonColor: '#6b7280',
                    confirmButtonText: 'Yes, remove it',
                    cancelButtonText: 'Cancel',
                  });
                  if (result.isConfirmed) {
                    deleteJobMutation.mutate();
                  }
                }}
                disabled={deleteJobMutation.isPending}
                data-testid="button-delete-job"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {deleteJobMutation.isPending ? "Removing..." : "Remove Job"}
              </Button>
            )}
          </div>
        </motion.div>
      </main>

      <PhotoCheckpointDialog
        open={showPhotoDialog}
        onOpenChange={(open) => {
          setShowPhotoDialog(open);
          if (!open) {
            setPendingStatus(null);
          }
        }}
        stageName={pendingStatus ? STATUS_CONFIG[pendingStatus].label : ""}
        onConfirm={handlePhotoConfirm}
        isOptional={true}
      />
    </div>
  );
}
