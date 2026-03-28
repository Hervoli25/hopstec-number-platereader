import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  CalendarDays,
  Timer,
  Package,
  DollarSign,
  Users,
  BarChart3,
  Bell,
  Clock,
  ClipboardList,
  Settings,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  Car,
  ParkingSquare,
  AlertTriangle,
} from "lucide-react";

interface BranchStat {
  id: string;
  name: string;
  address: string | null;
  washCount: number;
  washRevenue: number;
  parkingCount: number;
  parkingRevenue: number;
  totalRevenue: number;
  lastMonthRevenue: number;
  revenueChangePct: number | null;
}

interface CrossBranchData {
  branches: BranchStat[];
  totals: { revenue: number; washes: number; parkings: number };
  dailyRevenue: { day: string; revenue: number; count: number }[];
}

function formatCurrency(n: number) {
  return `R ${n.toLocaleString("en-ZA")}`;
}

function TrendBadge({ pct }: { pct: number | null }) {
  if (pct === null) return <Badge variant="secondary" className="text-xs">New</Badge>;
  if (pct > 0) return (
    <Badge className="text-xs bg-green-100 text-green-700 border-green-200 gap-1">
      <TrendingUp className="w-3 h-3" />{pct}%
    </Badge>
  );
  if (pct < 0) return (
    <Badge className="text-xs bg-red-100 text-red-700 border-red-200 gap-1">
      <TrendingDown className="w-3 h-3" />{Math.abs(pct)}%
    </Badge>
  );
  return (
    <Badge variant="outline" className="text-xs gap-1">
      <Minus className="w-3 h-3" />0%
    </Badge>
  );
}

