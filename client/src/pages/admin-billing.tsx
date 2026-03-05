import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { BILLING_PLANS, PLAN_BADGE_CONFIG, formatCents } from "@shared/billing";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  DollarSign,
  Loader2,
  Camera,
  Users,
  Building2,
  Car,
  ParkingSquare,
  FileText,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertCircle,
  XCircle,
  Receipt,
  Plus,
  Download,
  CreditCard,
  Eye,
  Send,
} from "lucide-react";
import { format } from "date-fns";
import InvoicePreview, { downloadInvoicePDF } from "@/components/invoice-preview";

// ─── Types ──────────────────────────────────────────────────────────────────

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
}

interface Invoice {
  id: string;
  tenantId: string;
  invoiceNumber: string;
  status: "draft" | "pending" | "paid" | "overdue" | "cancelled";
  periodStart: string;
  periodEnd: string;
  subtotal: number;
  tax: number;
  total: number;
  planAtTime: string;
  washCount: number;
  parkingSessionCount: number;
  activeUserCount: number;
  branchCount: number;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  issuedAt: string | null;
  dueDate: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

interface TenantBasic {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
}

interface BillingResponse {
  snapshots: BillingSnapshot[];
  invoices: Invoice[];
  tenants: TenantBasic[];
}

// ─── Status Helpers ─────────────────────────────────────────────────────────

const INVOICE_STATUS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string; badgeVariant: "default" | "secondary" | "destructive" | "outline" }> = {
  draft: { label: "Draft", icon: FileText, color: "text-gray-500", badgeVariant: "outline" },
  pending: { label: "Pending", icon: Clock, color: "text-yellow-600", badgeVariant: "secondary" },
  paid: { label: "Paid", icon: CheckCircle2, color: "text-green-600", badgeVariant: "default" },
  overdue: { label: "Overdue", icon: AlertCircle, color: "text-red-600", badgeVariant: "destructive" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-gray-500", badgeVariant: "outline" },
};

function getTenantName(tenants: TenantBasic[], tenantId: string): string {
  return tenants.find((t) => t.id === tenantId)?.name || tenantId.slice(0, 8);
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function AdminBilling() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);
  const [snapshotMonth, setSnapshotMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [invoiceTenantId, setInvoiceTenantId] = useState("");
  const [invoiceMonth, setInvoiceMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Fetch billing data
  const { data: billingData, isLoading, isError, error } = useQuery<BillingResponse>({
    queryKey: ["/api/admin/billing"],
  });

  // Generate snapshot mutation
  const generateSnapshotMutation = useMutation({
    mutationFn: async (month: string) => {
      const res = await apiRequest("POST", "/api/admin/billing/snapshot", { month });
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
      setSnapshotDialogOpen(false);
      toast({ title: "Snapshots generated", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate snapshot", description: err.message, variant: "destructive" });
    },
  });

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: async (data: { tenantId: string; month: string }) => {
      const res = await apiRequest("POST", "/api/admin/invoices", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
      setInvoiceDialogOpen(false);
      toast({ title: "Invoice generated successfully" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to generate invoice", description: err.message, variant: "destructive" });
    },
  });

  // Update invoice status
  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/invoices/${id}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
      toast({ title: "Invoice updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update invoice", description: err.message, variant: "destructive" });
    },
  });

  // Send invoice email
  const sendInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      const res = await apiRequest("POST", `/api/admin/invoices/${invoiceId}/send`);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/billing"] });
      toast({ title: "Invoice sent", description: data.message });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to send invoice", description: err.message, variant: "destructive" });
    },
  });

  const snapshots = billingData?.snapshots ?? [];
  const allInvoices = billingData?.invoices ?? [];
  const tenants = billingData?.tenants ?? [];

  // Revenue calculations
  const totalMRR = tenants.reduce((sum, t) => {
    const planKey = t.plan as keyof typeof BILLING_PLANS;
    return sum + (BILLING_PLANS[planKey]?.price || 0);
  }, 0);
  const paidInvoicesTotal = allInvoices.filter((i) => i.status === "paid").reduce((sum, i) => sum + (i.total || 0), 0);
  const pendingInvoicesTotal = allInvoices.filter((i) => i.status === "pending").reduce((sum, i) => sum + (i.total || 0), 0);
  const overdueInvoicesTotal = allInvoices.filter((i) => i.status === "overdue").reduce((sum, i) => sum + (i.total || 0), 0);

  const handleGenerateSnapshot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!snapshotMonth || !/^\d{4}-\d{2}$/.test(snapshotMonth)) {
      toast({ title: "Invalid month format", variant: "destructive" });
      return;
    }
    generateSnapshotMutation.mutate(snapshotMonth);
  };

  const handleGenerateInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceTenantId) {
      toast({ title: "Select a tenant", variant: "destructive" });
      return;
    }
    generateInvoiceMutation.mutate({ tenantId: invoiceTenantId, month: invoiceMonth });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Billing & Revenue" />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full space-y-6">
        <Link href="/">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Home
          </Button>
        </Link>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Revenue Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-green-500/20 bg-green-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Monthly MRR</p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{formatCents(totalMRR)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid</p>
                    <p className="text-2xl font-bold">{formatCents(paidInvoicesTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-yellow-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{formatCents(pendingInvoicesTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className={overdueInvoicesTotal > 0 ? "border-red-500/20 bg-red-500/5" : ""}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Overdue</p>
                    <p className="text-2xl font-bold">{formatCents(overdueInvoicesTotal)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs: Invoices / Snapshots */}
          <Tabs defaultValue="invoices" className="space-y-4">
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="invoices" className="gap-2">
                  <Receipt className="h-4 w-4" /> Invoices
                </TabsTrigger>
                <TabsTrigger value="snapshots" className="gap-2">
                  <Camera className="h-4 w-4" /> Usage Snapshots
                </TabsTrigger>
              </TabsList>

              <div className="flex gap-2">
                {/* Generate Invoice Dialog */}
                <Dialog open={invoiceDialogOpen} onOpenChange={setInvoiceDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" /> New Invoice
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate Invoice</DialogTitle>
                      <DialogDescription>Create a new invoice for a tenant based on their current plan.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleGenerateInvoice} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Tenant</label>
                        <Select value={invoiceTenantId} onValueChange={setInvoiceTenantId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select tenant" />
                          </SelectTrigger>
                          <SelectContent>
                            {tenants.map((t) => (
                              <SelectItem key={t.id} value={t.id}>
                                {t.name} ({t.plan})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Billing Period (Month)</label>
                        <Input
                          type="month"
                          value={invoiceMonth}
                          onChange={(e) => setInvoiceMonth(e.target.value)}
                          aria-label="Invoice billing month"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setInvoiceDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={generateInvoiceMutation.isPending}>
                          {generateInvoiceMutation.isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                          ) : (
                            <><FileText className="h-4 w-4 mr-2" /> Generate</>
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Generate Snapshot Dialog */}
                <Dialog open={snapshotDialogOpen} onOpenChange={setSnapshotDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Camera className="h-4 w-4 mr-2" /> Take Snapshot
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Generate Usage Snapshot</DialogTitle>
                      <DialogDescription>
                        Captures current usage for all active tenants for the selected month. Also generates invoices for paid plans.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleGenerateSnapshot} className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Month</label>
                        <Input
                          type="month"
                          value={snapshotMonth}
                          onChange={(e) => setSnapshotMonth(e.target.value)}
                          aria-label="Snapshot month"
                        />
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setSnapshotDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={generateSnapshotMutation.isPending}>
                          {generateSnapshotMutation.isPending ? (
                            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
                          ) : (
                            "Generate"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Invoices Tab */}
            <TabsContent value="invoices">
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
                    <p className="text-sm mt-1">{error instanceof Error ? error.message : "Unknown error"}</p>
                  </CardContent>
                </Card>
              ) : allInvoices.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No invoices yet</p>
                    <p className="text-sm mt-1">Generate your first invoice or take a usage snapshot to auto-generate invoices for paid tenants.</p>
                    <div className="flex gap-2 justify-center mt-4">
                      <Button size="sm" onClick={() => setInvoiceDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" /> Create Invoice
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setSnapshotDialogOpen(true)}>
                        <Camera className="h-4 w-4 mr-2" /> Take Snapshot
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Invoice #</TableHead>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">Due Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allInvoices.map((inv) => {
                          const statusConf = INVOICE_STATUS_CONFIG[inv.status] || INVOICE_STATUS_CONFIG.draft;
                          const StatusIcon = statusConf.icon;
                          return (
                            <TableRow key={inv.id}>
                              <TableCell className="font-mono text-sm">{inv.invoiceNumber}</TableCell>
                              <TableCell className="font-medium">{getTenantName(tenants, inv.tenantId)}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {inv.periodStart ? format(new Date(inv.periodStart), "MMM yyyy") : "-"}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-xs capitalize">{inv.planAtTime}</Badge>
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
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    title="View Invoice"
                                    onClick={() => setPreviewInvoice(inv)}
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0"
                                    title="Download PDF"
                                    onClick={() => downloadInvoicePDF(inv, getTenantName(tenants, inv.tenantId))}
                                  >
                                    <Download className="h-3.5 w-3.5" />
                                  </Button>
                                  {inv.status !== "paid" && inv.status !== "cancelled" && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0"
                                      title="Send to Tenant"
                                      onClick={() => sendInvoiceMutation.mutate(inv.id)}
                                      disabled={sendInvoiceMutation.isPending}
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                  {(inv.status === "pending" || inv.status === "overdue") && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-7 text-xs ml-1"
                                      onClick={() => updateInvoiceMutation.mutate({ id: inv.id, status: "paid" })}
                                      disabled={updateInvoiceMutation.isPending}
                                    >
                                      <CheckCircle2 className="h-3 w-3 mr-1" /> Paid
                                    </Button>
                                  )}
                                  {inv.status === "paid" && inv.paidAt && (
                                    <span className="text-xs text-muted-foreground ml-1">
                                      {format(new Date(inv.paidAt), "MMM d")}
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Snapshots Tab */}
            <TabsContent value="snapshots">
              {isLoading ? (
                <Card>
                  <CardContent className="py-12 text-center text-muted-foreground">
                    <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin" />
                    <p>Loading snapshots...</p>
                  </CardContent>
                </Card>
              ) : snapshots.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center text-muted-foreground">
                    <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">No usage snapshots yet</p>
                    <p className="text-sm mt-1">Take a snapshot to capture current tenant usage for billing purposes.</p>
                    <Button className="mt-4" size="sm" onClick={() => setSnapshotDialogOpen(true)}>
                      <Camera className="h-4 w-4 mr-2" /> Take Snapshot
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Tenant</TableHead>
                          <TableHead>Month</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><Car className="h-3.5 w-3.5" /> Washes</span>
                          </TableHead>
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><ParkingSquare className="h-3.5 w-3.5" /> Parking</span>
                          </TableHead>
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" /> Users</span>
                          </TableHead>
                          <TableHead className="text-right">
                            <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5" /> Branches</span>
                          </TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {snapshots.map((snap) => (
                          <TableRow key={snap.id}>
                            <TableCell className="font-medium">{getTenantName(tenants, snap.tenantId)}</TableCell>
                            <TableCell className="font-mono text-sm">{snap.month}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs capitalize">{snap.planAtTime}</Badge>
                            </TableCell>
                            <TableCell className="text-right">{snap.washCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{snap.parkingSessionCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{snap.activeUserCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right">{snap.branchCount.toLocaleString()}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCents(snap.estimatedAmount)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Per-Tenant Revenue Breakdown */}
          {tenants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Revenue by Tenant
                </CardTitle>
                <CardDescription>Current monthly subscription revenue per tenant</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {tenants.map((tenant) => {
                    const planKey = tenant.plan as keyof typeof BILLING_PLANS;
                    const plan = BILLING_PLANS[planKey];
                    const tenantInvoices = allInvoices.filter((i) => i.tenantId === tenant.id);
                    const paidTotal = tenantInvoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.total || 0), 0);

                    return (
                      <div key={tenant.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {tenant.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{tenant.name}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline" className="text-[10px] capitalize">{tenant.plan}</Badge>
                              <span>{tenantInvoices.length} invoice{tenantInvoices.length !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{plan ? formatCents(plan.price) : "$0.00"}<span className="text-xs text-muted-foreground font-normal">/mo</span></p>
                          {paidTotal > 0 && (
                            <p className="text-xs text-green-600">{formatCents(paidTotal)} collected</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </main>

      <AppFooter />

      {/* Invoice Preview Dialog */}
      {previewInvoice && (
        <InvoicePreview
          invoice={previewInvoice}
          tenant={tenants.find((t) => t.id === previewInvoice.tenantId)}
          open={!!previewInvoice}
          onOpenChange={(open) => { if (!open) setPreviewInvoice(null); }}
          onSendInvoice={(id) => sendInvoiceMutation.mutate(id)}
          isSending={sendInvoiceMutation.isPending}
        />
      )}
    </div>
  );
}
