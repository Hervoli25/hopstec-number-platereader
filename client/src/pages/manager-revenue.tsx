import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Car,
  ParkingSquare,
  Package,
  BarChart3,
  Activity,
  CalendarDays,
  Timer,
  ClipboardList,
  Settings,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Users,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface RevenueData {
  today: { wash: number; parking: number; total: number; washCount: number; parkingCount: number };
  week: { wash: number; parking: number; total: number; washCount: number };
  month: { wash: number; parking: number; total: number; washCount: number; cogs: number; grossProfit: number };
  comparison: { weekVsLastWeek: number | null; monthVsLastMonth: number | null };
  byPackage: { name: string; revenue: number; count: number }[];
  hourlyToday: { hour: number; revenue: number; count: number }[];
  dailyTrend: { day: string; washRevenue: number; parkingRevenue: number; total: number; washCount: number }[];
}

function centsToRand(cents: number): string {
  return `R ${(cents / 100).toFixed(2)}`;
}

function centsToRandShort(cents: number): string {
  if (cents >= 100000) return `R ${(cents / 100000).toFixed(1)}k`;
  return `R ${(cents / 100).toFixed(0)}`;
}

const CHART_COLORS = [
  "hsl(187, 85%, 45%)",   // primary teal
  "hsl(160, 75%, 40%)",   // green
  "hsl(45, 90%, 50%)",    // amber
  "hsl(280, 65%, 55%)",   // purple
  "hsl(330, 70%, 50%)",   // rose
  "hsl(210, 70%, 50%)",   // blue
  "hsl(15, 80%, 50%)",    // orange
  "hsl(120, 50%, 40%)",   // dark green
];

const trendChartConfig: ChartConfig = {
  washRevenue: { label: "Wash", color: "hsl(187, 85%, 45%)" },
  parkingRevenue: { label: "Parking", color: "hsl(160, 75%, 40%)" },
};

const hourlyChartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "hsl(187, 85%, 45%)" },
  count: { label: "Washes", color: "hsl(160, 75%, 40%)" },
};

