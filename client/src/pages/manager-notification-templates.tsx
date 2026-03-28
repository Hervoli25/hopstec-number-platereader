import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import {
  MessageSquare,
  Mail,
  Eye,
  EyeOff,
  Save,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Activity,
  CalendarDays,
  Timer,
  Package,
  DollarSign,
  Users,
  BarChart3,
  ClipboardList,
  Settings,
  Bell,
} from "lucide-react";

interface NotificationTemplate {
  id: string;
  code: string;
  name: string;
  channel: string;
  subject: string | null;
  body: string;
  isActive: boolean;
  updatedAt: string;
}

const TEMPLATE_VARIABLES: Record<string, string[]> = {
  wash_complete: ["{{customerName}}", "{{plateDisplay}}", "{{packageName}}", "{{businessName}}"],
  VOUCHER_ISSUED: ["{{customerName}}", "{{plateDisplay}}", "{{voucherCode}}", "{{expiryDate}}", "{{businessName}}"],
  BOOKING_CONFIRMED: ["{{customerName}}", "{{bookingReference}}", "{{bookingDate}}", "{{serviceName}}", "{{businessName}}"],
  BOOKING_CANCELLED: ["{{customerName}}", "{{bookingReference}}", "{{reason}}", "{{businessName}}"],
  BOOKING_MODIFIED: ["{{customerName}}", "{{bookingReference}}", "{{newDate}}", "{{businessName}}"],
  BOOKING_RESCHEDULED: ["{{customerName}}", "{{bookingReference}}", "{{newDate}}", "{{businessName}}"],
  default: ["{{customerName}}", "{{plateDisplay}}", "{{businessName}}"],
};

const SAMPLE_DATA: Record<string, string> = {
  "{{customerName}}": "John Dlamini",
  "{{plateDisplay}}": "ABC 123 GP",
  "{{packageName}}": "Premium Wash",
  "{{voucherCode}}": "FW-XK9J4",
  "{{expiryDate}}": "31 December 2026",
  "{{bookingReference}}": "BK-2024-001",
  "{{bookingDate}}": "Monday, 15 April at 10:00",
  "{{serviceName}}": "Premium Wash",
  "{{newDate}}": "Tuesday, 16 April at 11:00",
  "{{reason}}": "Customer request",
  "{{businessName}}": "ParkWash Pro",
};

const DEFAULT_SEEDS = [
  {
    code: "wash_complete",
    name: "Wash Complete",
    channel: "sms",
    body: "Hi {{customerName}}! Your vehicle ({{plateDisplay}}) is ready for collection. Thank you for choosing {{businessName}}! 🚗✨",
  },
  {
    code: "VOUCHER_ISSUED",
    name: "Free Wash Voucher Earned",
    channel: "sms",
    body: "🎉 Hi {{customerName}}! You've earned a FREE wash voucher. Code: {{voucherCode}}. Valid until {{expiryDate}}. Show this code at your next visit. Thank you for being a loyal customer!",
  },
  {
    code: "BOOKING_CONFIRMED",
    name: "Booking Confirmation",
    channel: "sms",
    subject: "Booking Confirmed — {{bookingReference}}",
    body: "Hi {{customerName}}, your booking {{bookingReference}} is confirmed for {{bookingDate}}. Service: {{serviceName}}. See you soon at {{businessName}}!",
  },
  {
    code: "BOOKING_CANCELLED",
    name: "Booking Cancelled",
    channel: "sms",
    subject: "Booking {{bookingReference}} Cancelled",
    body: "Hi {{customerName}}, your booking {{bookingReference}} has been cancelled. {{reason}} Contact us to rebook. — {{businessName}}",
  },
];

function renderPreview(body: string): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match) => SAMPLE_DATA[match] || match);
}

