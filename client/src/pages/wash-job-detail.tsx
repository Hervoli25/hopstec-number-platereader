import { useState, useEffect, useCallback } from "react";
import Swal from "sweetalert2";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { enqueueRequest } from "@/lib/offline-queue";
import { PhotoCheckpointDialog } from "@/components/photo-checkpoint-dialog";
import {
  ArrowLeft, Check, Loader2, Camera, Trash2,
  Car, Clock, Calendar, Award, SkipForward, CheckCircle2, Circle
} from "lucide-react";
import { useVoiceCommands } from "@/hooks/use-voice-commands";
import { VoiceCommandButton } from "@/components/voice-command-button";
import type { WashJob, WashStatus, ServiceCode, ServiceChecklistItem } from "@shared/schema";
import { WASH_STATUS_ORDER, SERVICE_TYPE_CONFIG } from "@shared/schema";
import { formatDistanceToNow, format, differenceInSeconds } from "date-fns";

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

interface JobWithChecklist extends WashJob {
  checklist?: ServiceChecklistItem[];
}

export default function WashJobDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [pendingComplete, setPendingComplete] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const canDelete = user?.role === "manager" || user?.role === "admin" || user?.role === "super_admin";

  const { data: job, isLoading } = useQuery<JobWithChecklist>({
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
      const url = `/api/wash-jobs/${params.id}/photos`;
      const payload = { photo };

      if (!navigator.onLine) {
        await enqueueRequest("POST", url, payload);
        return { _queued: true };
      }

      try {
        const res = await apiRequest("POST", url, payload);
        return res.json();
      } catch (err) {
        if (err instanceof TypeError && err.message.includes("fetch")) {
          await enqueueRequest("POST", url, payload);
          return { _queued: true };
        }
        throw err;
      }
    },
    onSuccess: (result: any) => {
      if (result._queued) {
        toast({ title: "Photo queued", description: "Will upload when back online" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
      toast({ title: "Photo added" });
    },
    onError: (error: Error) => {
      toast({ title: "Error adding photo", description: error.message, variant: "destructive" });
    }
  });

  // Confirm a checklist step
  const confirmStepMutation = useMutation({
    mutationFn: async ({ itemId, confirmed }: { itemId: string; confirmed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/wash-jobs/${params.id}/checklist/${itemId}/confirm`, { confirmed });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  // Skip a checklist step
  const skipStepMutation = useMutation({
    mutationFn: async ({ itemId, reason }: { itemId: string; reason?: string }) => {
      const res = await apiRequest("PATCH", `/api/wash-jobs/${params.id}/checklist/${itemId}/skip`, { reason });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: WashStatus) => {
      const url = `/api/wash-jobs/${params.id}/status`;
      const payload = { status: newStatus };

      if (!navigator.onLine) {
        await enqueueRequest("PATCH", url, payload);
        return { _queued: true };
      }

      try {
        const res = await apiRequest("PATCH", url, payload);
        return res.json();
      } catch (err) {
        if (err instanceof TypeError && err.message.includes("fetch")) {
          await enqueueRequest("PATCH", url, payload);
          return { _queued: true };
        }
        throw err;
      }
    },
    onSuccess: (result: any) => {
      if (result._queued) {
        toast({ title: "Status update queued", description: "Will sync when back online" });
        return;
      }
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

    const checklist = job.checklist || [];
    if (command === "next" && checklist.length > 0) {
      // Find next unconfirmed, unskipped step
      const nextStep = checklist.find(item => !item.confirmed && !item.skipped);
      if (nextStep) {
        const result = await Swal.fire({
          title: `Complete "${nextStep.label}"?`,
          text: 'Voice command: "next step"',
          icon: "question",
          showCancelButton: true,
          confirmButtonColor: "#3b82f6",
          cancelButtonColor: "#6b7280",
          confirmButtonText: "Yes, mark done",
          cancelButtonText: "Cancel",
          timer: 10000,
          timerProgressBar: true,
        });
        if (result.isConfirmed) {
          confirmStepMutation.mutate({ itemId: nextStep.id, confirmed: true });
        }
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
  }, [job, confirmStepMutation, updateStatusMutation]);

  const voiceCommands = useVoiceCommands({
    onCommand: handleVoiceCommand,
    enabled: !!job && job.status !== "complete",
  });

  const handleCompleteJob = () => {
    setPendingComplete(true);
    setShowPhotoDialog(true);
  };

  const handlePhotoConfirm = async (photo?: string) => {
    setShowPhotoDialog(false);
    if (photo) {
      await addPhotoMutation.mutateAsync({ photo });
    }
    if (pendingComplete) {
      updateStatusMutation.mutate("complete" as WashStatus);
      setPendingComplete(false);
    }
  };

  const handleSkipStep = async (itemId: string, label: string) => {
    const result = await Swal.fire({
      title: `Skip "${label}"?`,
      input: "text",
      inputLabel: "Reason (optional)",
      inputPlaceholder: "e.g. Not applicable for this vehicle",
      showCancelButton: true,
      confirmButtonColor: "#f59e0b",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Skip step",
      cancelButtonText: "Cancel",
    });
    if (result.isConfirmed) {
      skipStepMutation.mutate({ itemId, reason: result.value || undefined });
    }
  };

  // Timer effect for elapsed time
  useEffect(() => {
    if (!job?.startAt || job.status === "complete") return;
    const startTime = new Date(job.startAt).getTime();
    const tick = () => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [job?.startAt, job?.status]);

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
  const isComplete = job.status === "complete";
  const checklist = job.checklist || [];
  const hasChecklist = checklist.length > 0;

  // Calculate progress from checklist
  const completedSteps = checklist.filter(item => item.confirmed || item.skipped).length;
  const totalSteps = checklist.length;
  const progressPercent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const allStepsDone = totalSteps > 0 && completedSteps === totalSteps;

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
          {/* Job Info Card */}
          <Card className="p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-muted-foreground">License Plate</p>
                <p className="text-2xl font-mono font-bold" data-testid="text-plate-display">
                  {job.plateDisplay}
                </p>
              </div>
              <Badge
                className={`${isComplete ? "bg-green-500" : "bg-blue-500"} text-white`}
                data-testid="badge-current-status"
              >
                {isComplete ? "Complete" : "In Progress"}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{job.startAt ? formatDistanceToNow(new Date(job.startAt), { addSuffix: true }) : "N/A"}</span>
              </div>
              {serviceConfig && (
                <Badge variant="outline">{serviceConfig.label}</Badge>
              )}
              {job.countryHint && job.countryHint !== "OTHER" && (
                <Badge variant="outline">{job.countryHint}</Badge>
              )}
            </div>

            {/* Elapsed timer */}
            {!isComplete && (
              <div className="mt-3 flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-primary" />
                <span className="font-mono text-lg font-semibold text-primary">
                  {formatElapsedHHMMSS(elapsedSeconds)}
                </span>
                {serviceConfig?.durationMinutes && (
                  <span className="text-muted-foreground">/ ~{serviceConfig.durationMinutes} min</span>
                )}
              </div>
            )}
          </Card>

          {/* Dynamic Checklist Progress */}
          {hasChecklist && !isComplete && (
            <Card className="p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Progress</p>
                <p className="text-sm text-muted-foreground">{completedSteps}/{totalSteps} steps</p>
              </div>
              <Progress value={progressPercent} className="h-2" />
            </Card>
          )}

          {/* Checklist Steps */}
          {hasChecklist ? (
            <div className="space-y-2 mb-6">
              <h2 className="text-lg font-semibold mb-3">
                {serviceConfig?.label || "Service"} Steps
              </h2>

              {checklist.map((item, index) => {
                const isDone = item.confirmed;
                const isSkipped = item.skipped;
                const isActionable = !isDone && !isSkipped && !isComplete;
                // Find first actionable step (current step)
                const currentStepIndex = checklist.findIndex(i => !i.confirmed && !i.skipped);
                const isCurrent = index === currentStepIndex && !isComplete;

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                  >
                    <Card
                      className={`p-4 flex items-center gap-3 transition-all ${
                        isCurrent ? "ring-2 ring-primary shadow-sm" : ""
                      } ${isDone ? "opacity-70 bg-green-500/5" : ""} ${
                        isSkipped ? "opacity-50" : ""
                      }`}
                      data-testid={`checklist-item-${index}`}
                    >
                      {/* Step indicator */}
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isDone ? "bg-green-500" : isSkipped ? "bg-muted" : isCurrent ? "bg-primary" : "bg-muted"
                      }`}>
                        {isDone ? (
                          <Check className="w-4 h-4 text-white" />
                        ) : isSkipped ? (
                          <SkipForward className="w-3.5 h-3.5 text-muted-foreground" />
                        ) : (
                          <span className={`text-xs font-bold ${isCurrent ? "text-white" : "text-muted-foreground"}`}>
                            {index + 1}
                          </span>
                        )}
                      </div>

                      {/* Step label */}
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-sm ${
                          isSkipped ? "line-through text-muted-foreground" : ""
                        } ${isDone ? "text-green-700 dark:text-green-400" : ""}`}>
                          {item.label}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-primary">Current step</p>
                        )}
                        {isSkipped && item.skippedReason && (
                          <p className="text-xs text-muted-foreground">Skipped: {item.skippedReason}</p>
                        )}
                        {isDone && item.confirmedAt && (
                          <p className="text-xs text-muted-foreground">
                            Done {formatDistanceToNow(new Date(item.confirmedAt), { addSuffix: true })}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      {isActionable && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 px-3"
                            onClick={() => confirmStepMutation.mutate({ itemId: item.id, confirmed: true })}
                            disabled={confirmStepMutation.isPending}
                            data-testid={`button-confirm-${index}`}
                          >
                            {confirmStepMutation.isPending ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Check className="w-3.5 h-3.5" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 px-2 text-muted-foreground"
                            onClick={() => handleSkipStep(item.id, item.label)}
                            disabled={skipStepMutation.isPending}
                          >
                            <SkipForward className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      )}
                    </Card>
                  </motion.div>
                );
              })}

              {/* Complete Job button */}
              {!isComplete && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="pt-3"
                >
                  <Button
                    className={`w-full ${allStepsDone ? "bg-green-500 hover:bg-green-600" : ""}`}
                    variant={allStepsDone ? "default" : "outline"}
                    size="lg"
                    onClick={handleCompleteJob}
                    disabled={updateStatusMutation.isPending}
                    data-testid="button-mark-complete"
                  >
                    {updateStatusMutation.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <CheckCircle2 className="w-5 h-5 mr-2" />
                    )}
                    {allStepsDone ? "Mark Job Complete" : "Complete Job Early"}
                  </Button>
                </motion.div>
              )}
            </div>
          ) : (
            /* Fallback: No checklist — show simple timer with complete button */
            <div className="space-y-3 mb-6">
              {!isComplete && (
                <Card className="p-6 text-center">
                  <p className="text-sm text-muted-foreground mb-2">Elapsed Time</p>
                  <p className="text-5xl font-mono font-bold tracking-wider mb-6" data-testid="text-timer-display">
                    {formatElapsedHHMMSS(elapsedSeconds)}
                  </p>
                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white"
                    onClick={handleCompleteJob}
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
                </Card>
              )}
            </div>
          )}

          {/* Completion Summary */}
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

                  {serviceConfig && (
                    <div className="flex items-center gap-2 text-sm">
                      <Car className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Service:</span>
                      <Badge variant="outline" data-testid="badge-service-code">{serviceConfig.label}</Badge>
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

                  {/* Completed steps summary */}
                  {hasChecklist && (
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Steps:</span>
                      <span className="font-medium">
                        {checklist.filter(i => i.confirmed).length} completed
                        {checklist.filter(i => i.skipped).length > 0 && `, ${checklist.filter(i => i.skipped).length} skipped`}
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              {/* Completed checklist details */}
              {hasChecklist && (
                <Card className="p-4">
                  <h4 className="font-medium mb-3 text-sm">Service Steps Summary</h4>
                  <div className="space-y-2">
                    {checklist.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        {item.confirmed ? (
                          <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                        ) : item.skipped ? (
                          <SkipForward className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        ) : (
                          <Circle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        )}
                        <span className={`${item.skipped ? "line-through text-muted-foreground" : ""}`}>
                          {item.label}
                        </span>
                        {item.skipped && item.skippedReason && (
                          <span className="text-xs text-muted-foreground">({item.skippedReason})</span>
                        )}
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
            {!isComplete && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setShowPhotoDialog(true);
                  setPendingComplete(false);
                }}
                data-testid="button-add-photo"
              >
                <Camera className="w-4 h-4 mr-2" />
                Add Photo
              </Button>
            )}
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
            setPendingComplete(false);
          }
        }}
        stageName={pendingComplete ? "Completion" : "Progress"}
        onConfirm={handlePhotoConfirm}
        isOptional={true}
      />
    </div>
  );
}
