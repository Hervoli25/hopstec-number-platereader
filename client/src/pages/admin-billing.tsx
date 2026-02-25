import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { AppHeader } from "@/components/app-header";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatCents } from "@shared/billing";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Camera,
  Users,
  Building2,
  Car,
  ParkingSquare,
} from "lucide-react";

// --- Types ---

interface BillingSnapshot {
  id: string;
  tenantId: string;
  month: string;
  washCount: number;
  parkingSessionCount: number;
  activeUserCount: number;
  branchCount: number;
  estimatedAmount: number;
  planAtTime: string;
  createdAt: string;
  updatedAt: string;
}

interface BillingResponse {
  snapshots: BillingSnapshot[];
}

// --- Helpers ---

function planBadgeVariant(
  plan: string
): "default" | "secondary" | "destructive" | "outline" {
  switch (plan) {
    case "enterprise":
      return "default";
    case "pro":
      return "secondary";
    case "basic":
      return "outline";
    default:
      return "outline";
  }
}

// --- Component ---

export default function AdminBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [snapshotMonth, setSnapshotMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Fetch all billing snapshots
  const {
    data: billingData,
    isLoading,
    isError,
    error,
  } = useQuery<BillingResponse>({
    queryKey: ["/api/admin/billing"],
  });

  // Generate snapshot mutation
  const generateSnapshotMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/admin/billing/snapshot", {
        month,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
      setDialogOpen(false);
      toast({ title: "Snapshot generated successfully" });
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to generate snapshot",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotMonth || !/^\d{4}-\d{2}$/.test(snapshotMonth)) {
      toast({
        title: "Invalid month format",
        description: "Please use YYYY-MM format (e.g. 2026-02).",
        variant: "destructive",
      });
      return;
    }
    generateSnapshotMutation.mutate(snapshotMonth);
  };

  // Compute total estimated revenue
  const snapshots = billingData?.snapshots ?? [];
  const totalRevenue = snapshots.reduce(
    (sum, s) => sum + (s.estimatedAmount ?? 0),
    0
  );

  // Group snapshots by tenantId for the table
  const groupedByTenant = snapshots.reduce<Record<string, BillingSnapshot[]>>(
    (acc, snap) => {
      if (!acc[snap.tenantId]) {
        acc[snap.tenantId] = [];
      }
      acc[snap.tenantId].push(snap);
      return acc;
    },
    {}
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Billing Overview" />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full space-y-6">
        {/* Back button */}
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        {/* Total Revenue Card */}
        <Card>
          <CardHeader>
            <CardDescription>Total Estimated Revenue</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-500" />
              {formatCents(totalRevenue)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Across {snapshots.length} snapshot{snapshots.length !== 1 ? "s" : ""} from{" "}
              {Object.keys(groupedByTenant).length} tenant
              {Object.keys(groupedByTenant).length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        {/* Action bar */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Billing Snapshots</h2>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Camera className="h-4 w-4 mr-2" />
                Generate Snapshot
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate Billing Snapshot</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleGenerateSnapshot} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label
                    htmlFor="snapshot-month"
                    className="text-sm font-medium"
                  >
                    Month (YYYY-MM)
                  </label>
                  <Input
                    id="snapshot-month"
                    type="month"
                    value={snapshotMonth}
                    onChange={(e) => setSnapshotMonth(e.target.value)}
                    placeholder="2026-02"
                  />
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={generateSnapshotMutation.isPending}
                  >
                    {generateSnapshotMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Generate"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Loading / Error / Data */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
              <p>Loading billing data...</p>
            </CardContent>
          </Card>
        ) : isError ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive">
              <p className="font-medium">Failed to load billing data</p>
              <p className="text-sm mt-1">
                {error instanceof Error ? error.message : "Unknown error"}
              </p>
            </CardContent>
          </Card>
        ) : snapshots.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No billing snapshots found</p>
              <p className="text-sm mt-1">
                Generate a snapshot to start tracking billing across tenants.
              </p>
            </CardContent>
          </Card>
        ) : (
          /* Snapshots Table grouped by tenant */
          Object.entries(groupedByTenant).map(([tenantId, tenantSnapshots]) => (
            <Card key={tenantId}>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Tenant: {tenantId}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <Car className="h-3.5 w-3.5" />
                          Washes
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <ParkingSquare className="h-3.5 w-3.5" />
                          Parking
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          Users
                        </span>
                      </TableHead>
                      <TableHead className="text-right">
                        <span className="inline-flex items-center gap-1">
                          <Building2 className="h-3.5 w-3.5" />
                          Branches
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tenantSnapshots.map((snap) => (
                      <TableRow key={snap.id}>
                        <TableCell className="font-mono">{snap.month}</TableCell>
                        <TableCell>
                          <Badge variant={planBadgeVariant(snap.planAtTime)}>
                            {snap.planAtTime}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {snap.washCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {snap.parkingSessionCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {snap.activeUserCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {snap.branchCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCents(snap.estimatedAmount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ))
        )}
      </main>
    </div>
  );
}
