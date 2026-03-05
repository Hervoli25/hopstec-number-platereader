import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { BILLING_PLANS, PLAN_BADGE_CONFIG, formatCents, getUsagePercent } from "@shared/billing";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  CreditCard,
  Car,
  Users,
  Building2,
  ParkingSquare,
  Infinity,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  FileText,
  TrendingUp,
  Check,
  Receipt,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PlanLimits {
  maxWashes: number;
  maxParkingSessions: number;
  maxUsers: number;
  maxBranches: number;
  price: number;
  label: string;
  description: string;
  features: string[];
}

interface TenantUsage {
  plan: string;
  status: string;
  washCount: number;
  parkingSessionCount: number;
  activeUserCount: number;
  branchCount: number;
  limits: PlanLimits;
  trialEndsAt: string | null;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  periodStart: string;
  periodEnd: string;
  total: number;
  planAtTime: string;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function progressColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

const INVOICE_STATUS_DISPLAY: Record<string, { label: string; icon: React.ElementType; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", icon: FileText, badgeVariant: "outline" },
  pending: { label: "Pending", icon: Clock, badgeVariant: "secondary" },
  paid: { label: "Paid", icon: CheckCircle2, badgeVariant: "default" },
  overdue: { label: "Overdue", icon: AlertCircle, badgeVariant: "destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, badgeVariant: "outline" },
};

// ─── Usage Meter ────────────────────────────────────────────────────────────

function UsageMeter({
  label,
  icon: Icon,
  current,
  max,
  iconColor,
}: {
  label: string;
  icon: React.ElementType;
  current: number;
  max: number;
  iconColor: string;
}) {
  const isUnlimited = max === -1;
  const percent = isUnlimited ? 0 : getUsagePercent(current, max);
  const colorClass = progressColor(percent);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-10 h-10 rounded-lg ${iconColor.replace("text-", "bg-").replace("500", "500/10")} flex items-center justify-center`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {current.toLocaleString()} / {isUnlimited ? "Unlimited" : max.toLocaleString()}
            </p>
          </div>
          {isUnlimited ? (
            <Badge variant="secondary" className="gap-1">
              <Infinity className="h-3 w-3" /> Unlimited
            </Badge>
          ) : (
            <Badge variant={percent >= 90 ? "destructive" : percent >= 70 ? "outline" : "secondary"}>
              {percent}%
            </Badge>
          )}
        </div>
        {isUnlimited ? (
          <div className="h-3 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground font-medium">No limit</span>
          </div>
        ) : (
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div className={`h-full transition-all ${colorClass}`} style={{ width: `${percent}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function TenantBilling() {
  const { data: usage, isLoading: usageLoading, isError: usageError, error: usageErr } = useQuery<TenantUsage>({
    queryKey: ["/api/tenant/billing/usage"],
  });

  const { data: invoicesData, isLoading: invoicesLoading } = useQuery<Invoice[]>({
    queryKey: ["/api/tenant/invoices"],
  });

  const invoices = invoicesData || [];

  // Calculate next billing date
  const now = new Date();
  const nextBillingDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Billing & Usage" />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full space-y-6">
        <div>
          <Link href="/manager">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
            </Button>
          </Link>
        </div>

        {usageLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-36 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : usageError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load billing data: {usageErr instanceof Error ? usageErr.message : "Unknown error"}
              </p>
            </CardContent>
          </Card>
        ) : usage ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Current Plan Card */}
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <CreditCard className="h-7 w-7 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">{usage.limits.label} Plan</h2>
                      <p className="text-sm text-muted-foreground">{usage.limits.description}</p>
                      <p className="text-lg font-semibold mt-1">
                        {usage.limits.price === 0 ? "Free" : `${formatCents(usage.limits.price)}/month`}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge variant="default" className="text-sm capitalize">{usage.plan}</Badge>
                    {usage.status === "trial" && usage.trialEndsAt && (
                      <div className="flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400">
                        <Clock className="w-3 h-3" />
                        Trial ends {format(new Date(usage.trialEndsAt), "MMM d, yyyy")}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Billing Info Bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Current Period</p>
                    <p className="text-sm font-medium">
                      {format(new Date(now.getFullYear(), now.getMonth(), 1), "MMM d")} — {format(new Date(now.getFullYear(), now.getMonth() + 1, 0), "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Billing</p>
                    <p className="text-sm font-medium">
                      {format(nextBillingDate, "MMM d, yyyy")}
                    </p>
                  </div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-3">
                  <Receipt className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Next Amount</p>
                    <p className="text-sm font-medium">
                      {usage.limits.price === 0 ? "Free" : formatCents(usage.limits.price)}
                    </p>
                  </div>
                </div>
              </Card>
            </div>

            {/* Usage Meters */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Current Usage</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <UsageMeter
                  label="Wash Jobs"
                  icon={Car}
                  current={usage.washCount}
                  max={usage.limits.maxWashes}
                  iconColor="text-green-500"
                />
                <UsageMeter
                  label="Active Users"
                  icon={Users}
                  current={usage.activeUserCount}
                  max={usage.limits.maxUsers}
                  iconColor="text-blue-500"
                />
                <UsageMeter
                  label="Parking Sessions"
                  icon={ParkingSquare}
                  current={usage.parkingSessionCount}
                  max={usage.limits.maxParkingSessions}
                  iconColor="text-purple-500"
                />
                <UsageMeter
                  label="Branches"
                  icon={Building2}
                  current={usage.branchCount}
                  max={usage.limits.maxBranches}
                  iconColor="text-amber-500"
                />
              </div>
            </div>

            {/* Plan Features */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Plan Features</CardTitle>
                <CardDescription>What's included in your {usage.limits.label} plan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {usage.limits.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Invoice History */}
            <div>
              <h3 className="text-lg font-semibold mb-3">Invoice History</h3>
              {invoicesLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : invoices.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Receipt className="h-10 w-10 mx-auto mb-3 opacity-50" />
                    <p className="font-medium">No invoices yet</p>
                    <p className="text-sm mt-1">
                      {usage.limits.price === 0
                        ? "You're on the Free plan — no invoices to show."
                        : "Your first invoice will appear at the end of the billing period."
                      }
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Due Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((inv) => {
                          const statusConf = INVOICE_STATUS_DISPLAY[inv.status] || INVOICE_STATUS_DISPLAY.draft;
                          const StatusIcon = statusConf.icon;
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                              <TableCell className="text-sm">
                                {inv.periodStart ? format(new Date(inv.periodStart), "MMM yyyy") : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant={statusConf.badgeVariant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConf.label}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-semibold">
                                {formatCents(inv.total || 0)}
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {inv.dueDate ? format(new Date(inv.dueDate), "MMM d, yyyy") : "-"}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </div>
          </motion.div>
        ) : null}
      </main>

      <AppFooter />
    </div>
  );
}
