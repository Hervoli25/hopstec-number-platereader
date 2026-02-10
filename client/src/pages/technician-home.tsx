import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AppHeader } from "@/components/app-header";
import { CompactFooter } from "@/components/app-footer";
import {
  Car, ParkingSquare, ClipboardList, LayoutDashboard,
  Clock, LogIn, LogOut, Coffee, AlertCircle, BellRing, X,
} from "lucide-react";
import { formatDistanceToNow, format, differenceInHours } from "date-fns";

interface TimeStatus {
  clockedIn: boolean;
  activeLog: {
    id: string;
    clockInAt: string;
    breakLogs: Array<{ type: string; startAt: string; endAt?: string; durationMinutes?: number }>;
  } | null;
}

function getActiveBreak(log: TimeStatus["activeLog"]) {
  if (!log?.breakLogs?.length) return null;
  const last = log.breakLogs[log.breakLogs.length - 1];
  return last && !last.endAt ? last : null;
}

function useTicker() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);
  return tick;
}

function isWorkingHours() {
  const h = new Date().getHours();
  return h >= 6 && h < 23;
}

export default function TechnicianHome() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qClient = useQueryClient();
  const tick = useTicker();

  const [breakDialogOpen, setBreakDialogOpen] = useState(false);
  const [breakType, setBreakType] = useState<"lunch" | "short" | "absent">("short");
  const [breakNotes, setBreakNotes] = useState("");

  const [lateDialogOpen, setLateDialogOpen] = useState(false);
  const [lateType, setLateType] = useState<"running_late" | "absent" | "other">("running_late");
  const [lateMessage, setLateMessage] = useState("");
  const [estimatedArrival, setEstimatedArrival] = useState("");

  // Reminder dismissal state (per page load)
  const [clockInReminderDismissed, setClockInReminderDismissed] = useState(false);
  const [clockOutReminderDismissed, setClockOutReminderDismissed] = useState(false);

  const { data: timeStatus } = useQuery<TimeStatus>({
    queryKey: ["/api/time/status"],
    refetchInterval: 60000,
  });

  const clockInMutation = useMutation({
    mutationFn: () => fetch("/api/time/clock-in", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Clocked in! Have a great shift." }); qClient.invalidateQueries({ queryKey: ["/api/time/status"] }); },
    onError: () => toast({ title: "Failed to clock in", variant: "destructive" }),
  });

  const clockOutMutation = useMutation({
    mutationFn: () => fetch("/api/time/clock-out", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: (data) => {
      const mins = data.log?.totalMinutes || 0;
      toast({ title: `Clocked out. Total: ${Math.floor(mins / 60)}h ${mins % 60}m` });
      qClient.invalidateQueries({ queryKey: ["/api/time/status"] });
    },
    onError: () => toast({ title: "Failed to clock out", variant: "destructive" }),
  });

  const startBreakMutation = useMutation({
    mutationFn: (data: { type: string; notes?: string }) =>
      fetch("/api/time/break/start", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Break started" }); qClient.invalidateQueries({ queryKey: ["/api/time/status"] }); setBreakDialogOpen(false); },
    onError: () => toast({ title: "Failed to start break", variant: "destructive" }),
  });

  const endBreakMutation = useMutation({
    mutationFn: () => fetch("/api/time/break/end", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify({}) }).then(r => r.json()),
    onSuccess: () => { toast({ title: "Break ended, back to work!" }); qClient.invalidateQueries({ queryKey: ["/api/time/status"] }); },
    onError: () => toast({ title: "Failed to end break", variant: "destructive" }),
  });

  const sendAlertMutation = useMutation({
    mutationFn: async (data: { type: string; message?: string; estimatedArrival?: string }) => {
      const r = await fetch("/api/time/alert", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(data) });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        const msg = err.message || `Server error ${r.status}`;
        console.error("Alert send failed:", r.status, msg);
        throw new Error(msg);
      }
      return r.json();
    },
    onSuccess: () => {
      toast({ title: "Management has been notified." });
      setLateDialogOpen(false);
      setLateMessage("");
      setEstimatedArrival("");
      setLateType("running_late");
    },
    onError: (err: any) => toast({ title: err?.message || "Failed to send alert", variant: "destructive" }),
  });

  const initials = user ?
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase()
    : "U";

  const activeBreak = getActiveBreak(timeStatus?.activeLog || null);
  const clockedIn = timeStatus?.clockedIn === true;

  // Compute reminders
  const showClockInReminder = !clockedIn && isWorkingHours() && !clockInReminderDismissed && timeStatus !== undefined;
  const hoursWorked = clockedIn && timeStatus?.activeLog
    ? differenceInHours(new Date(), new Date(timeStatus.activeLog.clockInAt))
    : 0;
  const showClockOutReminder = clockedIn && hoursWorked >= 8 && !clockOutReminderDismissed;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 max-w-lg mx-auto px-4 py-8 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <h1 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.firstName || "Technician"}
              </h1>
            </div>
          </div>
        </motion.div>

        {/* Clock-In Reminder Banner */}
        {showClockInReminder && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30"
          >
            <BellRing className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-amber-700 dark:text-amber-400">Don't forget to clock in!</p>
              <p className="text-xs text-muted-foreground">Tap "Clock In" below to start tracking your shift.</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss clock-in reminder"
              onClick={() => setClockInReminderDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Clock-Out Reminder Banner */}
        {showClockOutReminder && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 flex items-start gap-3 p-3 rounded-lg bg-orange-500/10 border border-orange-500/30"
          >
            <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400">You've been working for {hoursWorked}+ hours</p>
              <p className="text-xs text-muted-foreground">Remember to clock out when your shift ends.</p>
            </div>
            <button
              type="button"
              aria-label="Dismiss clock-out reminder"
              onClick={() => setClockOutReminderDismissed(true)}
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Clock In / Out Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mb-6"
        >
          <Card className={`p-5 border-2 ${clockedIn ? "border-green-500/40 bg-green-500/5" : "border-muted"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${clockedIn ? "bg-green-500/20" : "bg-muted"}`}>
                  <Clock className={`w-6 h-6 ${clockedIn ? "text-green-500" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-base">
                      {clockedIn ? "Clocked In" : "Clocked Out"}
                    </p>
                    {clockedIn && (
                      <Badge className="bg-green-500/20 text-green-600 text-xs">Active</Badge>
                    )}
                    {activeBreak && (
                      <Badge variant="secondary" className="text-xs">
                        <Coffee className="w-3 h-3 mr-1" />
                        On Break
                      </Badge>
                    )}
                  </div>
                  {clockedIn && timeStatus?.activeLog && (
                    <p className="text-xs text-muted-foreground">
                      Since {format(new Date(timeStatus.activeLog.clockInAt), "h:mm a")}
                      {" · "}
                      {formatDistanceToNow(new Date(timeStatus.activeLog.clockInAt))}
                    </p>
                  )}
                  {!clockedIn && (
                    <p className="text-xs text-muted-foreground">Tap to start your shift</p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2 items-end">
                {!clockedIn ? (
                  <Button
                    size="sm"
                    className="bg-green-600 hover:bg-green-700 text-white"
                    onClick={() => clockInMutation.mutate()}
                    disabled={clockInMutation.isPending}
                  >
                    <LogIn className="w-4 h-4 mr-1" />
                    {clockInMutation.isPending ? "..." : "Clock In"}
                  </Button>
                ) : (
                  <>
                    {activeBreak ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => endBreakMutation.mutate()}
                        disabled={endBreakMutation.isPending}
                      >
                        <AlertCircle className="w-4 h-4 mr-1 text-amber-500" />
                        End Break
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBreakDialogOpen(true)}
                      >
                        <Coffee className="w-4 h-4 mr-1" />
                        Break
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => clockOutMutation.mutate()}
                      disabled={clockOutMutation.isPending}
                    >
                      <LogOut className="w-4 h-4 mr-1" />
                      {clockOutMutation.isPending ? "..." : "Clock Out"}
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Running Late button — always visible below clock card */}
            <div className="mt-4 pt-3 border-t border-border/50">
              <button
                type="button"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-amber-600 transition-colors"
                onClick={() => setLateDialogOpen(true)}
              >
                <BellRing className="w-4 h-4" />
                Running late or can't make it? Notify management
              </button>
            </div>
          </Card>
        </motion.div>

        {/* Break Dialog */}
        <Dialog open={breakDialogOpen} onOpenChange={setBreakDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Log a Break</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Break Type</Label>
                <Select value={breakType} onValueChange={(v: typeof breakType) => setBreakType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="short">Short Break (5–15 min)</SelectItem>
                    <SelectItem value="lunch">Lunch Break (30–60 min)</SelectItem>
                    <SelectItem value="absent">Absent / Leaving Early</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Notes <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  value={breakNotes}
                  onChange={(e) => setBreakNotes(e.target.value)}
                  placeholder="Reason or notes..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setBreakDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={() => startBreakMutation.mutate({ type: breakType, notes: breakNotes || undefined })}
                disabled={startBreakMutation.isPending}
              >
                {startBreakMutation.isPending ? "Starting..." : "Start Break"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Running Late / Alert Dialog */}
        <Dialog open={lateDialogOpen} onOpenChange={setLateDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <BellRing className="w-5 h-5 text-amber-500" />
                Notify Management
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Select value={lateType} onValueChange={(v: typeof lateType) => setLateType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="running_late">Running Late</SelectItem>
                    <SelectItem value="absent">Can't Make It Today</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {lateType === "running_late" && (
                <div className="space-y-2">
                  <Label>Estimated Arrival Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
                  <Input
                    type="time"
                    value={estimatedArrival}
                    onChange={(e) => setEstimatedArrival(e.target.value)}
                  />
                </div>
              )}
              <div className="space-y-2">
                <Label>Message <span className="text-muted-foreground text-xs">(optional)</span></Label>
                <Textarea
                  value={lateMessage}
                  onChange={(e) => setLateMessage(e.target.value)}
                  placeholder="Any additional details..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLateDialogOpen(false)}>Cancel</Button>
              <Button
                className="bg-amber-600 hover:bg-amber-700 text-white"
                onClick={() => sendAlertMutation.mutate({
                  type: lateType,
                  message: lateMessage || undefined,
                  estimatedArrival: estimatedArrival || undefined,
                })}
                disabled={sendAlertMutation.isPending}
              >
                {sendAlertMutation.isPending ? "Sending..." : "Send Notification"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-medium text-muted-foreground">Quick Actions</h2>

          <div className="grid gap-4">
            <Link href="/scan/carwash">
              <Card
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
                data-testid="card-carwash-scan"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">Carwash Scan</h3>
                    <p className="text-muted-foreground">Scan plate to start wash job</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/scan/parking">
              <Card
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-accent to-accent/50 border-accent-foreground/10"
                data-testid="card-parking-scan"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
                    <ParkingSquare className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">Parking Scan</h3>
                    <p className="text-muted-foreground">Entry or exit vehicle</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-4"
        >
          <h2 className="text-lg font-medium text-muted-foreground">My Work</h2>

          <Link href="/my-jobs">
            <Card
              className="p-4 hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-my-jobs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">My Active Jobs</h3>
                  <p className="text-sm text-muted-foreground">View and update wash jobs</p>
                </div>
              </div>
            </Card>
          </Link>

          <Link href="/parking">
            <Card
              className="p-4 hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-parking-dashboard"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <LayoutDashboard className="w-5 h-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">Parking Dashboard</h3>
                  <p className="text-sm text-muted-foreground">Active sessions, zones & VIPs</p>
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      </main>

      <CompactFooter />
    </div>
  );
}
