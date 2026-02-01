import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { useSSE } from "@/hooks/use-sse";
import { queryClient } from "@/lib/queryClient";
import { 
  BarChart3, ClipboardList, LogOut, 
  Car, ParkingSquare, Activity, Users, RefreshCw, Clock
} from "lucide-react";
import type { WashJob, WashStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";

interface QueueStats {
  activeWashes: number;
  parkedVehicles: number;
  todayWashes: number;
  activeJobs: WashJob[];
}

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

export default function ManagerDashboard() {
  const { user, logout } = useAuth();
  const [location] = useLocation();

  // Enable SSE for real-time updates
  useSSE();

  const { data: stats, isLoading, refetch } = useQuery<QueueStats>({
    queryKey: ["/api/queue/stats"],
    refetchInterval: 30000, // Also poll every 30 seconds as backup
  });

  const initials = user ? 
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase() 
    : "M";

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
    refetch();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <img src={logoPath} alt="HOPSVOIR" className="h-9 w-auto" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

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
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="w-5 h-5 text-primary" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-active-washes">
                      {stats?.activeWashes ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Active Washes</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <ParkingSquare className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-parked">
                      {stats?.parkedVehicles ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Parked</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  {isLoading ? (
                    <Skeleton className="h-8 w-8" />
                  ) : (
                    <p className="text-2xl font-bold" data-testid="stat-today">
                      {stats?.todayWashes ?? 0}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">Today</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-technicians">
                    {stats?.activeJobs?.length ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground">In Queue</p>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Live Queue</h2>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            
            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : stats?.activeJobs?.length ? (
              <div className="space-y-3">
                {stats.activeJobs.map((job, index) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    data-testid={`queue-job-${job.id}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Car className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-mono font-semibold">{job.plateDisplay}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          {job.startAt ? formatDistanceToNow(new Date(job.startAt), { addSuffix: true }) : "N/A"}
                        </div>
                      </div>
                    </div>
                    <Badge className={`${STATUS_COLORS[job.status as WashStatus]} text-white`}>
                      {STATUS_LABELS[job.status as WashStatus]}
                    </Badge>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Activity className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No active jobs in queue</p>
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
