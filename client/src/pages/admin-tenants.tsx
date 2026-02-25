import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { apiRequest, queryClient as globalQueryClient } from "@/lib/queryClient";
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
} from "lucide-react";
import { format } from "date-fns";

interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: "free" | "basic" | "pro" | "enterprise";
  isActive: boolean | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  customDomain: string | null;
  createdAt: string | null;
}

type TenantPlan = "free" | "basic" | "pro" | "enterprise";

const PLAN_CONFIG: Record<TenantPlan, { label: string; color: string; bgColor: string }> = {
  free: { label: "Free", color: "text-gray-700", bgColor: "bg-gray-100 border-gray-300" },
  basic: { label: "Basic", color: "text-blue-700", bgColor: "bg-blue-100 border-blue-300" },
  pro: { label: "Pro", color: "text-purple-700", bgColor: "bg-purple-100 border-purple-300" },
  enterprise: { label: "Enterprise", color: "text-amber-700", bgColor: "bg-amber-100 border-amber-300" },
};

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function AdminTenants() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);

  const [newTenant, setNewTenant] = useState({
    name: "",
    slug: "",
    plan: "free" as TenantPlan,
  });

  const [editForm, setEditForm] = useState({
    name: "",
    slug: "",
    plan: "free" as TenantPlan,
    isActive: true,
  });

  // Auto-generate slug from name when creating
  useEffect(() => {
    setNewTenant((prev) => ({ ...prev, slug: generateSlug(prev.name) }));
  }, [newTenant.name]);

  // Populate edit form when a tenant is selected
  useEffect(() => {
    if (editingTenant) {
      setEditForm({
        name: editingTenant.name,
        slug: editingTenant.slug,
        plan: editingTenant.plan,
        isActive: editingTenant.isActive !== false,
      });
    }
  }, [editingTenant]);

  const isSuperAdmin = user?.isSuperAdmin === true;

  const {
    data: tenants,
    isLoading: isTenantsLoading,
    isError,
    error,
  } = useQuery<Tenant[]>({
    queryKey: ["/api/admin/tenants"],
    enabled: isSuperAdmin,
  });

  const is403 = isError && error?.message?.includes("403");

  // Filter tenants
  const filteredTenants =
    tenants?.filter((tenant) => {
      const matchesSearch =
        searchQuery === "" ||
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tenant.customDomain &&
          tenant.customDomain.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesPlan = planFilter === "all" || tenant.plan === planFilter;
      return matchesSearch && matchesPlan;
    }) || [];

  // Tenant stats
  const tenantStats = {
    total: tenants?.length || 0,
    active: tenants?.filter((t) => t.isActive !== false).length || 0,
    byPlan: {
      free: tenants?.filter((t) => t.plan === "free").length || 0,
      basic: tenants?.filter((t) => t.plan === "basic").length || 0,
      pro: tenants?.filter((t) => t.plan === "pro").length || 0,
      enterprise: tenants?.filter((t) => t.plan === "enterprise").length || 0,
    },
  };

  const createTenantMutation = useMutation({
    mutationFn: async (data: { name: string; slug: string; plan: TenantPlan }) => {
      const res = await apiRequest("POST", "/api/admin/tenants", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setIsCreateOpen(false);
      setNewTenant({ name: "", slug: "", plan: "free" });
      toast({ title: "Tenant created successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to create tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<{ name: string; slug: string; plan: TenantPlan; isActive: boolean }>;
    }) => {
      const res = await apiRequest("PATCH", `/api/admin/tenants/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      setIsEditOpen(false);
      setEditingTenant(null);
      toast({ title: "Tenant updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deactivateTenantMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/tenants/${id}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant deactivated successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to deactivate tenant",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTenant.name.trim()) {
      toast({ title: "Tenant name is required", variant: "destructive" });
      return;
    }
    if (!newTenant.slug.trim()) {
      toast({ title: "Slug is required", variant: "destructive" });
      return;
    }
    createTenantMutation.mutate(newTenant);
  };

  const handleUpdateTenant = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;
    if (!editForm.name.trim()) {
      toast({ title: "Tenant name is required", variant: "destructive" });
      return;
    }
    updateTenantMutation.mutate({
      id: editingTenant.id,
      data: {
        name: editForm.name,
        plan: editForm.plan,
        isActive: editForm.isActive,
      },
    });
  };

  const openEditDialog = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setIsEditOpen(true);
  };

  // Access denied state
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
              You do not have permission to access the tenant management page. This area is
              restricted to super administrators only.
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

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tenantStats.total}</p>
                  <p className="text-xs text-muted-foreground">Total Tenants</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tenantStats.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Building className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{tenantStats.byPlan.pro + tenantStats.byPlan.enterprise}</p>
                  <p className="text-xs text-muted-foreground">Premium</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {tenants?.filter((t) => t.customDomain).length || 0}
                  </p>
                  <p className="text-xs text-muted-foreground">Custom Domains</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building className="w-6 h-6" />
              <h1 className="text-2xl font-bold">Tenant Management</h1>
              <Badge
                variant="default"
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white"
              >
                <Shield className="w-3 h-3 mr-1" />
                Super Admin
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search tenants..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={planFilter} onValueChange={setPlanFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter plan" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Plans</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="pro">Pro</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>

              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Tenant
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Create New Tenant</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateTenant} className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="tenant-name">Tenant Name *</Label>
                      <Input
                        id="tenant-name"
                        placeholder="e.g. Sparkle Carwash"
                        value={newTenant.name}
                        onChange={(e) =>
                          setNewTenant((prev) => ({ ...prev, name: e.target.value }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant-slug">Slug *</Label>
                      <Input
                        id="tenant-slug"
                        placeholder="e.g. sparkle-carwash"
                        value={newTenant.slug}
                        onChange={(e) =>
                          setNewTenant((prev) => ({ ...prev, slug: e.target.value }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Auto-generated from name. Used in URLs (e.g. /tenant/sparkle-carwash).
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tenant-plan">Plan</Label>
                      <Select
                        value={newTenant.plan}
                        onValueChange={(value: TenantPlan) =>
                          setNewTenant((prev) => ({ ...prev, plan: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="free">Free</SelectItem>
                          <SelectItem value="basic">Basic</SelectItem>
                          <SelectItem value="pro">Pro</SelectItem>
                          <SelectItem value="enterprise">Enterprise</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      type="submit"
                      className="w-full"
                      disabled={createTenantMutation.isPending}
                    >
                      {createTenantMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" /> Create Tenant
                        </>
                      )}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tenants List */}
          <Card className="p-6">
            {isTenantsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : filteredTenants.length ? (
              <div className="space-y-3">
                {filteredTenants.map((tenant) => {
                  const planConfig = PLAN_CONFIG[tenant.plan];
                  const isActive = tenant.isActive !== false;
                  return (
                    <motion.div
                      key={tenant.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 cursor-pointer hover:bg-muted/80 transition-colors"
                      onClick={() => openEditDialog(tenant)}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Building className="w-5 h-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-medium truncate">{tenant.name}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs ${planConfig.bgColor} ${planConfig.color}`}
                            >
                              {planConfig.label}
                            </Badge>
                            {!isActive && (
                              <Badge variant="secondary" className="text-xs">
                                Inactive
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                            <span className="font-mono text-xs">{tenant.slug}</span>
                            {tenant.customDomain && (
                              <span className="flex items-center gap-1 text-xs">
                                <Globe className="w-3 h-3" />
                                {tenant.customDomain}
                              </span>
                            )}
                          </div>
                          {tenant.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <Calendar className="w-3 h-3 inline mr-1" />
                              Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                            </p>
                          )}
                        </div>
                      </div>

                      <div
                        className="flex items-center gap-2 shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(tenant)}
                          title="Edit tenant"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        {isActive && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                title="Deactivate tenant"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Deactivate Tenant</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to deactivate{" "}
                                  <strong>{tenant.name}</strong>? This will disable access for all
                                  users under this tenant. This action can be reversed by
                                  reactivating the tenant later.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  onClick={() => deactivateTenantMutation.mutate(tenant.id)}
                                >
                                  {deactivateTenantMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Deactivating...
                                    </>
                                  ) : (
                                    "Deactivate"
                                  )}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No tenants found</p>
                <p className="text-sm mt-1">
                  {searchQuery || planFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first tenant to get started"}
                </p>
              </div>
            )}
          </Card>

          {/* Plan Breakdown */}
          <Card className="p-6">
            <h2 className="font-semibold mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Plan Distribution
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              {(["free", "basic", "pro", "enterprise"] as TenantPlan[]).map((plan) => {
                const config = PLAN_CONFIG[plan];
                return (
                  <div
                    key={plan}
                    className={`flex items-center justify-between p-3 rounded-lg border ${config.bgColor}`}
                  >
                    <span className={`font-medium ${config.color}`}>{config.label}</span>
                    <span className={`text-lg font-bold ${config.color}`}>
                      {tenantStats.byPlan[plan]}
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Edit Tenant Dialog */}
      <Dialog
        open={isEditOpen}
        onOpenChange={(open) => {
          setIsEditOpen(open);
          if (!open) setEditingTenant(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant</DialogTitle>
          </DialogHeader>
          {editingTenant && (
            <form onSubmit={handleUpdateTenant} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="edit-tenant-name">Tenant Name *</Label>
                <Input
                  id="edit-tenant-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tenant-slug">Slug</Label>
                <Input
                  id="edit-tenant-slug"
                  value={editForm.slug}
                  disabled
                  className="opacity-60"
                />
                <p className="text-xs text-muted-foreground">
                  Slug cannot be changed after creation.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-tenant-plan">Plan</Label>
                <Select
                  value={editForm.plan}
                  onValueChange={(value: TenantPlan) =>
                    setEditForm((prev) => ({ ...prev, plan: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-tenant-active">Active Status</Label>
                  <p className="text-xs text-muted-foreground">
                    Inactive tenants cannot access the platform.
                  </p>
                </div>
                <Switch
                  id="edit-tenant-active"
                  checked={editForm.isActive}
                  onCheckedChange={(checked) =>
                    setEditForm((prev) => ({ ...prev, isActive: checked }))
                  }
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={updateTenantMutation.isPending}
              >
                {updateTenantMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Pencil className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