function SimpleBarChart({ data, maxValue }: { data: { day: string; revenue: number }[]; maxValue: number }) {
  if (!data.length) return null;
  const max = maxValue || 1;
  return (
    <div className="flex items-end gap-0.5 h-20 w-full">
      {data.map((d) => {
        const height = Math.max(2, Math.round((d.revenue / max) * 80));
        const date = new Date(d.day + "T12:00:00");
        const isToday = d.day === new Date().toISOString().split("T")[0];
        return (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-0.5 group relative">
            <div
              className={`w-full rounded-t transition-all ${isToday ? "bg-primary" : "bg-primary/30 group-hover:bg-primary/60"}`}
              style={{ height: `${height}px` }}
            />
            <div className="absolute bottom-full mb-1 hidden group-hover:block z-10 pointer-events-none">
              <div className="bg-popover border border-border rounded px-2 py-1 text-xs whitespace-nowrap shadow">
                <p className="font-medium">{date.toLocaleDateString("en-ZA", { weekday: "short", month: "short", day: "numeric" })}</p>
                <p>{formatCurrency(d.revenue)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function ManagerCrossBranch() {
  const [location] = useLocation();

  const { data, isLoading } = useQuery<CrossBranchData>({
    queryKey: ["/api/analytics/cross-branch"],
    refetchInterval: 60000,
  });

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/manager/roster", label: "Roster", icon: Timer },
    { href: "/manager/inventory", label: "Inventory", icon: Package },
    { href: "/manager/revenue", label: "Revenue", icon: DollarSign },
    { href: "/manager/customers", label: "Customers", icon: Users },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/cross-branch", label: "All Branches", icon: Building2 },
    { href: "/manager/notification-templates", label: "Messages", icon: Bell },
    { href: "/manager/timeslots", label: "Schedule", icon: Clock },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
    { href: "/manager/settings", label: "Settings", icon: Settings },
  ];

  const sorted = [...(data?.branches || [])].sort((a, b) => b.totalRevenue - a.totalRevenue);
  const maxRevenue = sorted[0]?.totalRevenue || 1;
  const avgRevenue = sorted.length > 0 ? Math.round((data?.totals.revenue || 0) / sorted.length) : 0;
  const laggingBranches = sorted.filter((b) => b.revenueChangePct !== null && b.revenueChangePct < -20);
  const dailyMax = Math.max(...(data?.dailyRevenue || []).map((d) => d.revenue), 1);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    type="button"
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{item.label}</span>
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              All Branches — This Month
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Consolidated revenue, wash, and parking performance across all active locations.
            </p>
          </div>

          {/* KPI totals */}
          <div className="grid grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
            ) : (
              <>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><DollarSign className="w-3 h-3" />Total revenue</p>
                    <p className="text-2xl font-bold mt-1">{formatCurrency(data?.totals.revenue || 0)}</p>
                    <p className="text-xs text-muted-foreground">across {sorted.length} branch{sorted.length !== 1 ? "es" : ""}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><Car className="w-3 h-3" />Total washes</p>
                    <p className="text-2xl font-bold mt-1">{(data?.totals.washes || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">cars washed this month</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-muted-foreground flex items-center gap-1"><ParkingSquare className="w-3 h-3" />Total parkings</p>
                    <p className="text-2xl font-bold mt-1">{(data?.totals.parkings || 0).toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">completed sessions</p>
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Revenue trend chart */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                30-Day Revenue Trend (All Branches)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <SimpleBarChart data={data?.dailyRevenue || []} maxValue={dailyMax} />
              )}
            </CardContent>
          </Card>

          {/* Lagging alert */}
          {!isLoading && laggingBranches.length > 0 && (
            <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
              <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                <CardContent className="py-3 flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-400 mb-0.5">Revenue decline detected</p>
                    <p className="text-amber-700 dark:text-amber-500">
                      {laggingBranches.map((b) => b.name).join(", ")} {laggingBranches.length === 1 ? "is" : "are"} more than 20% below last month.
                      Consider reviewing staffing, pricing, or marketing at {laggingBranches.length === 1 ? "this location" : "these locations"}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Branch comparison */}
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Branch Rankings</h2>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
              </div>
            ) : sorted.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="py-10 text-center text-muted-foreground text-sm">
                  No branch data yet. Branches are assigned when wash jobs or parking sessions are created.
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {sorted.map((branch, idx) => {
                  const barWidth = maxRevenue > 0 ? Math.round((branch.totalRevenue / maxRevenue) * 100) : 0;
                  const isTop = idx === 0 && sorted.length > 1;
                  const isBottom = idx === sorted.length - 1 && sorted.length > 1;
                  const belowAvg = branch.totalRevenue < avgRevenue * 0.6;
                  return (
                    <motion.div key={branch.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}>
                      <Card className={isTop ? "ring-1 ring-primary/30" : ""}>
                        <CardContent className="py-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center ${isTop ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                                {idx + 1}
                              </span>
                              <div>
                                <p className="font-semibold text-sm flex items-center gap-1.5">
                                  {branch.name}
                                  {isTop && <Badge className="text-xs bg-primary/10 text-primary border-primary/20">Top performer</Badge>}
                                  {belowAvg && <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">Below avg</Badge>}
                                </p>
                                {branch.address && <p className="text-xs text-muted-foreground">{branch.address}</p>}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-bold">{formatCurrency(branch.totalRevenue)}</p>
                              <TrendBadge pct={branch.revenueChangePct} />
                            </div>
                          </div>

                          {/* Revenue bar */}
                          <div className="h-1.5 bg-muted rounded-full mb-3 overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${barWidth}%` }}
                              transition={{ duration: 0.6, delay: idx * 0.05 }}
                              className={`h-full rounded-full ${isTop ? "bg-primary" : "bg-primary/50"}`}
                            />
                          </div>

                          {/* Stats row */}
                          <div className="grid grid-cols-4 gap-3 text-center">
                            <div>
                              <p className="text-xs text-muted-foreground">Washes</p>
                              <p className="text-sm font-semibold">{branch.washCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Wash Rev.</p>
                              <p className="text-sm font-semibold">{formatCurrency(branch.washRevenue)}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Parkings</p>
                              <p className="text-sm font-semibold">{branch.parkingCount}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground">Parking Rev.</p>
                              <p className="text-sm font-semibold">{formatCurrency(branch.parkingRevenue)}</p>
                            </div>
                          </div>

                          {branch.lastMonthRevenue > 0 && (
                            <p className="text-xs text-muted-foreground mt-2">
                              Last month: {formatCurrency(branch.lastMonthRevenue)}
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
