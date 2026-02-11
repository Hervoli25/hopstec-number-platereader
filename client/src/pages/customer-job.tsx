import { useState, useEffect } from "react";
import { useRoute } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Car, Camera, CheckCircle2, Clock, Loader2, Star, AlertTriangle,
  Droplets, Wind, Sparkles, Send
} from "lucide-react";
import { format } from "date-fns";
import hopsovirLogo from "@/assets/images/logo.png";
import type { WashJob, WashPhoto, ServiceChecklistItem, CustomerConfirmation, ServiceCode } from "@shared/schema";
import { SERVICE_TYPE_CONFIG } from "@shared/schema";

const STATUS_CONFIG: Record<string, { label: string; icon: any; color: string }> = {
  received: { label: "Received", icon: Car, color: "bg-blue-500" },
  prewash: { label: "Pre-Wash", icon: Droplets, color: "bg-cyan-500" },
  rinse: { label: "Rinse", icon: Droplets, color: "bg-teal-500" },
  dry_vacuum: { label: "Dry & Vacuum", icon: Wind, color: "bg-amber-500" },
  simple_polish: { label: "Simple Polish", icon: Sparkles, color: "bg-purple-500" },
  detailing_polish: { label: "Detailing Polish", icon: Sparkles, color: "bg-indigo-500" },
  tyre_shine: { label: "Tyre Shine", icon: Sparkles, color: "bg-pink-500" },
  clay_treatment: { label: "Clay Treatment", icon: Sparkles, color: "bg-rose-500" },
  complete: { label: "Complete", icon: CheckCircle2, color: "bg-green-500" },
};

const STATUS_ORDER = ["received", "prewash", "rinse", "dry_vacuum", "simple_polish", "detailing_polish", "tyre_shine", "clay_treatment", "complete"];

interface CustomerJobData {
  job: WashJob;
  photos: WashPhoto[];
  checklist: ServiceChecklistItem[];
  confirmation: CustomerConfirmation | null;
  customerName: string | null;
  serviceCode: string | null;
}

