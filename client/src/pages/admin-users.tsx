import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { AppHeader } from "@/components/app-header";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Users, UserPlus, Shield, Wrench, Crown,
  Loader2, Check, X
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "technician" | "manager" | "admin";
  isActive: boolean;
  createdAt: string;
}

const ROLE_CONFIG = {
  technician: { label: "Technician", icon: Wrench, color: "bg-blue-500" },
  manager: { label: "Manager", icon: Shield, color: "bg-purple-500" },
  admin: { label: "Admin", icon: Crown, color: "bg-amber-500" },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    role: "technician" as "technician" | "manager" | "admin",
  });

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/role`, { role });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Role updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update role", description: error.message, variant: "destructive" });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ userId, isActive }: { userId: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${userId}/active`, { isActive });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "User status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: typeof newUser) => {
      const res = await apiRequest("POST", "/api/admin/users", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setIsCreateOpen(false);
      setNewUser({ email: "", password: "", firstName: "", lastName: "", role: "technician" });
      toast({ title: "User created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create user", description: error.message, variant: "destructive" });
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.email || !newUser.password || !newUser.firstName) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }
    createUserMutation.mutate(newUser);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Admin Panel" />

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <h1 className="text-2xl font-bold">User Management</h1>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-user">
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateUser} className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name *</Label>
                      <Input
                        id="firstName"
                        value={newUser.firstName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, firstName: e.target.value }))}
                        data-testid="input-new-first-name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        value={newUser.lastName}
                        onChange={(e) => setNewUser(prev => ({ ...prev, lastName: e.target.value }))}
                        data-testid="input-new-last-name"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newUser.email}
                      onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                      data-testid="input-new-email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                      data-testid="input-new-password"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select
                      value={newUser.role}
                      onValueChange={(value: "technician" | "manager" | "admin") => 
                        setNewUser(prev => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger data-testid="select-new-role">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="technician">Technician</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={createUserMutation.isPending}
                    data-testid="button-submit-create-user"
                  >
                    {createUserMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                    ) : (
                      <><UserPlus className="mr-2 h-4 w-4" /> Create User</>
                    )}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : users?.length ? (
              <div className="space-y-3">
                {users.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const RoleIcon = roleConfig.icon;
                  return (
                    <div 
                      key={user.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                      data-testid={`user-row-${user.id}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full ${roleConfig.color} flex items-center justify-center`}>
                          <RoleIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {user.firstName} {user.lastName}
                            {!user.isActive && (
                              <Badge variant="secondary" className="ml-2 text-xs">Inactive</Badge>
                            )}
                          </p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Select
                          value={user.role}
                          onValueChange={(role) => updateRoleMutation.mutate({ userId: user.id, role })}
                        >
                          <SelectTrigger className="w-32" data-testid={`select-role-${user.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technician">Technician</SelectItem>
                            <SelectItem value="manager">Manager</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                        
                        <Button
                          variant={user.isActive ? "outline" : "default"}
                          size="sm"
                          onClick={() => toggleActiveMutation.mutate({ 
                            userId: user.id, 
                            isActive: !user.isActive 
                          })}
                          data-testid={`button-toggle-active-${user.id}`}
                        >
                          {user.isActive ? (
                            <><X className="mr-1 h-4 w-4" /> Disable</>
                          ) : (
                            <><Check className="mr-1 h-4 w-4" /> Enable</>
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                <p className="text-sm mt-1">Create your first user to get started</p>
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Role Permissions</h2>
            <div className="space-y-4 text-sm">
              <div className="flex items-start gap-3">
                <Wrench className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="font-medium">Technician</p>
                  <p className="text-muted-foreground">Can scan vehicles, track wash progress, manage parking sessions</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="font-medium">Manager</p>
                  <p className="text-muted-foreground">All technician permissions plus view analytics, live queue, and audit logs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
                <div>
                  <p className="font-medium">Admin</p>
                  <p className="text-muted-foreground">All permissions plus manage users, change roles, and system settings</p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