function TemplateCard({
  template,
  onSave,
  saving,
}: {
  template: NotificationTemplate;
  onSave: (id: string, data: { body: string; subject: string | null; isActive: boolean }) => void;
  saving: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState(template.body);
  const [subject, setSubject] = useState(template.subject || "");
  const [isActive, setIsActive] = useState(template.isActive);
  const [showPreview, setShowPreview] = useState(false);

  const variables = TEMPLATE_VARIABLES[template.code] || TEMPLATE_VARIABLES.default;
  const isDirty = body !== template.body || subject !== (template.subject || "") || isActive !== template.isActive;

  const channelIcon = template.channel === "email" ? (
    <Mail className="w-4 h-4 text-blue-500" />
  ) : (
    <MessageSquare className="w-4 h-4 text-green-500" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden">
        <CardHeader
          className="cursor-pointer select-none py-4 hover:bg-muted/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {channelIcon}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-sm leading-tight">{template.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">{template.code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Badge
                variant={template.channel === "sms" ? "secondary" : "outline"}
                className="text-xs uppercase hidden sm:inline-flex"
              >
                {template.channel}
              </Badge>
              <Badge variant={isActive ? "default" : "outline"} className="text-xs">
                {isActive ? "On" : "Off"}
              </Badge>
              {expanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0 pb-5 space-y-5">
            <Separator />

            {/* Variable chips */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Available placeholders — click to insert
              </p>
              <div className="flex flex-wrap gap-1.5">
                {variables.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setBody((prev) => prev + v)}
                    className="text-xs font-mono bg-muted border border-border text-foreground px-2 py-0.5 rounded-md hover:bg-accent hover:border-primary transition-colors"
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Subject line (email only) */}
            {template.channel === "email" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Subject line</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Your booking {{bookingReference}} is confirmed"
                  className="text-sm"
                />
              </div>
            )}

            {/* Message body */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Message body</Label>
              <Textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="text-sm font-mono resize-none"
                placeholder="Type your message with {{placeholders}}..."
              />
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">
                  {template.channel === "sms" && body.length > 160
                    ? `${body.length} chars · ${Math.ceil(body.length / 160)} SMS segments`
                    : `${body.length} characters`}
                </p>
              </div>
            </div>

            {/* Live preview */}
            <div>
              <button
                type="button"
                className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPreview(!showPreview)}
              >
                {showPreview ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {showPreview ? "Hide preview" : "Show preview with sample data"}
              </button>
              {showPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-2 p-3 rounded-xl border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                >
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400 mb-1.5 flex items-center gap-1.5">
                    <Eye className="w-3 h-3" />
                    Preview — rendered with sample data
                  </p>
                  <p className="text-sm text-green-900 dark:text-green-100 whitespace-pre-wrap leading-relaxed">
                    {renderPreview(body)}
                  </p>
                </motion.div>
              )}
            </div>

            {/* Active toggle + Save */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  id={`active-${template.id}`}
                />
                <Label htmlFor={`active-${template.id}`} className="text-sm cursor-pointer">
                  {isActive ? "Active — will be sent" : "Inactive — won't be sent"}
                </Label>
              </div>
              <Button
                size="sm"
                disabled={!isDirty || saving}
                onClick={() =>
                  onSave(template.id, { body, subject: subject.trim() || null, isActive })
                }
                className="gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                Save
              </Button>
            </div>
          </CardContent>
        )}
      </Card>
    </motion.div>
  );
}

export default function ManagerNotificationTemplates() {
  const [location] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<NotificationTemplate[]>({
    queryKey: ["/api/manager/notification-templates"],
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { body: string; subject: string | null; isActive: boolean } }) =>
      apiRequest("PUT", `/api/manager/notification-templates/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/notification-templates"] });
      toast({ title: "Template saved", description: "Changes apply to all new notifications immediately." });
    },
    onError: () => toast({ title: "Save failed", variant: "destructive" }),
  });

  const createMutation = useMutation({
    mutationFn: (seed: (typeof DEFAULT_SEEDS)[number]) =>
      apiRequest("POST", "/api/manager/notification-templates", seed),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manager/notification-templates"] });
    },
  });

  const handleLoadDefaults = async () => {
    for (const seed of DEFAULT_SEEDS) {
      if (!templates.some((t) => t.code === seed.code)) {
        await createMutation.mutateAsync(seed).catch(() => {});
      }
    }
    toast({ title: "Default templates loaded", description: "Customise the messages below." });
  };

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/bookings", label: "Bookings", icon: CalendarDays },
    { href: "/manager/roster", label: "Roster", icon: Timer },
    { href: "/manager/inventory", label: "Inventory", icon: Package },
    { href: "/manager/revenue", label: "Revenue", icon: DollarSign },
    { href: "/manager/customers", label: "Customers", icon: Users },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/notification-templates", label: "Messages", icon: Bell },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
    { href: "/manager/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      {/* Sub-navigation */}
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
                <Bell className="w-6 h-6 text-primary" />
                Notification Messages
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Customise the SMS and email messages sent to your customers. Changes apply instantly.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLoadDefaults}
              className="gap-2 shrink-0"
              disabled={createMutation.isPending}
            >
              <Sparkles className="w-4 h-4" />
              {templates.length === 0 ? "Load defaults" : "Sync defaults"}
            </Button>
          </div>

          {/* Templates list */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : templates.length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <CardTitle className="text-base mb-2">No templates yet</CardTitle>
                <CardDescription className="mb-5">
                  Load the default templates to get started, then customise the wording to match your brand voice.
                </CardDescription>
                <Button onClick={handleLoadDefaults} className="gap-2" disabled={createMutation.isPending}>
                  <Sparkles className="w-4 h-4" />
                  Load default templates
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  saving={updateMutation.isPending}
                  onSave={(id, data) => updateMutation.mutate({ id, data })}
                />
              ))}
            </div>
          )}

          {/* Info card */}
          {templates.length > 0 && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="py-4 flex items-start gap-3">
                <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground mb-0.5">Placeholders</p>
                  Use <code className="text-xs bg-muted px-1 py-0.5 rounded font-mono">{"{{variableName}}"}</code> syntax in
                  your messages. Click any placeholder chip in the editor to insert it. Preview shows how the message
                  will look with real customer data.
                </div>
              </CardContent>
            </Card>
          )}

        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
