import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart3, ClipboardList,
  Activity, TrendingUp, Clock, Users, Timer, Download, Star, AlertTriangle
} from "lucide-react";

interface AnalyticsSummary {
  todayWashes: number;
  weekWashes: number;
  monthWashes: number;
  avgCycleTimeMinutes: number;
  avgTimePerStage: Record<string, number>;
  technicianStats: { userId: string; name: string; count: number }[];
}

interface TechPerformance {
  technicianId: string;
  technicianName: string;
  avgRating: number;
  totalRatings: number;
  issueCount: number;
  issuePercent: number;
  recentFeedback: { rating: number | null; notes: string | null; issueReported: string | null; createdAt: string | null; plateDisplay: string }[];
}

const STAGE_LABELS: Record<string, string> = {
  received: "Receiving",
  prewash: "Pre-Wash",
  rinse: "Rinse",
  dry_vacuum: "Dry & Vacuum",
  simple_polish: "Simple Polish",
  detailing_polish: "Detail Polish",
  tyre_shine: "Tyre Shine",
  clay_treatment: "Clay Treatment",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function ManagerAnalytics() {
  const [location] = useLocation();
  const { toast } = useToast();

  const { data: analytics, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: techPerformance, isLoading: isLoadingPerf } = useQuery<TechPerformance[]>({
    queryKey: ["/api/analytics/technician-performance"],
  });

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
  ];

  const handleExportWashJobs = async () => {
    try {
      const response = await fetch("/api/wash-jobs");
      const jobs = await response.json();

      const csv = [
        ["ID", "Plate", "Status", "Technician ID", "Started", "Completed", "Cycle Time (min)"].join(","),
        ...jobs.map((job: any) => {
          const cycleTime = job.startAt && job.endAt
            ? Math.round((new Date(job.endAt).getTime() - new Date(job.startAt).getTime()) / 60000)
            : "";
          return [
            job.id,
            job.plateDisplay,
            job.status,
            job.technicianId,
            job.startAt || "",
            job.endAt || "",
            cycleTime,
          ].join(",");
        }),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wash-jobs-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Wash jobs exported", description: "CSV file downloaded" });
    } catch (error) {
      toast({ title: "Export failed", description: "Could not export wash jobs", variant: "destructive" });
    }
  };

  const handleExportEvents = async () => {
    try {
      const response = await fetch("/api/events?limit=1000");
      const events = await response.json();

      const csv = [
        ["ID", "Type", "Plate", "User ID", "Timestamp"].join(","),
        ...events.map((event: any) => [
          event.id,
          event.type,
          event.plateDisplay || "",
          event.userId || "",
          event.createdAt,
        ].join(",")),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `events-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ title: "Events exported", description: "CSV file downloaded" });
    } catch (error) {
      toast({ title: "Export failed", description: "Could not export events", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Manager Dashboard" />

      <nav className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1 className="text-2xl font-bold">Analytics</h1>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportWashJobs}
                data-testid="button-export-jobs"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Jobs
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportEvents}
                data-testid="button-export-events"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Events
              </Button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-today-washes">
                      {analytics?.todayWashes ?? 0}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Washes Today</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-week-washes">
                      {analytics?.weekWashes ?? 0}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-16" />
                  ) : (
                    <p className="text-3xl font-bold" data-testid="stat-avg-time">
                      {analytics?.avgCycleTimeMinutes ?? 0}m
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground">Avg Cycle Time</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Timer className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Average Time per Stage</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-10" />
                <Skeleton className="h-10" />
              </div>
            ) : analytics?.avgTimePerStage && Object.keys(analytics.avgTimePerStage).length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Object.entries(analytics.avgTimePerStage).map(([stage, seconds]) => (
                  <div 
                    key={stage}
                    className="text-center p-3 rounded-lg bg-muted/50"
                    data-testid={`kpi-stage-${stage}`}
                  >
                    <p className="text-2xl font-bold font-mono">{formatDuration(seconds)}</p>
                    <p className="text-xs text-muted-foreground mt-1">{STAGE_LABELS[stage] || stage}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Timer className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stage timing data available yet</p>
                <p className="text-xs mt-1">Data will appear after jobs are completed</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="w-5 h-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Technician Performance</h2>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : analytics?.technicianStats?.length ? (
              <div className="space-y-3">
                {analytics.technicianStats.map((tech, index) => (
                  <div 
                    key={tech.userId} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    data-testid={`tech-stat-${index}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </div>
                      <span className="font-medium">{tech.name}</span>
                    </div>
                    <span className="text-lg font-semibold">{tech.count} washes</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No technician data available</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Monthly Summary</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Washes This Month</p>
                {isLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <p className="text-4xl font-bold" data-testid="stat-month-washes">
                    {analytics?.monthWashes ?? 0}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Average Per Day</p>
                {isLoading ? (
                  <Skeleton className="h-10 w-24" />
                ) : (
                  <p className="text-4xl font-bold">
                    {analytics?.monthWashes ? Math.round(analytics.monthWashes / 30) : 0}
                  </p>
                )}
              </div>
            </div>
          </Card>
          {/* Customer Ratings */}
          <Card className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Star className="w-5 h-5 text-yellow-500" />
              <h2 className="text-lg font-semibold">Customer Ratings</h2>
            </div>

            {isLoadingPerf ? (
              <div className="space-y-3">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : techPerformance?.length ? (
              <div className="space-y-4">
                {techPerformance.map((tech) => (
                  <div key={tech.technicianId} className="p-4 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{tech.technicianName}</span>
                      <div className="flex items-center gap-3">
                        {tech.avgRating > 0 && (
                          <div className="flex items-center gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= Math.round(tech.avgRating)
                                    ? "text-yellow-500 fill-yellow-500"
                                    : "text-muted-foreground/30"
                                }`}
                              />
                            ))}
                            <span className="ml-1 text-sm font-semibold">{tech.avgRating}</span>
                          </div>
                        )}
                        <span className="text-sm text-muted-foreground">
                          {tech.totalRatings} rating{tech.totalRatings !== 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm">
                      <span className={`flex items-center gap-1 ${
                        tech.issuePercent > 15 ? "text-red-500" :
                        tech.issuePercent > 5 ? "text-yellow-600" :
                        "text-green-600"
                      }`}>
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {tech.issuePercent}% issues ({tech.issueCount})
                      </span>
                    </div>

                    {tech.recentFeedback.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {tech.recentFeedback.slice(0, 3).map((fb, i) => (
                          <div key={i} className="text-sm pl-3 border-l-2 border-muted-foreground/20">
                            {fb.rating && (
                              <span className="text-yellow-600 mr-2">
                                {"★".repeat(fb.rating)}{"☆".repeat(5 - fb.rating)}
                              </span>
                            )}
                            <span className="text-muted-foreground">{fb.plateDisplay}</span>
                            {fb.notes && <span className="ml-2">{fb.notes}</span>}
                            {fb.issueReported && (
                              <span className="ml-2 text-red-500">Issue: {fb.issueReported}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Star className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No customer ratings yet</p>
                <p className="text-xs mt-1">Ratings will appear after customers confirm their wash</p>
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
