import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ThemeToggle } from "@/components/theme-toggle";
import { AppFooter } from "@/components/app-footer";
import { useAuth } from "@/hooks/use-auth";
import { useSSE } from "@/hooks/use-sse";
import { queryClient } from "@/lib/queryClient";
import {
  BarChart3, ClipboardList, LogOut,
  Car, ParkingSquare, Activity, Users, RefreshCw, Clock,
  TrendingUp, Calendar, Target, ArrowRight, Zap, Settings
} from "lucide-react";
import type { WashJob, WashStatus } from "@shared/schema";
import { formatDistanceToNow, format } from "date-fns";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";

interface QueueStats {
  activeWashes: number;
  parkedVehicles: number;
  todayWashes: number;
  activeJobs: WashJob[];
}

interface CRMBooking {
  id: string;
  status: string;
  bookingDate: string;
  timeSlot: string;
  licensePlate: string;
  serviceName: string;
  customerName: string | null;
}

interface AnalyticsSummary {
  todayWashes: number;
  todayParking: number;
  weekWashes: number;
  weekParking: number;
  avgWashTime: number;
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
  const [location, setLocation] = useLocation();

  // Enable SSE for real-time updates
  useSSE();

  const { data: stats, isLoading, refetch } = useQuery<QueueStats>({
    queryKey: ["/api/queue/stats"],
    refetchInterval: 30000,
  });

  const { data: analytics } = useQuery<AnalyticsSummary>({
    queryKey: ["/api/analytics/summary"],
  });

  const { data: crmBookings } = useQuery<CRMBooking[]>({
    queryKey: ["/api/crm/bookings"],
  });

  const upcomingBookings = crmBookings?.filter(b => b.status === "CONFIRMED").slice(0, 5) || [];

  const initials = user ?
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase()
    : "M";

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
    { href: "/manager/settings", label: "Settings", icon: Settings },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/queue/stats"] });
    queryClient.invalidateQueries({ queryKey: ["/api/crm/bookings"] });
    refetch();
  };

  // Calculate daily target progress (assuming 50 washes/day target)
  const dailyTarget = 50;
  const targetProgress = Math.min(((stats?.todayWashes || 0) / dailyTarget) * 100, 100);

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  <Calendar className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold" data-testid="stat-bookings">
                    {upcomingBookings.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Daily Target Progress */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                <span className="font-medium">Daily Target</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {stats?.todayWashes || 0} / {dailyTarget} washes
              </span>
            </div>
            <Progress value={targetProgress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {targetProgress >= 100
                ? "Target reached! Great job!"
                : `${Math.round(dailyTarget - (stats?.todayWashes || 0))} more washes to reach daily target`}
            </p>
          </Card>

          {/* Two Column Layout */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Live Queue */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  Live Queue
                </h2>
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
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                  <Skeleton className="h-14" />
                </div>
              ) : stats?.activeJobs?.length ? (
                <div className="space-y-3">
                  {stats.activeJobs.slice(0, 5).map((job, index) => (
                    <motion.div
                      key={job.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      data-testid={`queue-job-${job.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-mono font-semibold text-sm">{job.plateDisplay}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {job.startAt ? formatDistanceToNow(new Date(job.startAt), { addSuffix: true }) : "N/A"}
                          </div>
                        </div>
                      </div>
                      <Badge className={`${STATUS_COLORS[job.status as WashStatus]} text-white text-xs`}>
                        {STATUS_LABELS[job.status as WashStatus]}
                      </Badge>
                    </motion.div>
                  ))}
                  {stats.activeJobs.length > 5 && (
                    <p className="text-xs text-center text-muted-foreground pt-2">
                      +{stats.activeJobs.length - 5} more in queue
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Activity className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No active jobs</p>
                </div>
              )}
            </Card>

            {/* Upcoming CRM Bookings */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-500" />
                  Upcoming Bookings
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setLocation("/my-jobs")}
                >
                  View All
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </div>

              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((booking, index) => (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-3 rounded-lg bg-blue-500/5 border border-blue-500/10"
                    >
                      <div>
                        <p className="font-mono font-semibold text-sm">{booking.licensePlate}</p>
                        <p className="text-xs text-muted-foreground">
                          {booking.serviceName}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {booking.timeSlot}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(booking.bookingDate), "MMM d")}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No upcoming bookings</p>
                </div>
              )}
            </Card>
          </div>

          {/* Performance Summary */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-500" />
              Performance Summary
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-primary">
                  {analytics?.todayWashes || stats?.todayWashes || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Today's Washes</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-green-500">
                  {analytics?.weekWashes || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">This Week</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-amber-500">
                  {analytics?.avgWashTime || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Avg. Minutes</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-3xl font-bold text-purple-500">
                  {stats?.parkedVehicles || 0}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Currently Parked</p>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setLocation("/scan/carwash")}
              >
                <Car className="w-6 h-6" />
                <span className="text-xs">New Wash</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setLocation("/scan/parking")}
              >
                <ParkingSquare className="w-6 h-6" />
                <span className="text-xs">Parking</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setLocation("/manager/analytics")}
              >
                <BarChart3 className="w-6 h-6" />
                <span className="text-xs">Reports</span>
              </Button>
              <Button
                variant="outline"
                className="h-auto py-4 flex flex-col gap-2"
                onClick={() => setLocation("/admin/users")}
              >
                <Users className="w-6 h-6" />
                <span className="text-xs">Team</span>
              </Button>
            </div>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
