import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Car, Clock } from "lucide-react";
import type { WashJob, WashStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

const STATUS_COLORS: Record<WashStatus, string> = {
  received: "bg-blue-500",
  prewash: "bg-cyan-500",
  foam: "bg-purple-500",
  rinse: "bg-teal-500",
  dry: "bg-amber-500",
  complete: "bg-green-500",
};

const STATUS_LABELS: Record<WashStatus, string> = {
  received: "Received",
  prewash: "Pre-Wash",
  foam: "Foam",
  rinse: "Rinse",
  dry: "Dry",
  complete: "Complete",
};

export default function MyJobs() {
  const [, setLocation] = useLocation();

  const { data: jobs, isLoading } = useQuery<WashJob[]>({
    queryKey: ["/api/wash-jobs", "my"],
  });

  const activeJobs = jobs?.filter(j => j.status !== "complete") || [];
  const recentComplete = jobs?.filter(j => j.status === "complete").slice(0, 5) || [];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">My Jobs</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <>
            <section className="mb-8">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Active Jobs
              </h2>
              
              {activeJobs.length === 0 ? (
                <Card className="p-6 text-center">
                  <Car className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">No active jobs</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {activeJobs.map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card 
                        className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                        onClick={() => setLocation(`/wash-job/${job.id}`)}
                        data-testid={`card-job-${job.id}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-mono font-semibold text-lg">
                              {job.plateDisplay}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Started {job.startAt ? formatDistanceToNow(new Date(job.startAt), { addSuffix: true }) : "N/A"}
                            </p>
                          </div>
                          <Badge className={`${STATUS_COLORS[job.status as WashStatus]} text-white`}>
                            {STATUS_LABELS[job.status as WashStatus]}
                          </Badge>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            {recentComplete.length > 0 && (
              <section>
                <h2 className="text-lg font-semibold mb-4 text-muted-foreground">
                  Recently Completed
                </h2>
                <div className="space-y-2">
                  {recentComplete.map((job) => (
                    <Card 
                      key={job.id}
                      className="p-3 opacity-70"
                      data-testid={`card-complete-${job.id}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-mono">{job.plateDisplay}</p>
                        <Badge variant="outline" className="text-green-600 border-green-500/30">
                          Complete
                        </Badge>
                      </div>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
