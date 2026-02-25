import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Building2, Car, DollarSign, TrendingUp, ArrowLeft } from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PlanDistribution {
  plan: string;
  count: number;
}

interface TopTenant {
  tenantId: string;
  tenantName: string;
  washCount: number;
  revenue: number;
}

interface GlobalAnalytics {
  totalTenants: number;
  activeTenants: number;
  totalWashes: number;
  totalParkingSessions: number;
  totalRevenue: number;
  planDistribution: PlanDistribution[];
  topTenants: TopTenant[];
}

interface TrendPoint {
  month: string;
  tenants: number;
  washes: number;
  revenue: number;
}

interface TrendsResponse {
  trends: TrendPoint[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAN_COLORS: Record<string, string> = {
  free: "#94a3b8",
  basic: "#3b82f6",
  pro: "#8b5cf6",
  enterprise: "#f59e0b",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1);
  return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminAnalytics() {
  const {
    data: analytics,
    isLoading: isLoadingGlobal,
  } = useQuery<GlobalAnalytics>({
    queryKey: ["/api/admin/analytics/global"],
  });

  const {
    data: trendsData,
    isLoading: isLoadingTrends,
  } = useQuery<TrendsResponse>({
    queryKey: ["/api/admin/analytics/trends", { months: 6 }],
    queryFn: async () => {
      const res = await fetch("/api/admin/analytics/trends?months=6");
      if (!res.ok) throw new Error("Failed to fetch trends");
      return res.json();
    },
  });

  const trends = trendsData?.trends ?? [];

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Global Analytics" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-8">
        {/* Back button */}
        <div>
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Summary Cards                                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Tenants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingGlobal ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold" data-testid="stat-total-tenants">
                  {analytics?.totalTenants ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Active Tenants */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
              <Building2 className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoadingGlobal ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold" data-testid="stat-active-tenants">
                  {analytics?.activeTenants ?? 0}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Washes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Washes</CardTitle>
              <Car className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingGlobal ? (
                <Skeleton className="h-8 w-20" />
              ) : (
                <p className="text-3xl font-bold" data-testid="stat-total-washes">
                  {(analytics?.totalWashes ?? 0).toLocaleString()}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Total Revenue */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoadingGlobal ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <p className="text-3xl font-bold" data-testid="stat-total-revenue">
                  {formatCents(analytics?.totalRevenue ?? 0)}
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Plan Distribution                                                 */}
        {/* ----------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Plan Distribution</CardTitle>
            <CardDescription>
              Number of tenants on each subscription plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGlobal ? (
              <div className="flex items-center justify-center py-12">
                <Skeleton className="h-64 w-64 rounded-full" />
              </div>
            ) : analytics?.planDistribution?.length ? (
              <div className="flex flex-col md:flex-row items-center gap-8">
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.planDistribution}
                      dataKey="count"
                      nameKey="plan"
                      cx="50%"
                      cy="50%"
                      outerRadius={110}
                      innerRadius={60}
                      paddingAngle={3}
                      label={({ plan, count }) => `${plan} (${count})`}
                    >
                      {analytics.planDistribution.map((entry) => (
                        <Cell
                          key={entry.plan}
                          fill={PLAN_COLORS[entry.plan] ?? "#64748b"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [value, name]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>

                {/* Legend badges */}
                <div className="flex flex-wrap md:flex-col gap-3">
                  {analytics.planDistribution.map((entry) => (
                    <div key={entry.plan} className="flex items-center gap-2">
                      <span
                        className="inline-block h-3 w-3 rounded-full"
                        style={{ backgroundColor: PLAN_COLORS[entry.plan] ?? "#64748b" }}
                      />
                      <Badge variant="outline" className="capitalize">
                        {entry.plan}
                      </Badge>
                      <span className="text-sm font-semibold">{entry.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No plan distribution data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------------- */}
        {/* Top Tenants                                                       */}
        {/* ----------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Tenants</CardTitle>
            <CardDescription>
              Tenants ranked by wash count and revenue
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingGlobal ? (
              <div className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : analytics?.topTenants?.length ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>Tenant Name</TableHead>
                    <TableHead className="text-right">Wash Count</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.topTenants.map((tenant, index) => (
                    <TableRow key={tenant.tenantId}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{tenant.tenantName}</TableCell>
                      <TableCell className="text-right">
                        {tenant.washCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCents(tenant.revenue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No tenant data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ----------------------------------------------------------------- */}
        {/* Monthly Trends                                                    */}
        {/* ----------------------------------------------------------------- */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Monthly Trends</CardTitle>
            <CardDescription>
              Washes and revenue over the last 6 months
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTrends ? (
              <div className="space-y-3">
                <Skeleton className="h-72 w-full" />
              </div>
            ) : trends.length ? (
              <ResponsiveContainer width="100%" height={350}>
                <LineChart
                  data={trends.map((t) => ({
                    ...t,
                    monthLabel: formatMonth(t.month),
                    revenueDisplay: Number((t.revenue / 100).toFixed(2)),
                  }))}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="monthLabel"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="left"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                    tickFormatter={(value: number) => `$${value}`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => {
                      if (name === "Revenue") return [`$${value.toFixed(2)}`, name];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="washes"
                    name="Washes"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="revenueDisplay"
                    name="Revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p>No trend data available yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
