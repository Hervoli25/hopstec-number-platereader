import { useState, useMemo } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Users,
  UserPlus,
  UserCheck,
  Crown,
  RefreshCw,
  CalendarDays,
  DollarSign,
  Activity,
  Timer,
  Package,
  BarChart3,
  ClipboardList,
  Settings,
  Search,
  Star,
  TrendingUp,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface CustomerData {
  plate: string;
  plateDisplay: string;
  customerName: string | null;
  visitCount: number;
  totalSpent: number;
  lastVisit: string;
  firstVisit: string;
  daysSinceLastVisit: number;
  avgRating: number | null;
  ratingCount: number;
  segment: "one_timer" | "regular" | "vip" | "churned";
  isVip: boolean;
}

interface CustomerInsights {
  totalCustomers: number;
  newCustomers: number;
  activeThisMonth: number;
  retentionRate: number | null;
  avgFrequencyDays: number | null;
  segments: { oneTimers: number; regulars: number; vips: number; churned: number };
  topSpenders: CustomerData[];
  topFrequent: CustomerData[];
  revenueByType: { newCustomerRevenue: number; returningCustomerRevenue: number };
  customers: CustomerData[];
}

const SEGMENT_COLORS: Record<string, string> = {
  vip: "hsl(45, 90%, 50%)",
  regular: "hsl(187, 85%, 45%)",
  one_timer: "hsl(210, 70%, 50%)",
  churned: "hsl(0, 60%, 50%)",
};

const SEGMENT_LABELS: Record<string, string> = {
  vip: "VIP",
  regular: "Regular",
  one_timer: "One-Timer",
  churned: "Churned",
};

const segmentChartConfig: ChartConfig = {
  vip: { label: "VIP", color: SEGMENT_COLORS.vip },
  regular: { label: "Regular", color: SEGMENT_COLORS.regular },
  one_timer: { label: "One-Timer", color: SEGMENT_COLORS.one_timer },
  churned: { label: "Churned", color: SEGMENT_COLORS.churned },
};

const revenueTypeConfig: ChartConfig = {
  returning: { label: "Returning", color: "hsl(187, 85%, 45%)" },
  new: { label: "New", color: "hsl(160, 75%, 40%)" },
};

type SegmentFilter = "all" | "vip" | "regular" | "one_timer" | "churned";

