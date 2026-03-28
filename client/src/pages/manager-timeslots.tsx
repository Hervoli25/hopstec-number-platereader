import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  Clock,
  Save,
  CalendarDays,
  Users,
  Timer,
  Activity,
  Package,
  DollarSign,
  BarChart3,
  ClipboardList,
  Settings,
  Bell,
  CheckCircle2,
  Info,
} from "lucide-react";

interface TimeSlotConfig {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotIntervalMinutes: number;
  maxConcurrentBookings: number;
  isActive: boolean;
}

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function generateSlotPreview(start: string, end: string, interval: number): string[] {
  const slots: string[] = [];
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let mins = sh * 60 + sm;
  const endMins = eh * 60 + em;
  while (mins < endMins) {
    const h = Math.floor(mins / 60).toString().padStart(2, "0");
    const m = (mins % 60).toString().padStart(2, "0");
    slots.push(`${h}:${m}`);
    mins += interval;
  }
  return slots;
}

function DayRow({
  config,
  onChange,
}: {
  config: TimeSlotConfig;
  onChange: (updated: TimeSlotConfig) => void;
}) {
  const slots = config.isActive
    ? generateSlotPreview(config.startTime, config.endTime, config.slotIntervalMinutes)
    : [];

  return (
    <Card className={`transition-all ${!config.isActive ? "opacity-60" : ""}`}>
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          {/* Day + Active toggle */}
          <div className="flex items-center gap-3 sm:w-40 shrink-0">
            <Switch
              checked={config.isActive}
              onCheckedChange={(v) => onChange({ ...config, isActive: v })}
              id={`active-${config.dayOfWeek}`}
            />
            <Label htmlFor={`active-${config.dayOfWeek}`} className="text-sm font-semibold cursor-pointer">
              {DAYS[config.dayOfWeek]}
            </Label>
          </div>

          {config.isActive && (
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Start time */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Opens</Label>
                <Input
                  type="time"
                  value={config.startTime}
                  onChange={(e) => onChange({ ...config, startTime: e.target.value })}
                  className="text-sm h-8"
                />
              </div>

              {/* End time */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Closes</Label>
                <Input
                  type="time"
                  value={config.endTime}
                  onChange={(e) => onChange({ ...config, endTime: e.target.value })}
                  className="text-sm h-8"
                />
              </div>

              {/* Slot interval */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Slot interval</Label>
                <select
                  value={config.slotIntervalMinutes}
                  onChange={(e) => onChange({ ...config, slotIntervalMinutes: parseInt(e.target.value) })}
                  className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 py-0 focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {INTERVAL_OPTIONS.map((i) => (
                    <option key={i} value={i}>
                      {i >= 60 ? `${i / 60}h` : `${i}min`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Max concurrent */}
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Max per slot</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={1}
                    max={20}
                    value={config.maxConcurrentBookings}
                    onChange={(e) => onChange({ ...config, maxConcurrentBookings: parseInt(e.target.value) || 1 })}
                    className="text-sm h-8"
                  />
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                </div>
              </div>
            </div>
          )}

          {!config.isActive && (
            <p className="text-sm text-muted-foreground italic">Closed — no bookings accepted</p>
          )}
        </div>

        {/* Slot preview */}
        {config.isActive && slots.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">
              {slots.length} available slot{slots.length !== 1 ? "s" : ""} · up to {config.maxConcurrentBookings} booking{config.maxConcurrentBookings !== 1 ? "s" : ""} each
            </p>
            <div className="flex flex-wrap gap-1.5">
              {slots.slice(0, 12).map((s) => (
                <Badge key={s} variant="outline" className="text-xs font-mono">
                  {s}
                </Badge>
              ))}
              {slots.length > 12 && (
                <Badge variant="secondary" className="text-xs">
                  +{slots.length - 12} more
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

const DEFAULT_CONFIG: TimeSlotConfig[] = DAYS.map((_, i) => ({
  dayOfWeek: i,
  startTime: "08:00",
  endTime: "17:00",
  slotIntervalMinutes: 30,
  maxConcurrentBookings: 3,
  isActive: i !== 0, // closed Sunday
}));

export default function ManagerTimeslots() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: serverConfig, isLoading } = useQuery<TimeSlotConfig[]>({
    queryKey: ["/api/manager/timeslot-config"],
  });

  const [configs, setConfigs] = useState<TimeSlotConfig[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (serverConfig && serverConfig.length > 0) {
      // Fill all 7 days — use server data or default for missing days
      const filled = DAYS.map((_, dayIdx) => {
        const found = serverConfig.find((c) => c.dayOfWeek === dayIdx);
        return found ?? { ...DEFAULT_CONFIG[dayIdx] };
      });
      setConfigs(filled);
    } else if (!isLoading) {
      setConfigs(DEFAULT_CONFIG);
    }
  }, [serverConfig, isLoading]);

  const updateRow = (dayOfWeek: number, updated: TimeSlotConfig) => {
    setConfigs((prev) => prev.map((c) => (c.dayOfWeek === dayOfWeek ? updated : c)));
    setIsDirty(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PUT", "/api/manager/timeslot-config", configs),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/timeslot-config"] });
      setIsDirty(false);
      toast({ title: "Schedule saved", description: "Booking availability updated for all days." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const totalSlots = configs
    .filter((c) => c.isActive)
    .reduce((sum, c) => sum + generateSlotPreview(c.startTime, c.endTime, c.slotIntervalMinutes).length, 0);
  const openDays = configs.filter((c) => c.isActive).length;

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/manager/roster", label: "Roster", icon: Timer },
    { href: "/manager/inventory", label: "Inventory", icon: Package },
    { href: "/manager/revenue", label: "Revenue", icon: DollarSign },
    { href: "/manager/customers", label: "Customers", icon: Users },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/notification-templates", label: "Messages", icon: Bell },
    { href: "/manager/timeslots", label: "Schedule", icon: Clock },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
    { href: "/manager/settings", label: "Settings", icon: Settings },
  ];

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

          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Clock className="w-6 h-6 text-primary" />
                Booking Schedule
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Configure your opening hours and slot availability for online bookings.
              </p>
            </div>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!isDirty || saveMutation.isPending}
              className="gap-2 shrink-0"
            >
              {saveMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Saving...
                </span>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save schedule
                </>
              )}
            </Button>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Open days / week</p>
                <p className="text-2xl font-bold mt-1">{openDays}</p>
                <p className="text-xs text-muted-foreground">
                  {configs.filter((c) => c.isActive).map((c) => DAY_SHORT[c.dayOfWeek]).join(", ")}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Total slots / week</p>
                <p className="text-2xl font-bold mt-1">{totalSlots}</p>
                <p className="text-xs text-muted-foreground">booking opportunities</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-muted-foreground">Max capacity / week</p>
                <p className="text-2xl font-bold mt-1">
                  {configs.filter((c) => c.isActive).reduce((sum, c) => {
                    const slots = generateSlotPreview(c.startTime, c.endTime, c.slotIntervalMinutes).length;
                    return sum + slots * c.maxConcurrentBookings;
                  }, 0)}
                </p>
                <p className="text-xs text-muted-foreground">bookings maximum</p>
              </CardContent>
            </Card>
          </div>

          {/* Day-by-day configuration */}
          {isLoading ? (
            <div className="space-y-3">
              {DAYS.map((d) => <Skeleton key={d} className="h-16 w-full rounded-xl" />)}
            </div>
          ) : (
            <div className="space-y-3">
              {configs.map((config) => (
                <DayRow
                  key={config.dayOfWeek}
                  config={config}
                  onChange={(updated) => updateRow(updated.dayOfWeek, updated)}
                />
              ))}
            </div>
          )}

          {/* Info card */}
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-0.5">How it works</p>
                Customers booking online will only see slots within your configured hours. The slot interval
                controls how often a slot appears (e.g. every 30 minutes). Max per slot limits how many
                concurrent bookings can be made at the same time.
              </div>
            </CardContent>
          </Card>

          {isDirty && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-6 right-6 z-50"
            >
              <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending} size="lg" className="shadow-lg gap-2">
                <Save className="w-4 h-4" />
                Save changes
              </Button>
            </motion.div>
          )}

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
