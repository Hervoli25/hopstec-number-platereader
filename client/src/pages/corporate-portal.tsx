import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Car,
  Gift,
  Users,
  CheckCircle2,
  Clock,
  Search,
  Phone,
  Mail,
  RotateCcw,
  Star,
  CalendarDays,
} from "lucide-react";

interface CorporatePortalData {
  id: string;
  companyName: string;
  companySlug: string;
  registrationNumber: number;
  registrationCode: string;
  status: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  fleetSize: number | null;
  fleetWashCount: number;
  freeWashCredits: number;
  approvedAt: string | null;
  createdAt: string | null;
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "APPROVED":
      return <Badge className="bg-green-100 text-green-700 border-green-200">Approved</Badge>;
    case "PENDING":
      return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending Approval</Badge>;
    case "REJECTED":
      return <Badge className="bg-red-100 text-red-700 border-red-200">Rejected</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function CorporatePortal() {
  const [inputCode, setInputCode] = useState("");
  const [submittedCode, setSubmittedCode] = useState("");

  const { data, isLoading, error } = useQuery<CorporatePortalData>({
    queryKey: ["/api/corporate/portal", submittedCode],
    queryFn: () => fetch(`/api/corporate/portal/${encodeURIComponent(submittedCode)}`).then(async (r) => {
      if (!r.ok) throw new Error((await r.json()).message || "Not found");
      return r.json();
    }),
    enabled: !!submittedCode,
    retry: false,
  });

  const handleLookup = () => {
    const trimmed = inputCode.trim().toUpperCase();
    if (trimmed) setSubmittedCode(trimmed);
  };

  const handleReset = () => {
    setInputCode("");
    setSubmittedCode("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-2xl mx-auto px-4 py-10 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Building2 className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Corporate Fleet Portal</h1>
            <p className="text-muted-foreground text-sm">
              Enter your registration code to view your account status, credits, and wash history.
            </p>
          </div>

          {/* Lookup form */}
          {!submittedCode ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
              <Card>
                <CardContent className="pt-6 pb-6 space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-code">Registration Code</Label>
                    <div className="flex gap-2">
                      <Input
                        id="reg-code"
                        placeholder="e.g. CORP-ABC123"
                        value={inputCode}
                        onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                        onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                        className="font-mono"
                      />
                      <Button onClick={handleLookup} disabled={!inputCode.trim()} className="gap-2 shrink-0">
                        <Search className="w-4 h-4" />
                        Look Up
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Your registration code was emailed to you when your account was approved. Contact us if you need it re-sent.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          ) : (
            <AnimatePresence mode="wait">
              {isLoading && (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                  <Skeleton className="h-36 rounded-xl" />
                  <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                    <Skeleton className="h-24 rounded-xl" />
                  </div>
                </motion.div>
              )}

              {error && !isLoading && (
                <motion.div key="error" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-900">
                    <CardContent className="py-6 text-center space-y-3">
                      <p className="font-medium text-red-700 dark:text-red-400">Account not found</p>
                      <p className="text-sm text-muted-foreground">
                        No corporate account matched code <span className="font-mono font-semibold">{submittedCode}</span>.
                        Please double-check and try again.
                      </p>
                      <Button variant="outline" size="sm" onClick={handleReset} className="gap-2">
                        <RotateCcw className="w-3.5 h-3.5" />
                        Try again
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {data && !isLoading && (
                <motion.div key="data" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">

                  {/* Company identity card */}
                  <Card>
                    <CardContent className="pt-5 pb-5">
                      <div className="flex items-start justify-between flex-wrap gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h2 className="text-lg font-bold">{data.companyName}</h2>
                            <p className="text-xs text-muted-foreground">Reg #{data.registrationNumber} · Code: <span className="font-mono">{data.registrationCode}</span></p>
                            {data.approvedAt && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                <CalendarDays className="w-3 h-3" />
                                Member since {new Date(data.approvedAt).toLocaleDateString("en-ZA", { year: "numeric", month: "long" })}
                              </p>
                            )}
                          </div>
                        </div>
                        <StatusBadge status={data.status} />
                      </div>

                      {data.status === "PENDING" && (
                        <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
                          Your application is under review. You will be notified once approved.
                        </div>
                      )}

                      {data.status === "APPROVED" && (
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{data.contactEmail}</span>
                          </div>
                          {data.contactPhone && (
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <Phone className="w-3.5 h-3.5 shrink-0" />
                              <span>{data.contactPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {data.status === "APPROVED" && (
                    <>
                      {/* KPI tiles */}
                      <div className="grid grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-4 pb-4 text-center">
                            <Car className="w-5 h-5 mx-auto mb-1 text-primary" />
                            <p className="text-2xl font-bold">{data.fleetWashCount}</p>
                            <p className="text-xs text-muted-foreground">Total washes</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-4 text-center">
                            <Gift className="w-5 h-5 mx-auto mb-1 text-green-600" />
                            <p className="text-2xl font-bold text-green-600">{data.freeWashCredits}</p>
                            <p className="text-xs text-muted-foreground">Free credits</p>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-4 pb-4 text-center">
                            <Users className="w-5 h-5 mx-auto mb-1 text-muted-foreground" />
                            <p className="text-2xl font-bold">{data.fleetSize ?? "—"}</p>
                            <p className="text-xs text-muted-foreground">Fleet size</p>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Free credits explainer */}
                      {data.freeWashCredits > 0 && (
                        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }}>
                          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-800">
                            <CardContent className="py-4 flex items-center gap-3">
                              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                              <div>
                                <p className="text-sm font-semibold text-green-800 dark:text-green-400">
                                  {data.freeWashCredits} free wash credit{data.freeWashCredits !== 1 ? "s" : ""} available
                                </p>
                                <p className="text-xs text-green-700 dark:text-green-500">
                                  Present your registration code at the wash bay to redeem. Credits do not expire.
                                </p>
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      )}

                      {/* Benefits info */}
                      <Card className="border-dashed bg-muted/30">
                        <CardHeader className="pb-2 pt-4">
                          <CardTitle className="text-sm flex items-center gap-2">
                            <Star className="w-4 h-4 text-primary" />
                            Corporate Account Benefits
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-4">
                          <ul className="space-y-1.5 text-sm text-muted-foreground">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              Priority wash queue — your vehicles skip the wait
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              Earn free wash credits automatically as your fleet grows
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              Monthly consolidated invoicing for accounting
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />
                              Dedicated account manager for fleet queries
                            </li>
                          </ul>
                        </CardContent>
                      </Card>

                      {/* Contact prompt */}
                      <Card>
                        <CardContent className="py-4 flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground shrink-0" />
                          <p className="text-sm text-muted-foreground">
                            Need to update your fleet size, add drivers, or request an invoice? Contact your account manager at{" "}
                            <span className="font-medium text-foreground">{data.contactEmail}</span>.
                          </p>
                        </CardContent>
                      </Card>
                    </>
                  )}

                  <Button variant="ghost" size="sm" onClick={handleReset} className="gap-2 text-muted-foreground">
                    <RotateCcw className="w-3.5 h-3.5" />
                    Look up a different account
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          )}

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
