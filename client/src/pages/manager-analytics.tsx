import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { 
  BarChart3, ClipboardList, 
  Activity, TrendingUp, Clock, Users, Timer
} from "lucide-react";

interface AnalyticsSummary {
  todayWashes: number;
  weekWashes: number;
  monthWashes: number;
  avgCycleTimeMinutes: number;
  avgTimePerStage: Record<string, number>;
  technicianStats: { userId: string; name: string; count: number }[];
}

const STAGE_LABELS: Record<string, string> = {
  received: "Receiving",
  prewash: "Pre-Wash",
  foam: "Foam",
  rinse: "Rinse",
  dry: "Drying",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

export default function ManagerAnalytics() {
  const [location] = useLocation();

  const { data: analytics, isLoading } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
  ];

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
          <h1 className="text-2xl font-bold">Analytics</h1>

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
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
        </motion.div>
      </main>
    </div>
  );
}
