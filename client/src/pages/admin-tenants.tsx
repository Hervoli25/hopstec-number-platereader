import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BILLING_PLANS, PLAN_BADGE_CONFIG, formatCents } from "@shared/billing";
import {
  Building,
  Plus,
  Pencil,
  Trash2,
  Shield,
  Globe,
  Loader2,
  Search,
  Calendar,
  ShieldAlert,
  Lock,
  Users,
  Car,
  ParkingSquare,
  Link2,
  Copy,
  Check,
  ChevronRight,
  ChevronLeft,
  Mail,
  Phone,
  MapPin,
  Palette,
  CreditCard,
  ArrowUpRight,
  Power,
  PowerOff,
  Pause,
  Play,
  BarChart3,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TenantStats {
  userCount: number;
  washCount: number;
  parkingSessionCount: number;
  branchCount: number;
}

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  status: "trial" | "active" | "suspended" | "inactive";
  isActive: boolean | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  customDomain: string | null;
  billingEmail: string | null;
  trialEndsAt: string | null;
  createdAt: string | null;
  stats?: TenantStats;
}

type TenantPlan = "free" | "basic" | "pro" | "enterprise";
type TenantStatus = "trial" | "active" | "suspended" | "inactive";

const STATUS_CONFIG: Record<TenantStatus, { label: string; icon: React.ElementType; color: string; bgClass: string }> = {
  trial: { label: "Trial", icon: Clock, color: "text-blue-500", bgClass: "bg-blue-500/10" },
  active: { label: "Active", icon: CheckCircle2, color: "text-green-500", bgClass: "bg-green-500/10" },
  suspended: { label: "Suspended", icon: AlertTriangle, color: "text-orange-500", bgClass: "bg-orange-500/10" },
  inactive: { label: "Inactive", icon: XCircle, color: "text-gray-500", bgClass: "bg-gray-500/10" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getTenantUrl(slug: string): string {
  const host = window.location.host;
  const protocol = window.location.protocol;
  return `${protocol}//${host}/t/${slug}`;
}

// ─── Creation Wizard ────────────────────────────────────────────────────────

interface WizardState {
  // Step 1: Business details
  name: string;
  slug: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  // Step 2: Plan selection
  plan: TenantPlan;
  // Step 3: Branding
  primaryColor: string;
  secondaryColor: string;
}

const WIZARD_STEPS = [
  { title: "Business Details", description: "Basic information about the tenant" },
  { title: "Select Plan", description: "Choose a subscription plan" },
  { title: "Branding", description: "Customize look and feel" },
  { title: "Review & Create", description: "Confirm everything looks good" },
];

function CreateTenantWizard({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (tenant: Tenant, tenantUrl: string) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const [createdTenantUrl, setCreatedTenantUrl] = useState("");
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [form, setForm] = useState<WizardState>({
    name: "",
    slug: "",
    contactEmail: "",
    contactPhone: "",
    address: "",
    plan: "free",
    primaryColor: "#3B82F6",
    secondaryColor: "#1E293B",
  });

  // Auto-generate slug
  useEffect(() => {
    setForm((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
  }, [form.name]);

  const createMutation = useMutation({
    mutationFn: async (data: WizardState) => {
      const res = await apiRequest("POST", "/api/admin/tenants", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants-with-stats"] });
      const url = data.tenantUrl || getTenantUrl(form.slug);
      setCreatedTenantUrl(url);
      setShowSuccess(true);
      onSuccess(data.tenant, url);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({ title: "Business name is required", variant: "destructive" });
      return;
    }
    createMutation.mutate(form);
  };

  const copyUrl = async () => {
    await navigator.clipboard.writeText(createdTenantUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const reset = () => {
    setStep(0);
    setShowSuccess(false);
    setCreatedTenantUrl("");
    setForm({
      name: "", slug: "", contactEmail: "", contactPhone: "",
      address: "", plan: "free", primaryColor: "#3B82F6", secondaryColor: "#1E293B",
    });
    onOpenChange(false);
  };

  const canNext = () => {
    if (step === 0) return form.name.trim().length > 0;
    return true;
  };

  const selectedPlan = BILLING_PLANS[form.plan];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); else onOpenChange(o); }}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {showSuccess ? "Tenant Created!" : "Create New Tenant"}
          </DialogTitle>
          {!showSuccess && (
            <DialogDescription>
              {WIZARD_STEPS[step].description}
            </DialogDescription>
          )}
        </DialogHeader>

        {showSuccess ? (
          /* ── Success Screen ── */
          <div className="space-y-6 py-4">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-500" />
              </div>
              <h3 className="text-lg font-semibold mb-1">{form.name} is ready!</h3>
              <p className="text-sm text-muted-foreground">
                The tenant has been created with the <strong>{selectedPlan.label}</strong> plan and a 14-day trial.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-3">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Tenant Access URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-md border px-3 py-2 font-mono text-sm break-all">
                  {createdTenantUrl}
                </div>
                <Button variant="outline" size="icon" onClick={copyUrl}>
                  {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this URL with the tenant administrator to get started.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Plan</p>
                <p className="font-medium">{selectedPlan.label}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Monthly Price</p>
                <p className="font-medium">{selectedPlan.price === 0 ? "Free" : formatCents(selectedPlan.price)}</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Status</p>
                <p className="font-medium">Trial (14 days)</p>
              </div>
              <div className="bg-muted/30 rounded-lg p-3">
                <p className="text-muted-foreground text-xs">Slug</p>
                <p className="font-medium font-mono">{form.slug}</p>
              </div>
            </div>

            <Button className="w-full" onClick={reset}>Done</Button>
          </div>
        ) : (
          /* ── Wizard Steps ── */
          <div className="space-y-6">
            {/* Progress */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Step {step + 1} of {WIZARD_STEPS.length}</span>
                <span>{WIZARD_STEPS[step].title}</span>
              </div>
              <Progress value={((step + 1) / WIZARD_STEPS.length) * 100} className="h-1.5" />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {/* Step 1: Business Details */}
                {step === 0 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="w-name">Business Name *</Label>
                      <Input
                        id="w-name"
                        placeholder="e.g. Sparkle Carwash"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="w-slug">URL Slug</Label>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground whitespace-nowrap">/t/</span>
                        <Input
                          id="w-slug"
                          value={form.slug}
                          onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                          className="font-mono"
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        This will be part of the tenant's access URL. Auto-generated from name.
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="w-email">
                        <Mail className="w-3.5 h-3.5 inline mr-1.5" />
                        Contact Email
                      </Label>
                      <Input
                        id="w-email"
                        type="email"
                        placeholder="admin@sparklecarwash.com"
                        value={form.contactEmail}
                        onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="w-phone">
                        <Phone className="w-3.5 h-3.5 inline mr-1.5" />
                        Contact Phone
                      </Label>
                      <Input
                        id="w-phone"
                        type="tel"
                        placeholder="+27 11 123 4567"
                        value={form.contactPhone}
                        onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="w-address">
                        <MapPin className="w-3.5 h-3.5 inline mr-1.5" />
                        Business Address
                      </Label>
                      <Input
                        id="w-address"
                        placeholder="123 Main Road, Johannesburg"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                      />
                    </div>
                  </div>
                )}

                {/* Step 2: Plan Selection */}
                {step === 1 && (
                  <div className="space-y-3">
                    {(Object.entries(BILLING_PLANS) as [TenantPlan, typeof BILLING_PLANS["free"]][]).map(([key, plan]) => {
                      const isSelected = form.plan === key;
                      return (
                        <div
                          key={key}
                          onClick={() => setForm((f) => ({ ...f, plan: key }))}
                          className={`relative rounded-lg border-2 p-4 cursor-pointer transition-all ${
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md"
                              : "border-border hover:border-muted-foreground/30"
                          }`}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-semibold">{plan.label}</h4>
                                {key === "pro" && (
                                  <Badge variant="secondary" className="text-[10px]">Popular</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{plan.description}</p>
                              <ul className="text-xs text-muted-foreground space-y-0.5">
                                {plan.features.slice(0, 4).map((f, i) => (
                                  <li key={i} className="flex items-center gap-1.5">
                                    <Check className="w-3 h-3 text-green-500 shrink-0" />
                                    {f}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {plan.price === 0 ? "Free" : formatCents(plan.price)}
                              </p>
                              {plan.price > 0 && (
                                <p className="text-xs text-muted-foreground">/month</p>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="absolute top-3 right-3">
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="w-3 h-3 text-primary-foreground" />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Step 3: Branding */}
                {step === 2 && (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Customize the tenant's brand colors. These can be changed later.
                    </p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="w-primary">Primary Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="w-primary"
                            aria-label="Primary color picker"
                            title="Primary color"
                            value={form.primaryColor}
                            onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={form.primaryColor}
                            onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="w-secondary">Secondary Color</Label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            id="w-secondary"
                            aria-label="Secondary color picker"
                            title="Secondary color"
                            value={form.secondaryColor}
                            onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                            className="w-10 h-10 rounded border cursor-pointer"
                          />
                          <Input
                            value={form.secondaryColor}
                            onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))}
                            className="font-mono text-sm"
                          />
                        </div>
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="rounded-lg border p-4 space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wider">Preview</p>
                      <div className="flex items-center gap-3">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                          style={{ backgroundColor: form.primaryColor }}
                        >
                          {form.name ? form.name[0].toUpperCase() : "T"}
                        </div>
                        <div>
                          <p className="font-semibold" style={{ color: form.primaryColor }}>
                            {form.name || "Tenant Name"}
                          </p>
                          <p className="text-xs text-muted-foreground">{form.slug || "tenant-slug"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 4: Review */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div className="rounded-lg border divide-y">
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Business Name</span>
                        <span className="font-medium">{form.name}</span>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">URL Slug</span>
                        <span className="font-mono text-sm">/t/{form.slug}</span>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Plan</span>
                        <Badge variant="outline" className={PLAN_BADGE_CONFIG[form.plan].bgColor}>
                          {selectedPlan.label} — {selectedPlan.price === 0 ? "Free" : `${formatCents(selectedPlan.price)}/mo`}
                        </Badge>
                      </div>
                      {form.contactEmail && (
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Email</span>
                          <span className="text-sm">{form.contactEmail}</span>
                        </div>
                      )}
                      {form.contactPhone && (
                        <div className="p-3 flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Phone</span>
                          <span className="text-sm">{form.contactPhone}</span>
                        </div>
                      )}
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Brand Color</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded" style={{ backgroundColor: form.primaryColor }} />
                          <span className="font-mono text-xs">{form.primaryColor}</span>
                        </div>
                      </div>
                      <div className="p-3 flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Trial Period</span>
                        <span className="text-sm">14 days</span>
                      </div>
                    </div>
                    <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-3">
                      <p className="text-xs text-blue-600 dark:text-blue-400">
                        A default branch "Main Branch" will be created automatically. The tenant will start with a 14-day trial period.
                      </p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                disabled={step === 0}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>

              {step < WIZARD_STEPS.length - 1 ? (
                <Button onClick={() => setStep((s) => s + 1)} disabled={!canNext()}>
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating...</>
                  ) : (
                    <><Plus className="w-4 h-4 mr-2" /> Create Tenant</>
                  )}
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Tenant Detail Panel ────────────────────────────────────────────────────

function TenantDetailPanel({
  tenant,
  open,
  onOpenChange,
}: {
  tenant: Tenant | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedUrl, setCopiedUrl] = useState(false);

  const [editForm, setEditForm] = useState({
    name: "",
    plan: "free" as TenantPlan,
    status: "trial" as TenantStatus,
    isActive: true,
    contactEmail: "",
    contactPhone: "",
  });

  useEffect(() => {
    if (tenant) {
      setEditForm({
        name: tenant.name,
        plan: tenant.plan,
        status: tenant.status || "active",
        isActive: tenant.isActive !== false,
        contactEmail: tenant.contactEmail || "",
        contactPhone: tenant.contactPhone || "",
      });
    }
  }, [tenant]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${tenant!.id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants-with-stats"] });
      toast({ title: "Tenant updated successfully" });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update tenant", description: error.message, variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(editForm);
  };

  const copyUrl = async () => {
    if (!tenant) return;
    await navigator.clipboard.writeText(getTenantUrl(tenant.slug));
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (!tenant) return null;

  const tenantUrl = getTenantUrl(tenant.slug);
  const statusConf = STATUS_CONFIG[tenant.status || "active"];
  const StatusIcon = statusConf.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
              style={{ backgroundColor: tenant.primaryColor || "#3B82F6" }}
            >
              {tenant.name[0].toUpperCase()}
            </div>
            <div>
              <DialogTitle>{tenant.name}</DialogTitle>
              <p className="text-sm text-muted-foreground font-mono">{tenant.slug}</p>
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="mt-2">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="stats">Usage</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Tenant URL */}
            <div className="bg-muted/50 rounded-lg p-3 space-y-2">
              <Label className="text-xs text-muted-foreground uppercase tracking-wider">Access URL</Label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-background rounded-md border px-3 py-1.5 font-mono text-sm truncate">
                  {tenantUrl}
                </div>
                <Button variant="outline" size="icon" onClick={copyUrl} className="shrink-0">
                  {copiedUrl ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            {/* Status & Plan */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                <div className="flex items-center gap-2">
                  <StatusIcon className={`w-4 h-4 ${statusConf.color}`} />
                  <span className="font-medium">{statusConf.label}</span>
                </div>
              </div>
              <div className="rounded-lg border p-3">
                <p className="text-xs text-muted-foreground mb-1">Plan</p>
                <Badge variant="outline" className={PLAN_BADGE_CONFIG[tenant.plan].bgColor}>
                  {PLAN_BADGE_CONFIG[tenant.plan].label}
                </Badge>
              </div>
            </div>

            {/* Contact Info */}
            <div className="rounded-lg border divide-y">
              {tenant.contactEmail && (
                <div className="p-3 flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  {tenant.contactEmail}
                </div>
              )}
              {tenant.contactPhone && (
                <div className="p-3 flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  {tenant.contactPhone}
                </div>
              )}
              {tenant.address && (
                <div className="p-3 flex items-center gap-3 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  {tenant.address}
                </div>
              )}
              {tenant.createdAt && (
                <div className="p-3 flex items-center gap-3 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                </div>
              )}
              {tenant.trialEndsAt && tenant.status === "trial" && (
                <div className="p-3 flex items-center gap-3 text-sm">
                  <Clock className="w-4 h-4 text-orange-500" />
                  Trial ends {format(new Date(tenant.trialEndsAt), "MMM d, yyyy")}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4 mt-4">
            {tenant.stats ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-4 h-4 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{tenant.stats.userCount}</p>
                        <p className="text-xs text-muted-foreground">Users</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <Car className="w-4 h-4 text-green-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{tenant.stats.washCount}</p>
                        <p className="text-xs text-muted-foreground">Washes (this month)</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <ParkingSquare className="w-4 h-4 text-purple-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{tenant.stats.parkingSessionCount}</p>
                        <p className="text-xs text-muted-foreground">Parking (this month)</p>
                      </div>
                    </div>
                  </Card>
                  <Card className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Building className="w-4 h-4 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-xl font-bold">{tenant.stats.branchCount}</p>
                        <p className="text-xs text-muted-foreground">Branches</p>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Plan Limits */}
                <div className="rounded-lg border p-4 space-y-3">
                  <h4 className="text-sm font-semibold">Plan Limits</h4>
                  {(() => {
                    const plan = BILLING_PLANS[tenant.plan];
                    const limits = [
                      { label: "Washes", current: tenant.stats.washCount, max: plan.maxWashes },
                      { label: "Users", current: tenant.stats.userCount, max: plan.maxUsers },
                      { label: "Branches", current: tenant.stats.branchCount, max: plan.maxBranches },
                    ];
                    return limits.map((l) => {
                      const isUnlimited = l.max === -1;
                      const pct = isUnlimited ? 0 : Math.min(Math.round((l.current / l.max) * 100), 100);
                      return (
                        <div key={l.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span>{l.label}</span>
                            <span className="text-muted-foreground">
                              {l.current} / {isUnlimited ? "Unlimited" : l.max}
                            </span>
                          </div>
                          <Progress value={isUnlimited ? 0 : pct} className="h-1.5" />
                        </div>
                      );
                    });
                  })()}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No usage data available</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="settings" className="space-y-4 mt-4">
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Business Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={editForm.plan}
                  onValueChange={(v: TenantPlan) => setEditForm((f) => ({ ...f, plan: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free — $0/mo</SelectItem>
                    <SelectItem value="basic">Basic — $29/mo</SelectItem>
                    <SelectItem value="pro">Pro — $79/mo</SelectItem>
                    <SelectItem value="enterprise">Enterprise — $199/mo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v: TenantStatus) => setEditForm((f) => ({ ...f, status: v, isActive: v !== "inactive" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="trial">Trial</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input
                  value={editForm.contactEmail}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactEmail: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Contact Phone</Label>
                <Input
                  value={editForm.contactPhone}
                  onChange={(e) => setEditForm((f) => ({ ...f, contactPhone: e.target.value }))}
                />
              </div>
            </div>
            <Button className="w-full" onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Pencil className="w-4 h-4 mr-2" /> Save Changes</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function AdminTenants() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const isSuperAdmin = user?.isSuperAdmin === true;

  const {
    data: tenants,
    isLoading: isTenantsLoading,
    isError,
    error,
  } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants-with-stats"],
    enabled: isSuperAdmin,
  });

  const is403 = isError && error?.message?.includes("403");

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/tenants/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants-with-stats"] });
      toast({ title: "Tenant deactivated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to deactivate", description: error.message, variant: "destructive" });
    },
  });

  // Filtered tenants
  const filteredTenants = tenants?.filter((t) => {
    const matchesSearch =
      searchQuery === "" ||
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = planFilter === "all" || t.plan === planFilter;
    const matchesStatus = statusFilter === "all" || t.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  }) || [];

  // Stats
  const stats = {
    total: tenants?.length || 0,
    active: tenants?.filter((t) => t.status === "active").length || 0,
    trial: tenants?.filter((t) => t.status === "trial").length || 0,
    suspended: tenants?.filter((t) => t.status === "suspended").length || 0,
    byPlan: {
      free: tenants?.filter((t) => t.plan === "free").length || 0,
      basic: tenants?.filter((t) => t.plan === "basic").length || 0,
      pro: tenants?.filter((t) => t.plan === "pro").length || 0,
      enterprise: tenants?.filter((t) => t.plan === "enterprise").length || 0,
    },
    totalRevenue: tenants?.reduce((sum, t) => sum + BILLING_PLANS[t.plan].price, 0) || 0,
  };

  // Access denied
  if (!isAuthLoading && (!user || !isSuperAdmin || is403)) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader title="Tenant Management" />
        <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full flex items-center justify-center">
          <Card className="p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <ShieldAlert className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">
              This area is restricted to super administrators only.
            </p>
            <Badge variant="outline" className="text-xs">
              <Lock className="w-3 h-3 mr-1" />
              Super Admin Required
            </Badge>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Tenant Management" />

      <main className="flex-1 max-w-6xl mx-auto px-4 py-6 w-full">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.trial}</p>
                  <p className="text-xs text-muted-foreground">Trial</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.suspended}</p>
                  <p className="text-xs text-muted-foreground">Suspended</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCents(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground">MRR</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Header + Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Tenant Management</h1>
              <Badge variant="default" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white">
                <Shield className="w-3 h-3 mr-1" /> Super Admin
              </Badge>
            </div>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Tenant
            </Button>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Plans</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="basic">Basic</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="trial">Trial</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tenants List */}
          <Card>
            <CardContent className="p-0">
              {isTenantsLoading ? (
                <div className="p-6 space-y-4">
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                  <Skeleton className="h-20" />
                </div>
              ) : filteredTenants.length ? (
                <div className="divide-y">
                  {filteredTenants.map((tenant) => {
                    const planConf = PLAN_BADGE_CONFIG[tenant.plan];
                    const statusConf = STATUS_CONFIG[tenant.status || "active"];
                    const StatusIcon = statusConf.icon;
                    const planLimits = BILLING_PLANS[tenant.plan];

                    return (
                      <motion.div
                        key={tenant.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                        onClick={() => { setSelectedTenant(tenant); setIsDetailOpen(true); }}
                      >
                        <div className="flex items-center gap-4 min-w-0 flex-1">
                          <div
                            className="w-11 h-11 rounded-lg flex items-center justify-center text-white font-bold shrink-0"
                            style={{ backgroundColor: tenant.primaryColor || "#3B82F6" }}
                          >
                            {tenant.name[0].toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-semibold truncate">{tenant.name}</p>
                              <Badge variant="outline" className={`text-[10px] ${planConf.bgColor} ${planConf.color}`}>
                                {planConf.label}
                              </Badge>
                              <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full ${statusConf.bgClass}`}>
                                <StatusIcon className={`w-3 h-3 ${statusConf.color}`} />
                                <span className={statusConf.color}>{statusConf.label}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                              <span className="font-mono">/t/{tenant.slug}</span>
                              {tenant.contactEmail && (
                                <span className="hidden md:inline">{tenant.contactEmail}</span>
                              )}
                              {tenant.createdAt && (
                                <span className="hidden md:inline">
                                  {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right side: stats + actions */}
                        <div className="flex items-center gap-4 shrink-0">
                          {/* Mini stats */}
                          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1" title="Users">
                              <Users className="w-3.5 h-3.5" />
                              <span>{tenant.stats?.userCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Washes this month">
                              <Car className="w-3.5 h-3.5" />
                              <span>{tenant.stats?.washCount || 0}</span>
                            </div>
                            <div className="flex items-center gap-1" title="Monthly price">
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>{planLimits.price === 0 ? "Free" : formatCents(planLimits.price)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => { setSelectedTenant(tenant); setIsDetailOpen(true); }}
                              title="View details"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            {tenant.isActive !== false && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title="Deactivate"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Deactivate {tenant.name}?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will disable access for all users under this tenant. You can reactivate later.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                      onClick={() => deactivateMutation.mutate(tenant.id)}
                                    >
                                      Deactivate
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>

                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No tenants found</p>
                  <p className="text-sm mt-1">
                    {searchQuery || planFilter !== "all" || statusFilter !== "all"
                      ? "Try adjusting your filters"
                      : "Create your first tenant to get started"}
                  </p>
                  {!searchQuery && planFilter === "all" && statusFilter === "all" && (
                    <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" /> Create Tenant
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <CreditCard className="w-5 h-5" />
              Plan Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {(["free", "basic", "pro", "enterprise"] as TenantPlan[]).map((plan) => {
                const conf = PLAN_BADGE_CONFIG[plan];
                const planData = BILLING_PLANS[plan];
                const count = stats.byPlan[plan];
                return (
                  <div key={plan} className={`rounded-lg border p-4 ${conf.bgColor}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-semibold ${conf.color}`}>{conf.label}</span>
                      <span className={`text-2xl font-bold ${conf.color}`}>{count}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {planData.price === 0 ? "Free" : `${formatCents(planData.price)}/mo`}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Wizard Dialog */}
      <CreateTenantWizard
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        onSuccess={() => {}}
      />

      {/* Tenant Detail Panel */}
      <TenantDetailPanel
        tenant={selectedTenant}
        open={isDetailOpen}
        onOpenChange={(open) => {
          setIsDetailOpen(open);
          if (!open) setSelectedTenant(null);
        }}
      />

      <AppFooter />
    </div>
  );
}
