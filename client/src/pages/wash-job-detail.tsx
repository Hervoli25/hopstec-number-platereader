import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  ArrowLeft, Check, Loader2, Camera, 
  Droplets, Wind, Sparkles, CircleDot, Car
} from "lucide-react";
import type { WashJob, WashStatus } from "@shared/schema";
import { WASH_STATUS_ORDER } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const STATUS_CONFIG: Record<WashStatus, { label: string; icon: typeof Car; color: string }> = {
  received: { label: "Received", icon: Car, color: "bg-blue-500" },
  prewash: { label: "Pre-Wash", icon: Droplets, color: "bg-cyan-500" },
  foam: { label: "Foam", icon: Sparkles, color: "bg-purple-500" },
  rinse: { label: "Rinse", icon: Droplets, color: "bg-teal-500" },
  dry: { label: "Dry", icon: Wind, color: "bg-amber-500" },
  complete: { label: "Complete", icon: Check, color: "bg-green-500" },
};

export default function WashJobDetail() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: job, isLoading } = useQuery<WashJob>({
    queryKey: ["/api/wash-jobs", params.id],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus: WashStatus) => {
      const res = await apiRequest("PATCH", `/api/wash-jobs/${params.id}/status`, { status: newStatus });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs", params.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/wash-jobs"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  });

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

  const currentStatusIndex = WASH_STATUS_ORDER.indexOf(job.status as WashStatus);
  const isComplete = job.status === "complete";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Wash Job</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
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

          <div className="space-y-3 mb-6">
            <h2 className="text-lg font-semibold mb-4">Wash Progress</h2>
            
            {WASH_STATUS_ORDER.map((status, index) => {
              const config = STATUS_CONFIG[status];
              const Icon = config.icon;
              const isPast = index < currentStatusIndex;
              const isCurrent = index === currentStatusIndex;
              const isNext = index === currentStatusIndex + 1;
              const isFuture = index > currentStatusIndex + 1;

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
                      isNext && !isComplete ? "hover-elevate active-elevate-2 cursor-pointer" : ""
                    } ${isFuture ? "opacity-40" : ""}`}
                    onClick={() => {
                      if (isNext && !isComplete) {
                        updateStatusMutation.mutate(status);
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
                      {isNext && !isComplete && (
                        <p className="text-xs text-primary">Tap to advance</p>
                      )}
                    </div>
                    {updateStatusMutation.isPending && isNext && (
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    )}
                  </Card>
                </motion.div>
              );
            })}
          </div>

          {isComplete && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="p-6 text-center bg-green-500/10 border-green-500/20">
                <Check className="w-12 h-12 mx-auto mb-3 text-green-500" />
                <h3 className="text-lg font-semibold text-green-700 dark:text-green-400">
                  Wash Complete!
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Vehicle is ready for customer
                </p>
              </Card>
            </motion.div>
          )}

          <div className="mt-6">
            <Button 
              variant="outline" 
              className="w-full"
              onClick={() => setLocation("/")}
              data-testid="button-done"
            >
              Done
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
