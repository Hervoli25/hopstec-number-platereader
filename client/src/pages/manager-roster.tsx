import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Clock, Users, Coffee, LogIn, LogOut,
  Calendar, Download, RefreshCw, AlertTriangle, CheckCircle,
  BellRing, X, BarChart2, ChevronDown, ChevronUp, UserX,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { format, startOfWeek, endOfWeek, endOfDay, isToday } from "date-fns";

interface BreakLog {
  type: "lunch" | "short" | "absent";
  startAt: string;
  endAt?: string;
  durationMinutes?: number;
  notes?: string;
}

interface TimeLogEntry {
  id: string;
  technicianId: string;
  clockInAt: string;
  clockOutAt?: string;
  totalMinutes?: number;
  breakLogs: BreakLog[];
  notes?: string;
  createdAt: string;
  technician: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    role: string;
  } | null;
}

interface StaffAlert {
  id: string;
  technicianId: string;
  type: "running_late" | "absent" | "emergency" | "other";
  message: string | null;
  estimatedArrival: string | null;
  acknowledged: boolean;
  acknowledgedBy: string | null;
  acknowledgedAt: string | null;
  createdAt: string;
  technician: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
  } | null;
}

function minutesToHoursDisplay(mins?: number | null) {
  if (!mins) return "—";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getShiftDurationMins(log: TimeLogEntry): number {
  const end = log.clockOutAt ? new Date(log.clockOutAt) : new Date();
  return Math.floor((end.getTime() - new Date(log.clockInAt).getTime()) / 60000);
}

function getTechName(log: TimeLogEntry | { technician: StaffAlert["technician"]; technicianId: string }) {
  if (!log.technician) return log.technicianId.slice(0, 8);
  return `${log.technician.firstName || ""} ${log.technician.lastName || ""}`.trim() || log.technician.email;
}

const ALERT_LABELS: Record<string, { label: string; color: string }> = {
  running_late: { label: "Running Late", color: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  absent: { label: "Absent Today", color: "bg-red-500/15 text-red-700 border-red-500/30" },
  emergency: { label: "Emergency", color: "bg-red-600/20 text-red-800 border-red-600/40" },
  other: { label: "Note", color: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
};

export default function ManagerRoster() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qClient = useQueryClient();
  const canAccess = user?.role === "manager" || user?.role === "admin" || user?.role === "super_admin";

  const today = format(new Date(), "yyyy-MM-dd");
  const [fromDate, setFromDate] = useState(today);
  const [toDate, setToDate] = useState(today);
  const [filterTechId, setFilterTechId] = useState<string>("all");
  const [view, setView] = useState<"today" | "week" | "custom">("today");
  const [rosterView, setRosterView] = useState<"shifts" | "summary">("shifts");
  const [expandedTech, setExpandedTech] = useState<string | null>(null);

  const applyDatePreset = (preset: "today" | "week" | "custom") => {
    setView(preset);
    if (preset === "today") {
      const d = format(new Date(), "yyyy-MM-dd");
      setFromDate(d); setToDate(d);
    } else if (preset === "week") {
      setFromDate(format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
      setToDate(format(endOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd"));
    }
  };

  const { data: activeRoster, isLoading: loadingActive, refetch: refetchActive } = useQuery<TimeLogEntry[]>({
    queryKey: ["/api/manager/roster/active"],
    refetchInterval: 60000,
    enabled: canAccess,
  });

  const { data: logs, isLoading: loadingLogs, refetch: refetchLogs } = useQuery<TimeLogEntry[]>({
    queryKey: ["/api/manager/roster", fromDate, toDate, filterTechId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("fromDate", new Date(fromDate).toISOString());
      params.set("toDate", endOfDay(new Date(toDate)).toISOString());
      if (filterTechId !== "all") params.set("technicianId", filterTechId);
      const res = await fetch(`/api/manager/roster?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load roster");
      return res.json();
    },
    enabled: canAccess,
  });

  const { data: alerts, refetch: refetchAlerts } = useQuery<StaffAlert[]>({
    queryKey: ["/api/manager/alerts"],
    queryFn: async () => {
      const res = await fetch("/api/manager/alerts?unacknowledgedOnly=true", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load alerts");
      return res.json();
    },
    refetchInterval: 60000,
    enabled: canAccess,
  });

  const acknowledgeMutation = useMutation({
    mutationFn: (alertId: string) =>
      fetch(`/api/manager/alerts/${alertId}/acknowledge`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      }).then(r => r.json()),
    onSuccess: () => {
      toast({ title: "Alert acknowledged" });
      qClient.invalidateQueries({ queryKey: ["/api/manager/alerts"] });
    },
  });

  const forceClockOutMutation = useMutation({
    mutationFn: async (logId: string) => {
      const r = await fetch(`/api/manager/roster/force-clockout/${logId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error(err.message || `Server error ${r.status}`);
      }
      return r.json();
    },
    onSuccess: (_, logId) => {
      toast({ title: "Technician clocked out successfully" });
      qClient.invalidateQueries({ queryKey: ["/api/manager/roster/active"] });
      qClient.invalidateQueries({ queryKey: ["/api/manager/roster"] });
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to clock out", variant: "destructive" }),
  });

  // Build technician list from logs for the filter dropdown
  const technicianList = Array.from(
    new Map(
      (logs || [])
        .map(l => [l.technicianId, l.technician] as [string, TimeLogEntry["technician"]])
        .filter(([, t]) => t != null)
    ).values()
  ) as TimeLogEntry["technician"][];

  // Per-employee summary
  const employeeSummary = (() => {
    const map = new Map<string, { technician: TimeLogEntry["technician"]; shifts: number; totalMinutes: number; breakMinutes: number; missedClockOuts: number }>();
    for (const log of (logs || [])) {
      const key = log.technicianId;
      if (!map.has(key)) {
        map.set(key, { technician: log.technician, shifts: 0, totalMinutes: 0, breakMinutes: 0, missedClockOuts: 0 });
      }
      const entry = map.get(key)!;
      entry.shifts++;
      entry.totalMinutes += log.totalMinutes || 0;
      entry.breakMinutes += (log.breakLogs || []).reduce((a, b) => a + (b.durationMinutes || 0), 0);
      if (!log.clockOutAt) entry.missedClockOuts++;
    }
    return Array.from(map.entries()).map(([id, v]) => ({ id, ...v }));
  })();

  // Technicians still clocked in from a previous day (forgot to clock out)
  const overdueClockOuts = (activeRoster || []).filter(
    log => !isToday(new Date(log.clockInAt))
  );

  // Stats
  const totalShifts = logs?.length || 0;
  const totalHours = (logs || []).reduce((acc, l) => acc + (l.totalMinutes || 0), 0);
  const currentlyWorking = activeRoster?.length || 0;
  const lateClockOuts = (logs || []).filter(l => !l.clockOutAt).length;

  const exportCSV = () => {
    if (!logs?.length) return;
    const rows = [
      ["Name", "Email", "Clock In", "Clock Out", "Total Hours", "Breaks", "Notes"].join(","),
      ...(logs || []).map(l => [
        getTechName(l),
        l.technician?.email || "",
        format(new Date(l.clockInAt), "yyyy-MM-dd HH:mm"),
        l.clockOutAt ? format(new Date(l.clockOutAt), "yyyy-MM-dd HH:mm") : "Still In",
        minutesToHoursDisplay(l.totalMinutes),
        (l.breakLogs || []).map(b => `${b.type}(${b.durationMinutes || "?"}min)`).join("; "),
        l.notes || "",
      ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")),
    ];
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `roster-${fromDate}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-muted-foreground">Manager or Admin access required.</p>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-5xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="w-6 h-6 text-primary" />
              Roster & Time Tracking
            </h1>
            <p className="text-muted-foreground text-sm mt-1">Track technician shifts, breaks, and total hours</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchActive(); refetchLogs(); refetchAlerts(); }}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportCSV} disabled={!logs?.length}>
              <Download className="w-4 h-4 mr-1" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Missed Clock-Out Alert — technicians still in from a previous day */}
        {overdueClockOuts.length > 0 && (
          <Card className="mb-6 border-red-500/30 bg-red-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                <UserX className="w-4 h-4" />
                Missed Clock-Out
                <Badge className="bg-red-500 text-white text-xs">{overdueClockOuts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                These technicians have been clocked in since a previous day and likely forgot to clock out. You can clock them out on their behalf.
              </p>
              <div className="space-y-2">
                {overdueClockOuts.map(log => (
                  <div key={log.id} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-red-500/20 bg-background">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                        <UserX className="w-4 h-4 text-red-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{getTechName(log)}</p>
                        <p className="text-xs text-muted-foreground">
                          Clocked in {format(new Date(log.clockInAt), "EEE MMM d")} at {format(new Date(log.clockInAt), "HH:mm")}
                          {" — "}{Math.floor((Date.now() - new Date(log.clockInAt).getTime()) / 3600000)}h ago
                        </p>
                      </div>
                    </div>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="destructive" className="shrink-0 text-xs h-7">
                          <LogOut className="w-3 h-3 mr-1" />
                          Clock Out
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Force Clock-Out</AlertDialogTitle>
                          <AlertDialogDescription>
                            Clock out <strong>{getTechName(log)}</strong> now? Their shift will be recorded as ending at the current time. This action will be logged.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => forceClockOutMutation.mutate(log.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Yes, Clock Out Now
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Staff Alerts Section */}
        {alerts && alerts.length > 0 && (
          <Card className="mb-6 border-amber-500/30 bg-amber-500/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <BellRing className="w-4 h-4" />
                Staff Alerts
                <Badge className="bg-amber-500 text-white text-xs">{alerts.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.map(alert => {
                  const cfg = ALERT_LABELS[alert.type] || ALERT_LABELS.other;
                  return (
                    <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${cfg.color}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">
                            {alert.technician
                              ? `${alert.technician.firstName || ""} ${alert.technician.lastName || ""}`.trim() || alert.technician.email
                              : alert.technicianId.slice(0, 8)}
                          </span>
                          <Badge variant="outline" className="text-xs">{cfg.label}</Badge>
                          {alert.estimatedArrival && (
                            <span className="text-xs">ETA: {alert.estimatedArrival}</span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(alert.createdAt), "HH:mm")}
                          </span>
                        </div>
                        {alert.message && (
                          <p className="text-xs mt-1 text-muted-foreground">{alert.message}</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 text-xs h-7"
                        onClick={() => acknowledgeMutation.mutate(alert.id)}
                        disabled={acknowledgeMutation.isPending}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Done
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <LogIn className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{currentlyWorking}</p>
                <p className="text-xs text-muted-foreground">Currently Working</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalShifts}</p>
                <p className="text-xs text-muted-foreground">Shifts (period)</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{minutesToHoursDisplay(totalHours)}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateClockOuts}</p>
                <p className="text-xs text-muted-foreground">Forgot Clock-Out</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Live Active Staff */}
        {activeRoster && activeRoster.length > 0 && (
          <Card className="mb-6 border-green-500/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live — Currently Clocked In
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {activeRoster.map((log) => {
                  const activeBreak = (log.breakLogs || []).slice(-1)[0];
                  const onBreak = activeBreak && !activeBreak.endAt;
                  return (
                    <div key={log.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm ${onBreak ? "bg-amber-500/10 border border-amber-500/20" : "bg-green-500/10 border border-green-500/20"}`}>
                      <div className={`w-2 h-2 rounded-full ${onBreak ? "bg-amber-500" : "bg-green-500"}`} />
                      <span className="font-medium">{getTechName(log)}</span>
                      <span className="text-xs text-muted-foreground">since {format(new Date(log.clockInAt), "HH:mm")}</span>
                      {onBreak && <Badge variant="secondary" className="text-xs py-0"><Coffee className="w-3 h-3 mr-1" />{activeBreak.type}</Badge>}
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 ml-auto">
                            <LogOut className="w-3 h-3 mr-1" />
                            Clock Out
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Force Clock-Out</AlertDialogTitle>
                            <AlertDialogDescription>
                              Clock out <strong>{getTechName(log)}</strong> now? Their shift will end at the current time. This action will be logged.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => forceClockOutMutation.mutate(log.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Yes, Clock Out Now
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Filters + View Toggle */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex gap-2">
                {(["today", "week", "custom"] as const).map(v => (
                  <Button key={v} variant={view === v ? "default" : "outline"} size="sm" onClick={() => applyDatePreset(v)}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </Button>
                ))}
              </div>
              {view === "custom" && (
                <>
                  <div className="space-y-1">
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="w-36" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="w-36" />
                  </div>
                </>
              )}
              <div className="space-y-1">
                <Label className="text-xs">Technician</Label>
                <Select value={filterTechId} onValueChange={setFilterTechId}>
                  <SelectTrigger className="w-44">
                    <SelectValue placeholder="All technicians" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Technicians</SelectItem>
                    {technicianList.map(t => t && (
                      <SelectItem key={t.id} value={t.id}>
                        {`${t.firstName || ""} ${t.lastName || ""}`.trim() || t.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-1 border rounded-md p-1">
                <button
                  type="button"
                  onClick={() => setRosterView("shifts")}
                  className={`px-3 py-1 text-xs rounded transition-colors ${rosterView === "shifts" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  Shifts
                </button>
                <button
                  type="button"
                  onClick={() => setRosterView("summary")}
                  className={`px-3 py-1 text-xs rounded transition-colors ${rosterView === "summary" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <BarChart2 className="w-3 h-3 inline mr-1" />
                  By Employee
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Per-Employee Summary View */}
        {rosterView === "summary" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Employee Summary</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !employeeSummary.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No data for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {employeeSummary.map(emp => {
                    const isExpanded = expandedTech === emp.id;
                    const empLogs = (logs || []).filter(l => l.technicianId === emp.id);
                    const avgHours = emp.shifts > 0 ? Math.round(emp.totalMinutes / emp.shifts) : 0;
                    const empName = emp.technician
                      ? `${emp.technician.firstName || ""} ${emp.technician.lastName || ""}`.trim() || emp.technician.email
                      : emp.id.slice(0, 8);

                    return (
                      <div key={emp.id} className="rounded-lg border border-border/60">
                        <button
                          type="button"
                          className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/30 transition-colors rounded-lg"
                          onClick={() => setExpandedTech(isExpanded ? null : emp.id)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                              {empName.charAt(0).toUpperCase()}
                            </div>
                            <div className="text-left">
                              <p className="font-semibold text-sm">{empName}</p>
                              <p className="text-xs text-muted-foreground">
                                {emp.shifts} shift{emp.shifts !== 1 ? "s" : ""}
                                {emp.missedClockOuts > 0 && (
                                  <span className="ml-2 text-amber-600">· {emp.missedClockOuts} missed clock-out</span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-base font-bold text-primary">{minutesToHoursDisplay(emp.totalMinutes)}</p>
                              <p className="text-xs text-muted-foreground">avg {minutesToHoursDisplay(avgHours)}/shift</p>
                            </div>
                            {emp.breakMinutes > 0 && (
                              <div className="text-right hidden sm:block">
                                <p className="text-sm font-medium text-muted-foreground">{minutesToHoursDisplay(emp.breakMinutes)}</p>
                                <p className="text-xs text-muted-foreground">break time</p>
                              </div>
                            )}
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="border-t border-border/40 px-4 pb-4">
                            <p className="text-xs text-muted-foreground mt-3 mb-2 font-medium uppercase tracking-wide">Shift Details</p>
                            <div className="space-y-2">
                              {empLogs.map(log => {
                                const shiftMins = log.totalMinutes || 0;
                                const breakMins = (log.breakLogs || []).reduce((a, b) => a + (b.durationMinutes || 0), 0);
                                const stillIn = !log.clockOutAt;
                                return (
                                  <div key={log.id} className="flex items-center gap-3 py-2 border-b border-border/20 last:border-0">
                                    <div className="flex-1 text-xs">
                                      <div className="flex items-center gap-2">
                                        <span className="flex items-center gap-1 text-muted-foreground">
                                          <LogIn className="w-3 h-3" />
                                          {format(new Date(log.clockInAt), "MMM d, h:mm a")}
                                        </span>
                                        {log.clockOutAt && (
                                          <span className="flex items-center gap-1 text-muted-foreground">
                                            <LogOut className="w-3 h-3" />
                                            {format(new Date(log.clockOutAt), "h:mm a")}
                                          </span>
                                        )}
                                        {stillIn && <Badge className="text-xs py-0 bg-green-500/20 text-green-600">Still In</Badge>}
                                        {breakMins > 0 && (
                                          <span className="flex items-center gap-1 text-muted-foreground">
                                            <Coffee className="w-3 h-3" />
                                            {minutesToHoursDisplay(breakMins)} break
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <span className="text-sm font-semibold text-primary shrink-0">{minutesToHoursDisplay(shiftMins)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Shift History (default view) */}
        {rosterView === "shifts" && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Shift History</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingLogs ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : !logs?.length ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p>No shifts recorded for this period.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {logs.map((log) => {
                    const totalShiftMins = getShiftDurationMins(log);
                    const breakMins = (log.breakLogs || []).reduce((a, b) => a + (b.durationMinutes || 0), 0);
                    const workMins = log.clockOutAt ? (log.totalMinutes || 0) : totalShiftMins - breakMins;
                    const stillIn = !log.clockOutAt;
                    const activeBreak = (log.breakLogs || []).slice(-1)[0];
                    const onBreak = activeBreak && !activeBreak.endAt;

                    return (
                      <div key={log.id} className="p-4 rounded-lg bg-muted/40 border border-border/50">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-semibold truncate">{getTechName(log)}</p>
                              {stillIn ? (
                                <Badge className={`text-xs ${onBreak ? "bg-amber-500/20 text-amber-600" : "bg-green-500/20 text-green-600"}`}>
                                  {onBreak ? "On Break" : "Still In"}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Completed</Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <LogIn className="w-3 h-3" />
                                {format(new Date(log.clockInAt), "MMM d, HH:mm")}
                              </span>
                              {log.clockOutAt && (
                                <span className="flex items-center gap-1">
                                  <LogOut className="w-3 h-3" />
                                  {format(new Date(log.clockOutAt), "HH:mm")}
                                </span>
                              )}
                              {breakMins > 0 && (
                                <span className="flex items-center gap-1">
                                  <Coffee className="w-3 h-3" />
                                  {minutesToHoursDisplay(breakMins)} break
                                </span>
                              )}
                            </div>
                            {log.breakLogs && log.breakLogs.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {log.breakLogs.map((b, i) => (
                                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-muted border">
                                    {b.type} {b.durationMinutes ? `(${b.durationMinutes}m)` : b.endAt ? "" : "•ongoing"}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="text-right shrink-0 flex flex-col items-end gap-1">
                            <p className="text-lg font-bold text-primary">{minutesToHoursDisplay(workMins)}</p>
                            <p className="text-xs text-muted-foreground">work time</p>
                            {stillIn && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-6 px-2 text-xs text-destructive border-destructive/40 hover:bg-destructive/10">
                                    <LogOut className="w-3 h-3 mr-1" />
                                    Clock Out
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Force Clock-Out</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Clock out <strong>{getTechName(log)}</strong> now? Their shift will end at the current time. This action will be logged.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => forceClockOutMutation.mutate(log.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Yes, Clock Out Now
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      <AppFooter />
    </div>
  );
}