export default function ManagerRevenue() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: revenue, isLoading } = useQuery<RevenueData>({
    queryKey: ["/api/analytics/revenue"],
    refetchInterval: 30000,
  });

  const { data: bizSettings } = useQuery<{ currency: string; currencySymbol: string; locale: string }>({
    queryKey: ["/api/business/settings"],
  });

  const sym = bizSettings?.currencySymbol || "R";

  function fmt(cents: number): string {
    if (bizSettings?.locale && bizSettings?.currency) {
      try {
        return new Intl.NumberFormat(bizSettings.locale, {
          style: "currency",
          currency: bizSettings.currency,
          minimumFractionDigits: 2,
        }).format(cents / 100);
      } catch { /* fallback */ }
    }
    return `${sym} ${(cents / 100).toFixed(2)}`;
  }

  function fmtShort(cents: number): string {
    if (cents >= 10000000) return `${sym}${(cents / 10000000).toFixed(1)}M`;
    if (cents >= 100000) return `${sym}${(cents / 100000).toFixed(1)}k`;
    return `${sym}${(cents / 100).toFixed(0)}`;
  }

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/manager/roster", label: "Roster", icon: Timer },
    { href: "/manager/inventory", label: "Inventory", icon: Package },
    { href: "/manager/revenue", label: "Revenue", icon: DollarSign },
    { href: "/manager/customers", label: "Customers", icon: Users },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
    { href: "/manager/settings", label: "Settings", icon: Settings },
  ];

  // Build hourly data for today (fill in missing hours)
  const hourlyData = Array.from({ length: 24 }, (_, i) => {
    const found = revenue?.hourlyToday.find((h) => h.hour === i);
    return { hour: `${i.toString().padStart(2, "0")}:00`, revenue: found?.revenue || 0, count: found?.count || 0 };
  }).filter((h) => h.hour >= "06:00" && h.hour <= "20:00"); // business hours only

  // Format daily trend day labels
  const dailyData = (revenue?.dailyTrend || []).map((d) => {
    const date = new Date(d.day + "T00:00:00");
    return {
      ...d,
      label: date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric" }),
    };
  });

  // Sort packages by revenue descending
  const packageData = [...(revenue?.byPackage || [])].sort((a, b) => b.revenue - a.revenue);

  const weekChange = revenue?.comparison.weekVsLastWeek;
  const monthChange = revenue?.comparison.monthVsLastMonth;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <nav className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-4">
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

      <main className="flex-1 max-w-5xl mx-auto px-4 py-6 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Page Title */}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-primary" />
              Revenue Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">Track income, compare periods, and monitor profitability.</p>
          </div>

          {/* =============== TOP STAT CARDS =============== */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Today's Revenue */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{fmt(revenue?.today.total || 0)}</p>
                    <p className="text-xs text-muted-foreground">Today</p>
                  </div>
                </div>
              </Card>

              {/* This Week */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{fmtShort(revenue?.week.total || 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      This Week
                      {weekChange !== null && weekChange !== undefined && (
                        <span className={`ml-1 ${weekChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {weekChange >= 0 ? "+" : ""}{weekChange}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* This Month */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{fmtShort(revenue?.month.total || 0)}</p>
                    <p className="text-xs text-muted-foreground">
                      This Month
                      {monthChange !== null && monthChange !== undefined && (
                        <span className={`ml-1 ${monthChange >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {monthChange >= 0 ? "+" : ""}{monthChange}%
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              </Card>

              {/* Gross Profit */}
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{fmtShort(revenue?.month.grossProfit || 0)}</p>
                    <p className="text-xs text-muted-foreground">Gross Profit (MTD)</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* =============== REVENUE BREAKDOWN CARDS =============== */}
          {!isLoading && revenue && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Car className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Wash Revenue</span>
                </div>
                <p className="text-2xl font-bold">{fmt(revenue.month.wash)}</p>
                <p className="text-xs text-muted-foreground">{revenue.month.washCount} washes this month</p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Today: {fmt(revenue.today.wash)}</span>
                  <span>Week: {fmtShort(revenue.week.wash)}</span>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <ParkingSquare className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Parking Revenue</span>
                </div>
                <p className="text-2xl font-bold">{fmt(revenue.month.parking)}</p>
                <p className="text-xs text-muted-foreground">Today: {revenue.today.parkingCount} sessions</p>
                <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                  <span>Today: {fmt(revenue.today.parking)}</span>
                  <span>Week: {fmtShort(revenue.week.parking)}</span>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-medium">COGS (Inventory)</span>
                </div>
                <p className="text-2xl font-bold text-red-500">-{fmt(revenue.month.cogs)}</p>
                <p className="text-xs text-muted-foreground">Products consumed this month</p>
                <div className="mt-2 text-xs text-muted-foreground">
                  Margin: {revenue.month.total > 0
                    ? `${Math.round(((revenue.month.total - revenue.month.cogs) / revenue.month.total) * 100)}%`
                    : "N/A"
                  }
                </div>
              </Card>
            </div>
          )}

          {/* =============== CHARTS ROW =============== */}
          {!isLoading && revenue && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* 7-Day Revenue Trend */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">7-Day Revenue Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyData.length > 0 ? (
                    <ChartContainer config={trendChartConfig} className="h-[250px] w-full">
                      <BarChart data={dailyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                        <ChartTooltip
                          content={<ChartTooltipContent />}
                          formatter={(value: number) => fmt(value)}
                        />
                        <Bar dataKey="washRevenue" stackId="a" fill="hsl(187, 85%, 45%)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="parkingRevenue" stackId="a" fill="hsl(160, 75%, 40%)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ChartContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground text-sm">
                      No revenue data for this period yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Revenue by Service Package (Pie) */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue by Service (This Month)</CardTitle>
                </CardHeader>
                <CardContent>
                  {packageData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="w-[180px] h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={packageData}
                              dataKey="revenue"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={45}
                            >
                              {packageData.map((_, idx) => (
                                <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1.5 w-full">
                        {packageData.map((pkg, idx) => (
                          <div key={pkg.name} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full shrink-0"
                                style={{ backgroundColor: CHART_COLORS[idx % CHART_COLORS.length] }}
                              />
                              <span className="truncate">{pkg.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground text-xs">{pkg.count}x</span>
                              <span className="font-medium">{fmt(pkg.revenue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                      No service revenue data yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============== HOURLY HEATMAP =============== */}
          {!isLoading && revenue && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today's Revenue by Hour</CardTitle>
              </CardHeader>
              <CardContent>
                {hourlyData.some((h) => h.revenue > 0) ? (
                  <ChartContainer config={hourlyChartConfig} className="h-[200px] w-full">
                    <BarChart data={hourlyData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
                      <XAxis dataKey="hour" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => fmtShort(v)} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value: number, name: string) =>
                          name === "revenue" ? fmt(value) : `${value} washes`
                        }
                      />
                      <Bar dataKey="revenue" fill="hsl(187, 85%, 45%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="h-[200px] flex items-center justify-center text-muted-foreground text-sm">
                    No washes recorded today yet.
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* =============== MONTH SUMMARY TABLE =============== */}
          {!isLoading && revenue && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Monthly Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Wash Revenue</span>
                    <span className="font-medium">{fmt(revenue.month.wash)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Parking Revenue</span>
                    <span className="font-medium">{fmt(revenue.month.parking)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground font-medium">Total Revenue</span>
                    <span className="font-bold">{fmt(revenue.month.total)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">Cost of Goods Sold</span>
                    <span className="font-medium text-red-500">-{fmt(revenue.month.cogs)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground font-medium">Gross Profit</span>
                    <span className={`font-bold ${revenue.month.grossProfit >= 0 ? "text-green-500" : "text-red-500"}`}>
                      {fmt(revenue.month.grossProfit)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