export default function CustomerJob() {
  const [, params] = useRoute("/customer/job/:token");
  const token = params?.token || "";
  const { toast } = useToast();
  
  const [checklistState, setChecklistState] = useState<Record<string, boolean>>({});
  const [rating, setRating] = useState(0);
  const [notes, setNotes] = useState("");
  const [issueReported, setIssueReported] = useState("");
  const [showConfirmForm, setShowConfirmForm] = useState(false);

  const { data, isLoading, error, refetch } = useQuery<CustomerJobData>({
    queryKey: ["/api/customer/job", token],
    queryFn: async () => {
      const res = await fetch(`/api/customer/job/${token}`);
      if (!res.ok) throw new Error("Job not found");
      return res.json();
    },
    enabled: !!token,
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!token) return;
    
    const eventSource = new EventSource(`/api/customer/stream/${token}`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Refetch on any event related to wash updates
        if (data.type && data.type !== "connected") {
          refetch();
        }
      } catch (e) {
        // Ignore parse errors from malformed events
      }
    };

    return () => eventSource.close();
  }, [token, refetch]);

  useEffect(() => {
    if (data?.checklist) {
      const state: Record<string, boolean> = {};
      data.checklist.forEach(item => {
        state[item.id] = item.confirmed || false;
      });
      setChecklistState(state);
    }
  }, [data?.checklist]);

  const confirmMutation = useMutation({
    mutationFn: async () => {
      const checklistConfirmations = Object.entries(checklistState).map(([id, confirmed]) => ({
        id,
        confirmed,
      }));
      
      const res = await apiRequest("POST", `/api/customer/confirm/${token}`, {
        checklistConfirmations,
        rating: rating || null,
        notes: notes || null,
        issueReported: issueReported || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/job", token] });
      toast({
        title: "Confirmation saved",
        description: "Thank you for your feedback!",
      });
      setShowConfirmForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save confirmation",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <AlertTriangle className="h-12 w-12 mx-auto text-destructive mb-4" />
          <h2 className="text-xl font-bold mb-2">Job Not Found</h2>
          <p className="text-muted-foreground">
            This tracking link may be invalid or expired.
          </p>
        </Card>
      </div>
    );
  }

  const { job, photos, checklist, confirmation, customerName, serviceCode } = data;
  const currentStatusIndex = STATUS_ORDER.indexOf(job.status);
  const isComplete = job.status === "complete";
  const svcCode = (job.serviceCode || "STANDARD") as ServiceCode;
  const svcConfig = SERVICE_TYPE_CONFIG[svcCode];
  const isTimerMode = svcConfig?.mode === "timer";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <img src={hopsovirLogo} alt="HOPSVOIR" className="h-8" />
          <Badge variant={isComplete ? "default" : "secondary"}>
            {isComplete ? "Complete" : "In Progress"}
          </Badge>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="flex items-center gap-2">
                  <Car className="h-5 w-5" />
                  {job.plateDisplay}
                </CardTitle>
                {serviceCode && (
                  <Badge variant="outline">{serviceCode}</Badge>
                )}
              </div>
              {customerName && (
                <p className="text-sm text-muted-foreground">
                  Customer: {customerName}
                </p>
              )}
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Started: {job.startAt ? format(new Date(job.startAt), "MMM d, h:mm a") : "N/A"}
              </div>
              {job.endAt && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Completed: {format(new Date(job.endAt), "MMM d, h:mm a")}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {isTimerMode ? svcConfig.label : "Wash Progress"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isTimerMode ? (
                <div className="text-center py-4">
                  <Badge className="mb-3">{svcConfig.label}</Badge>
                  {isComplete ? (
                    <div>
                      <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p className="text-lg font-semibold text-green-600">Service Complete</p>
                      {job.startAt && job.endAt && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Total time: {Math.round((new Date(job.endAt).getTime() - new Date(job.startAt).getTime()) / 60000)} minutes
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <Clock className="h-12 w-12 mx-auto text-primary animate-pulse mb-2" />
                      <p className="text-lg font-semibold">In Progress</p>
                      <p className="text-sm text-muted-foreground mt-1">Your vehicle is being serviced</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                  <div className="space-y-4">
                    {STATUS_ORDER.map((status, index) => {
                      const config = STATUS_CONFIG[status];
                      if (!config) return null;
                      const isPast = index <= currentStatusIndex;
                      const isCurrent = index === currentStatusIndex;
                      const Icon = config.icon;
                      const statusPhotos = photos.filter(p => p.statusAtTime === status);
                      // Check if this step was skipped (no timestamp and it's past)
                      const timestamps = (job.stageTimestamps || {}) as Record<string, string>;
                      const wasSkipped = isPast && !isCurrent && !timestamps[status] && status !== "received";

                      return (
                        <div key={status} className="flex gap-4 relative">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center z-10 ${
                            isPast ? config.color : "bg-muted"
                          } ${wasSkipped ? "opacity-40" : ""}`}>
                            <Icon className={`h-4 w-4 ${isPast ? "text-white" : "text-muted-foreground"}`} />
                          </div>
                          <div className="flex-1 pt-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`font-medium ${isPast ? "" : "text-muted-foreground"} ${wasSkipped ? "line-through opacity-50" : ""}`}>
                                {config.label}
                              </span>
                              {wasSkipped && (
                                <Badge variant="outline" className="text-xs opacity-50">Skipped</Badge>
                              )}
                              {isCurrent && !isComplete && (
                                <Badge className="animate-pulse">Current</Badge>
                              )}
                              {statusPhotos.length > 0 && (
                                <Badge variant="outline" className="gap-1">
                                  <Camera className="h-3 w-3" />
                                  {statusPhotos.length}
                                </Badge>
                              )}
                            </div>

                            {statusPhotos.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto pb-2">
                                {statusPhotos.map(photo => (
                                  <img
                                    key={photo.id}
                                    src={photo.url}
                                    alt={`${config.label} photo`}
                                    className="w-20 h-20 object-cover rounded-lg flex-shrink-0"
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {checklist.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Service Checklist</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {checklist.map(item => (
                    <div key={item.id} className="flex items-center gap-3">
                      <Checkbox
                        id={item.id}
                        checked={checklistState[item.id] || false}
                        onCheckedChange={(checked) => {
                          setChecklistState(prev => ({
                            ...prev,
                            [item.id]: !!checked,
                          }));
                        }}
                        disabled={!!confirmation}
                        data-testid={`checkbox-${item.id}`}
                      />
                      <Label 
                        htmlFor={item.id}
                        className={checklistState[item.id] ? "line-through text-muted-foreground" : ""}
                      >
                        {item.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {isComplete && !confirmation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {!showConfirmForm ? (
              <Button 
                className="w-full" 
                size="lg"
                onClick={() => setShowConfirmForm(true)}
                data-testid="button-confirm-service"
              >
                <CheckCircle2 className="mr-2 h-5 w-5" />
                Confirm Service Was Respected
              </Button>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Confirm Service</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Rating (optional)</Label>
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setRating(star)}
                          className="p-1"
                          data-testid={`button-star-${star}`}
                        >
                          <Star 
                            className={`h-6 w-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Additional Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Any comments about the service..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-2"
                      data-testid="textarea-notes"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="issue">Report an Issue (optional)</Label>
                    <Textarea
                      id="issue"
                      placeholder="Describe any problems..."
                      value={issueReported}
                      onChange={(e) => setIssueReported(e.target.value)}
                      className="mt-2"
                      data-testid="textarea-issue"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setShowConfirmForm(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => confirmMutation.mutate()}
                      disabled={confirmMutation.isPending}
                      className="flex-1"
                      data-testid="button-submit-confirmation"
                    >
                      {confirmMutation.isPending ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="mr-2 h-4 w-4" />
                      )}
                      Submit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        )}

        {confirmation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-green-500/50 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium">Service Confirmed</p>
                    <p className="text-sm text-muted-foreground">
                      Thank you for your feedback!
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </main>

      <footer className="border-t border-border mt-8 py-6">
        <div className="max-w-lg mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Made by HOPS-TECH INNOVATION</p>
          {process.env.PORTFOLIO_URL && (
            <a 
              href={process.env.PORTFOLIO_URL} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Visit our portfolio
            </a>
          )}
        </div>
      </footer>
    </div>
  );
}