export default function ManagerCustomers() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<SegmentFilter>("all");

  const { data: insights, isLoading } = useQuery<CustomerInsights>({
    queryKey: ["/api/analytics/customer-insights"],
    refetchInterval: 60000,
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

  // Segmentation pie data
  const segmentData = insights ? [
    { name: "VIP", value: insights.segments.vips, key: "vip" },
    { name: "Regular", value: insights.segments.regulars, key: "regular" },
    { name: "One-Timer", value: insights.segments.oneTimers, key: "one_timer" },
    { name: "Churned", value: insights.segments.churned, key: "churned" },
  ].filter((s) => s.value > 0) : [];

  // New vs returning revenue bar data
  const revenueTypeData = insights ? [
    { type: "Returning", revenue: insights.revenueByType.returningCustomerRevenue },
    { type: "New", revenue: insights.revenueByType.newCustomerRevenue },
  ] : [];

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!insights) return [];
    let list = insights.customers;
    if (segmentFilter !== "all") {
      list = list.filter((c) => c.segment === segmentFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((c) =>
        (c.plateDisplay || c.plate || "").toLowerCase().includes(q) ||
        (c.customerName || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => b.totalSpent - a.totalSpent);
  }, [insights, segmentFilter, search]);

  function segmentBadge(segment: string) {
    const color = {
      vip: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30",
      regular: "bg-primary/15 text-primary border-primary/30",
      one_timer: "bg-blue-500/15 text-blue-600 border-blue-500/30",
      churned: "bg-red-500/15 text-red-600 border-red-500/30",
    }[segment] || "bg-muted text-muted-foreground";

    return (
      <Badge variant="outline" className={`text-xs ${color}`}>
        {SEGMENT_LABELS[segment] || segment}
      </Badge>
    );
  }

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
              <Users className="w-6 h-6 text-primary" />
              Customer Insights
            </h1>
            <p className="text-sm text-muted-foreground">Understand who your customers are, how often they visit, and where your revenue comes from.</p>
          </div>

          {/* =============== TOP STAT CARDS =============== */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : insights && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{insights.totalCustomers}</p>
                    <p className="text-xs text-muted-foreground">Total Customers</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <UserPlus className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{insights.newCustomers}</p>
                    <p className="text-xs text-muted-foreground">New (30 days)</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <UserCheck className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">{insights.activeThisMonth}</p>
                    <p className="text-xs text-muted-foreground">Active (30 days)</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <RefreshCw className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {insights.retentionRate !== null ? `${insights.retentionRate}%` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Retention Rate</p>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-xl font-bold">
                      {insights.avgFrequencyDays !== null ? `${insights.avgFrequencyDays}d` : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">Avg Frequency</p>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* =============== CHARTS ROW =============== */}
          {!isLoading && insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Customer Segmentation Pie */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Customer Segmentation</CardTitle>
                </CardHeader>
                <CardContent>
                  {segmentData.length > 0 ? (
                    <div className="flex flex-col md:flex-row items-center gap-4">
                      <div className="w-[180px] h-[180px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={segmentData}
                              dataKey="value"
                              nameKey="name"
                              cx="50%"
                              cy="50%"
                              outerRadius={80}
                              innerRadius={45}
                            >
                              {segmentData.map((s) => (
                                <Cell key={s.key} fill={SEGMENT_COLORS[s.key]} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-2 w-full">
                        {segmentData.map((s) => (
                          <div key={s.key} className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: SEGMENT_COLORS[s.key] }} />
                              <span>{s.name}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-muted-foreground text-xs">
                                {insights.totalCustomers > 0 ? Math.round((s.value / insights.totalCustomers) * 100) : 0}%
                              </span>
                              <span className="font-medium">{s.value}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                      No customer data yet.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* New vs Returning Revenue */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Revenue: New vs Returning (30 days)</CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueTypeData.some((d) => d.revenue > 0) ? (
                    <div>
                      <ChartContainer config={revenueTypeConfig} className="h-[180px] w-full">
                        <BarChart data={revenueTypeData} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 60 }}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" horizontal={false} />
                          <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => fmtShort(v)} />
                          <YAxis type="category" dataKey="type" tick={{ fontSize: 12 }} width={65} />
                          <ChartTooltip
                            content={<ChartTooltipContent />}
                            formatter={(value: number) => fmt(value)}
                          />
                          <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                            <Cell fill="hsl(187, 85%, 45%)" />
                            <Cell fill="hsl(160, 75%, 40%)" />
                          </Bar>
                        </BarChart>
                      </ChartContainer>
                      <div className="mt-3 grid grid-cols-2 gap-4 text-center text-sm">
                        <div>
                          <p className="text-muted-foreground">Returning</p>
                          <p className="font-bold">{fmt(insights.revenueByType.returningCustomerRevenue)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">New</p>
                          <p className="font-bold">{fmt(insights.revenueByType.newCustomerRevenue)}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">
                      No revenue data for this period.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============== TOP TABLES ROW =============== */}
          {!isLoading && insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

              {/* Top Spenders */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Crown className="w-4 h-4 text-yellow-500" />
                    Top Spenders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.topSpenders.length > 0 ? (
                    <div className="space-y-2">
                      {insights.topSpenders.map((c, idx) => (
                        <div key={c.plate} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {c.customerName || c.plateDisplay || c.plate}
                              </p>
                              {c.customerName && (
                                <p className="text-xs text-muted-foreground truncate">{c.plateDisplay || c.plate}</p>
                              )}
                            </div>
                            {c.isVip && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-bold">{fmt(c.totalSpent)}</p>
                            <p className="text-xs text-muted-foreground">{c.visitCount} visits</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
                  )}
                </CardContent>
              </Card>

              {/* Most Frequent */}
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary" />
                    Most Frequent Visitors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {insights.topFrequent.length > 0 ? (
                    <div className="space-y-2">
                      {insights.topFrequent.map((c, idx) => (
                        <div key={c.plate} className="flex items-center justify-between py-1.5 border-b border-border/30 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-xs text-muted-foreground w-5 shrink-0">#{idx + 1}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">
                                {c.customerName || c.plateDisplay || c.plate}
                              </p>
                              {c.customerName && (
                                <p className="text-xs text-muted-foreground truncate">{c.plateDisplay || c.plate}</p>
                              )}
                            </div>
                            {c.avgRating !== null && (
                              <div className="flex items-center gap-0.5 shrink-0">
                                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                <span className="text-xs">{c.avgRating}</span>
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <p className="text-sm font-bold">{c.visitCount} visits</p>
                            <p className="text-xs text-muted-foreground">
                              last {c.daysSinceLastVisit === 0 ? "today" : `${c.daysSinceLastVisit}d ago`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground py-4 text-center">No data yet.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* =============== CUSTOMER LIST =============== */}
          {!isLoading && insights && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">All Customers</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search plate or name..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-9 h-9"
                    />
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {(["all", "vip", "regular", "one_timer", "churned"] as SegmentFilter[]).map((seg) => (
                      <button
                        key={seg}
                        type="button"
                        onClick={() => setSegmentFilter(seg)}
                        className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                          segmentFilter === seg
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-card text-muted-foreground border-border hover:border-primary/50"
                        }`}
                      >
                        {seg === "all" ? "All" : SEGMENT_LABELS[seg]}
                        {seg !== "all" && insights && (
                          <span className="ml-1 opacity-70">
                            ({seg === "vip" ? insights.segments.vips
                              : seg === "regular" ? insights.segments.regulars
                              : seg === "one_timer" ? insights.segments.oneTimers
                              : insights.segments.churned})
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-muted-foreground mb-2">
                  Showing {filteredCustomers.length} of {insights.totalCustomers} customers
                </div>
                {filteredCustomers.length > 0 ? (
                  <div className="space-y-1 max-h-[400px] overflow-y-auto">
                    {filteredCustomers.slice(0, 100).map((c) => (
                      <div key={c.plate} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium truncate">
                                {c.customerName || c.plateDisplay || c.plate}
                              </p>
                              {c.isVip && <Crown className="w-3 h-3 text-yellow-500 shrink-0" />}
                              {segmentBadge(c.segment)}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                              {c.customerName && <span>{c.plateDisplay || c.plate}</span>}
                              <span>{c.visitCount} visits</span>
                              {c.avgRating !== null && (
                                <span className="flex items-center gap-0.5">
                                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                  {c.avgRating}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                          <p className="text-sm font-medium">{fmt(c.totalSpent)}</p>
                          <p className="text-xs text-muted-foreground">
                            {c.daysSinceLastVisit === 0 ? "today" : `${c.daysSinceLastVisit}d ago`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {filteredCustomers.length > 100 && (
                      <p className="text-xs text-muted-foreground text-center py-2">
                        Showing first 100 of {filteredCustomers.length} results
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No customers match your filters.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
