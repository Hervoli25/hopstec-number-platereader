import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import { formatCents } from "@shared/billing";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  CreditCard,
  Car,
  Users,
  Building2,
  ParkingSquare,
  Infinity,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UsageLimits {
  maxWashes: number;
  maxUsers: number;
  maxBranches: number;
  price: number;
  label: string;
}

interface TenantUsage {
  plan: string;
  washCount: number;
  parkingSessionCount: number;
  activeUserCount: number;
  branchCount: number;
  limits: UsageLimits;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function usagePercent(current: number, max: number): number {
  if (max <= 0) return 0; // unlimited
  return Math.min(Math.round((current / max) * 100), 100);
}

function progressColor(percent: number): string {
  if (percent >= 90) return "bg-red-500";
  if (percent >= 70) return "bg-yellow-500";
  return "bg-green-500";
}

// ---------------------------------------------------------------------------
// Usage Meter Component
// ---------------------------------------------------------------------------

function UsageMeter({
  label,
  icon: Icon,
  current,
  max,
}: {
  label: string;
  icon: React.ElementType;
  current: number;
  max: number;
}) {
  const isUnlimited = max === -1;
  const percent = isUnlimited ? 0 : usagePercent(current, max);
  const colorClass = progressColor(percent);

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {current.toLocaleString()} /{" "}
              {isUnlimited ? "Unlimited" : max.toLocaleString()}
            </p>
          </div>
          {isUnlimited ? (
            <Badge variant="secondary" className="gap-1">
              <Infinity className="h-3 w-3" />
              Unlimited
            </Badge>
          ) : (
            <Badge
              variant={percent >= 90 ? "destructive" : percent >= 70 ? "outline" : "secondary"}
            >
              {percent}%
            </Badge>
          )}
        </div>
        {isUnlimited ? (
          <div className="h-4 rounded-full bg-secondary flex items-center justify-center">
            <span className="text-[10px] text-muted-foreground font-medium">
              No limit
            </span>
          </div>
        ) : (
          <div className="relative h-3 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className={`h-full transition-all ${colorClass}`}
              style={{ width: `${percent}%` }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function TenantBilling() {
  const {
    data: usage,
    isLoading,
    isError,
    error,
  } = useQuery<TenantUsage>({
    queryKey: ["/api/tenant/billing/usage"],
  });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Billing & Usage" />

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {/* Back button */}
        <div>
          <Link href="/manager">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : isError ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-destructive">
                Failed to load billing data:{" "}
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </CardContent>
          </Card>
        ) : usage ? (
          <>
            {/* Current Plan Card */}
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CreditCard className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {usage.limits.label} Plan
                    </CardTitle>
                    <CardDescription>
                      {usage.limits.price === 0
                        ? "Free"
                        : `${formatCents(usage.limits.price)}/month`}
                    </CardDescription>
                  </div>
                  <Badge variant="default" className="text-sm capitalize">
                    {usage.plan}
                  </Badge>
                </div>
              </CardHeader>
            </Card>

            {/* Usage Meters */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold">Usage</h2>

              <UsageMeter
                label="Wash Jobs"
                icon={Car}
                current={usage.washCount}
                max={usage.limits.maxWashes}
              />

              <UsageMeter
                label="Active Users"
                icon={Users}
                current={usage.activeUserCount}
                max={usage.limits.maxUsers}
              />

              <UsageMeter
                label="Branches"
                icon={Building2}
                current={usage.branchCount}
                max={usage.limits.maxBranches}
              />
            </div>

            {/* Parking Sessions Info Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <ParkingSquare className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Parking Sessions</p>
                    <p className="text-xs text-muted-foreground">
                      This billing period
                    </p>
                  </div>
                  <p className="text-2xl font-bold">
                    {usage.parkingSessionCount.toLocaleString()}
                  </p>
                </div>
              </CardContent>
            </Card>
          </>
        ) : null}
      </main>
    </div>
  );
}

