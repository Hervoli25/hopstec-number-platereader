import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Building2,
  Plus,
  MapPin,
  Phone,
  Mail,
  Pencil,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Branch {
  id: string;
  tenantId: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  timezone: string | null;
  isActive: boolean | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ManagerBranches() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const canAccess =
    user?.role === "admin" || user?.role === "super_admin";

  // ---- Dialog state ----
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // ---- Form state ----
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    timezone: "",
  });

  // =========================================================================
  //  QUERY
  // =========================================================================

  const {
    data: branches,
    isLoading,
  } = useQuery<Branch[]>({
    queryKey: ["/api/branches"],
    enabled: canAccess,
  });

  // =========================================================================
  //  MUTATIONS
  // =========================================================================

  const createMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await apiRequest("POST", "/api/branches", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Branch created successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      closeDialog();
    },
    onError: (err: Error) =>
      toast({
        title: err.message || "Failed to create branch",
        variant: "destructive",
      }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await apiRequest("PATCH", `/api/branches/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Branch updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/branches"] });
      closeDialog();
    },
    onError: (err: Error) =>
      toast({
        title: err.message || "Failed to update branch",
        variant: "destructive",
      }),
  });

  // =========================================================================
  //  FORM HELPERS
  // =========================================================================

  function resetForm() {
    setForm({
      name: "",
      address: "",
      phone: "",
      email: "",
      timezone: "",
    });
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingBranch(null);
    resetForm();
  }

  function openCreateDialog() {
    setEditingBranch(null);
    resetForm();
    setDialogOpen(true);
  }

  function openEditDialog(branch: Branch) {
    setEditingBranch(branch);
    setForm({
      name: branch.name,
      address: branch.address || "",
      phone: branch.phone || "",
      email: branch.email || "",
      timezone: branch.timezone || "",
    });
    setDialogOpen(true);
  }

  function handleSubmit() {
    if (!form.name.trim()) {
      toast({ title: "Branch name is required", variant: "destructive" });
      return;
    }

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      address: form.address.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      timezone: form.timezone.trim() || null,
    };

    if (editingBranch) {
      updateMutation.mutate({ id: editingBranch.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  }

  function handleToggleActive(branch: Branch) {
    const newActive = branch.isActive === false;
    updateMutation.mutate({
      id: branch.id,
      data: { isActive: newActive },
    });
  }

  // =========================================================================
  //  ACCESS GUARD
  // =========================================================================

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <p className="text-lg font-semibold mb-2">Access Restricted</p>
              <p className="text-muted-foreground">
                Admin access is required to manage branches.
              </p>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  // =========================================================================
  //  RENDER
  // =========================================================================

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-6 pb-24 max-w-6xl">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Building2 className="w-6 h-6 text-primary" />
              Branch Management
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              View and manage your carwash branch locations
            </p>
          </div>
          <Button onClick={openCreateDialog}>
            <Plus className="w-4 h-4 mr-2" />
            Add Branch
          </Button>
        </div>

        {/* Branch Grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48 w-full rounded-lg" />
            ))}
          </div>
        ) : !branches?.length ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-muted-foreground/40" />
              <p className="text-lg font-semibold mb-1">No branches yet</p>
              <p className="text-muted-foreground mb-4">
                Create your first branch location to get started.
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Branch
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {branches.map((branch) => (
              <Card
                key={branch.id}
                className={`hover:shadow-md transition-shadow cursor-pointer ${
                  branch.isActive === false ? "opacity-60" : ""
                }`}
                onClick={() => openEditDialog(branch)}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Building2 className="w-5 h-5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                          {branch.name}
                        </h3>
                        {branch.timezone && (
                          <p className="text-xs text-muted-foreground truncate">
                            {branch.timezone}
                          </p>
                        )}
                      </div>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs shrink-0 ${
                        branch.isActive !== false
                          ? "bg-green-500/10 text-green-600 border-green-500/30"
                          : "bg-red-500/10 text-red-600 border-red-500/30"
                      }`}
                    >
                      {branch.isActive !== false ? "Active" : "Inactive"}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-muted-foreground">
                    {branch.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="truncate">{branch.address}</span>
                      </div>
                    )}
                    {branch.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 shrink-0" />
                        <span>{branch.phone}</span>
                      </div>
                    )}
                    {branch.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 shrink-0" />
                        <span className="truncate">{branch.email}</span>
                      </div>
                    )}
                    {!branch.address && !branch.phone && !branch.email && (
                      <p className="text-xs italic">No contact details set</p>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(branch);
                      }}
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={`h-7 text-xs ${
                        branch.isActive !== false
                          ? "text-destructive hover:text-destructive hover:bg-destructive/10"
                          : "text-green-600 hover:text-green-600 hover:bg-green-500/10"
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleActive(branch);
                      }}
                      disabled={updateMutation.isPending}
                    >
                      {branch.isActive !== false ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <AppFooter />

      {/* ================================================================= */}
      {/*  CREATE / EDIT BRANCH DIALOG                                      */}
      {/* ================================================================= */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          if (!open) closeDialog();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBranch ? "Edit Branch" : "Add New Branch"}
            </DialogTitle>
            <DialogDescription>
              {editingBranch
                ? "Update the branch details below."
                : "Fill in the details for the new branch location."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Branch Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Main Street Branch"
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                placeholder="e.g. 123 Main Street, City"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="+1 (555) 000-0000"
                />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="branch@example.com"
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Timezone</Label>
              <Input
                value={form.timezone}
                onChange={(e) => setForm((f) => ({ ...f, timezone: e.target.value }))}
                placeholder="e.g. Africa/Johannesburg"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.name.trim() ||
                createMutation.isPending ||
                updateMutation.isPending
              }
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              ) : editingBranch ? (
                <Pencil className="w-4 h-4 mr-1" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              {editingBranch ? "Update Branch" : "Create Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
