import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Building2, Search, Mail, Phone, Users, Calendar,
  CheckCircle2, AlertTriangle, XCircle, Clock, Hash,
  Loader2, Car, Gift, FileText, RotateCcw, Trash2,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CorporateAccount {
  id: string;
  companyName: string;
  companySlug: string;
  registrationNumber: number;
  registrationCode: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  fleetSize: number | null;
  fleetWashCount: number;
  freeWashCredits: number;
  managementNote: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

type CorporateStatus = "PENDING" | "APPROVED" | "REJECTED";

const STATUS_CONFIG: Record<CorporateStatus, { label: string; icon: React.ElementType; color: string; bgClass: string; badgeVariant: string }> = {
  PENDING: { label: "Pending", icon: Clock, color: "text-yellow-500", bgClass: "bg-yellow-500/10", badgeVariant: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400" },
  APPROVED: { label: "Approved", icon: CheckCircle2, color: "text-green-500", bgClass: "bg-green-500/10", badgeVariant: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" },
  REJECTED: { label: "Rejected", icon: XCircle, color: "text-red-500", bgClass: "bg-red-500/10", badgeVariant: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" },
};

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminCorporate() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<CorporateAccount | null>(null);
  const [managementNote, setManagementNote] = useState("");

  // Fetch all corporate accounts
  const { data: accounts = [], isLoading } = useQuery<CorporateAccount[]>({
    queryKey: ["/api/corporate/accounts"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/corporate/accounts");
      return res.json();
    },
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/corporate/accounts/${id}/approve`, { managementNote: note });
      if (!res.ok) throw new Error("Failed to approve");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/accounts"] });
      setSelectedAccount(null);
      setManagementNote("");
      toast({ title: "Account Approved", description: "Corporate account has been approved and the customer has been notified." });
    },
    onError: () => toast({ title: "Error", description: "Failed to approve account.", variant: "destructive" }),
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ id, note }: { id: string; note?: string }) => {
      const res = await apiRequest("PATCH", `/api/corporate/accounts/${id}/reject`, { managementNote: note });
      if (!res.ok) throw new Error("Failed to reject");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/accounts"] });
      setSelectedAccount(null);
      setManagementNote("");
      toast({ title: "Account Rejected", description: "Corporate account has been rejected." });
    },
    onError: () => toast({ title: "Error", description: "Failed to reject account.", variant: "destructive" }),
  });

  // Reset to PENDING mutation
  const resetMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("PATCH", `/api/corporate/accounts/${id}/reset`);
      if (!res.ok) throw new Error("Failed to reset");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/accounts"] });
      setSelectedAccount(null);
      setManagementNote("");
      toast({ title: "Account Reset", description: "Corporate account has been reset to pending." });
    },
    onError: () => toast({ title: "Error", description: "Failed to reset account.", variant: "destructive" }),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/corporate/accounts/${id}`, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate/accounts"] });
      setSelectedAccount(null);
      setManagementNote("");
      toast({ title: "Account Deleted", description: "Corporate account has been permanently deleted." });
    },
    onError: () => toast({ title: "Error", description: "Failed to delete account.", variant: "destructive" }),
  });

  // Filter accounts
  const filtered = accounts.filter((a) => {
    const matchesTab = a.status === activeTab;
    const matchesSearch = !searchQuery || 
      a.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.registrationCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.contactEmail.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const pendingCount = accounts.filter((a) => a.status === "PENDING").length;
  const approvedCount = accounts.filter((a) => a.status === "APPROVED").length;
  const rejectedCount = accounts.filter((a) => a.status === "REJECTED").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Corporate Accounts" />

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4">
          {([["PENDING", pendingCount, Clock, "text-yellow-500"], ["APPROVED", approvedCount, CheckCircle2, "text-green-500"], ["REJECTED", rejectedCount, XCircle, "text-red-500"]] as const).map(([status, count, Icon, color]) => (
            <Card key={status} className="cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => setActiveTab(status)}>
              <CardContent className="pt-4 pb-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${STATUS_CONFIG[status].bgClass}`}><Icon className={`h-5 w-5 ${color}`} /></div>
                <div><p className="text-2xl font-bold">{count}</p><p className="text-xs text-muted-foreground">{status}</p></div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by company, code, contact..." className="pl-9" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>

        {/* Tabs + List */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full">
            <TabsTrigger value="PENDING">Pending ({pendingCount})</TabsTrigger>
            <TabsTrigger value="APPROVED">Approved ({approvedCount})</TabsTrigger>
            <TabsTrigger value="REJECTED">Rejected ({rejectedCount})</TabsTrigger>
          </TabsList>
          {(["PENDING", "APPROVED", "REJECTED"] as CorporateStatus[]).map((tab) => (
            <TabsContent key={tab} value={tab} className="space-y-3 mt-4">
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)
              ) : filtered.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p>No {tab.toLowerCase()} corporate accounts{searchQuery ? " matching your search" : ""}</p>
                </CardContent></Card>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filtered.map((account) => {
                    const cfg = STATUS_CONFIG[account.status];
                    const StatusIcon = cfg.icon;
                    return (
                      <motion.div key={account.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} layout>
                        <Card className="cursor-pointer hover:ring-2 ring-primary/20 transition-all" onClick={() => { setSelectedAccount(account); setManagementNote(account.managementNote || ""); }}>
                          <CardContent className="py-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <Building2 className="h-4 w-4 text-primary shrink-0" />
                                  <h3 className="font-semibold truncate">{account.companyName}</h3>
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeVariant}`}>
                                    <StatusIcon className="h-3 w-3" /> {cfg.label}
                                  </span>
                                </div>
                                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                                  <span className="inline-flex items-center gap-1"><Hash className="h-3 w-3" />{account.registrationCode}</span>
                                  <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" />{account.contactName}</span>
                                  <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{account.contactEmail}</span>
                                  {account.contactPhone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{account.contactPhone}</span>}
                                  {account.fleetSize && <span className="inline-flex items-center gap-1"><Car className="h-3 w-3" />Fleet: {account.fleetSize}</span>}
                                  {account.createdAt && <span className="inline-flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(account.createdAt), "dd MMM yyyy")}</span>}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </main>

      {/* Detail / Review Dialog */}
      <Dialog open={!!selectedAccount} onOpenChange={(open) => { if (!open) { setSelectedAccount(null); setManagementNote(""); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          {selectedAccount && (() => {
            const a = selectedAccount;
            const cfg = STATUS_CONFIG[a.status];
            const StatusIcon = cfg.icon;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" /> {a.companyName}
                  </DialogTitle>
                  <DialogDescription>Review corporate account application</DialogDescription>
                </DialogHeader>

                <div className="space-y-4 mt-2">
                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${cfg.badgeVariant}`}>
                      <StatusIcon className="h-4 w-4" /> {cfg.label}
                    </span>
                    {a.approvedAt && <span className="text-xs text-muted-foreground">on {format(new Date(a.approvedAt), "dd MMM yyyy HH:mm")}</span>}
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><p className="text-muted-foreground text-xs">Registration Code</p><p className="font-mono font-medium">{a.registrationCode}</p></div>
                    <div><p className="text-muted-foreground text-xs">Registration #</p><p className="font-medium">{a.registrationNumber}</p></div>
                    <div><p className="text-muted-foreground text-xs">Contact Name</p><p className="font-medium">{a.contactName}</p></div>
                    <div><p className="text-muted-foreground text-xs">Contact Email</p><p className="font-medium">{a.contactEmail}</p></div>
                    {a.contactPhone && <div><p className="text-muted-foreground text-xs">Phone</p><p className="font-medium">{a.contactPhone}</p></div>}
                    {a.fleetSize && <div><p className="text-muted-foreground text-xs">Fleet Size</p><p className="font-medium">{a.fleetSize} vehicles</p></div>}
                    <div><p className="text-muted-foreground text-xs">Fleet Washes</p><p className="font-medium">{a.fleetWashCount}</p></div>
                    <div><p className="text-muted-foreground text-xs">Free Wash Credits</p><p className="font-medium flex items-center gap-1"><Gift className="h-3 w-3 text-green-500" />{a.freeWashCredits}</p></div>
                    {a.createdAt && <div><p className="text-muted-foreground text-xs">Applied</p><p className="font-medium">{format(new Date(a.createdAt), "dd MMM yyyy HH:mm")}</p></div>}
                    {a.approvedBy && <div><p className="text-muted-foreground text-xs">Approved By</p><p className="font-medium">{a.approvedBy}</p></div>}
                  </div>

                  {/* Management Note */}
                  {a.managementNote && a.status !== "PENDING" && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1"><FileText className="h-3 w-3" /> Management Note</p>
                      <p className="text-sm">{a.managementNote}</p>
                    </div>
                  )}

                  {/* Action area for PENDING accounts */}
                  {a.status === "PENDING" && (
                    <div className="space-y-3 border-t pt-4">
                      <div>
                        <label className="text-sm font-medium">Management Note (optional)</label>
                        <Textarea placeholder="Add a note about this decision..." value={managementNote} onChange={(e) => setManagementNote(e.target.value)} className="mt-1" rows={3} />
                      </div>
                      <div className="flex gap-2">
                        <Button className="flex-1" onClick={() => approveMutation.mutate({ id: a.id, note: managementNote || undefined })} disabled={approveMutation.isPending || rejectMutation.isPending}>
                          {approveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />} Approve
                        </Button>
                        <Button variant="destructive" className="flex-1" onClick={() => rejectMutation.mutate({ id: a.id, note: managementNote || undefined })} disabled={approveMutation.isPending || rejectMutation.isPending}>
                          {rejectMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />} Reject
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions for APPROVED / REJECTED accounts */}
                  {a.status !== "PENDING" && (
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" onClick={() => resetMutation.mutate(a.id)} disabled={resetMutation.isPending || deleteMutation.isPending}>
                          {resetMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RotateCcw className="h-4 w-4 mr-2" />} Reset to Pending
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" className="flex-1" disabled={resetMutation.isPending || deleteMutation.isPending}>
                              {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />} Delete
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Corporate Account</AlertDialogTitle>
                              <AlertDialogDescription>
                                This will permanently delete <strong>{a.companyName}</strong> ({a.registrationCode}). This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMutation.mutate(a.id)}>
                                Delete Permanently
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}

