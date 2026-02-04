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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users, UserPlus, Shield, Wrench, Crown,
  Loader2, Check, X, Search, Activity, Settings,
  Database, Server, Calendar, TrendingUp, Mail
} from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: "technician" | "manager" | "admin";
  isActive: boolean;
  createdAt: string;
}

interface SystemStats {
  totalUsers: number;
  activeUsers: number;
  technicians: number;
  managers: number;
  admins: number;
}

const ROLE_CONFIG = {
  technician: { label: "Technician", icon: Wrench, color: "bg-blue-500" },
  manager: { label: "Manager", icon: Shield, color: "bg-purple-500" },
  admin: { label: "Admin", icon: Crown, color: "bg-amber-500" },
};

export default function AdminUsers() {
  const { toast } = useToast();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
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

  // Calculate system stats
  const systemStats: SystemStats = {
    totalUsers: users?.length || 0,
    activeUsers: users?.filter(u => u.isActive).length || 0,
    technicians: users?.filter(u => u.role === "technician").length || 0,
    managers: users?.filter(u => u.role === "manager").length || 0,
    admins: users?.filter(u => u.role === "admin").length || 0,
  };

  // Filter users
  const filteredUsers = users?.filter(user => {
    const matchesSearch = searchQuery === "" ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  }) || [];

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
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader title="Admin Panel" />

      <main className="flex-1 max-w-4xl mx-auto px-4 py-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* System Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systemStats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Total Users</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <Activity className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systemStats.activeUsers}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systemStats.technicians}</p>
                  <p className="text-xs text-muted-foreground">Techs</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Shield className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systemStats.managers}</p>
                  <p className="text-xs text-muted-foreground">Managers</p>
                </div>
              </div>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Crown className="w-5 h-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{systemStats.admins}</p>
                  <p className="text-xs text-muted-foreground">Admins</p>
                </div>
              </div>
            </Card>
          </div>

          {/* User Management Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-6 h-6" />
              <h1 className="text-2xl font-bold">User Management</h1>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Filter role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="technician">Technician</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>

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
          </div>

          {/* Users List */}
          <Card className="p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : filteredUsers.length ? (
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIG[user.role];
                  const RoleIcon = roleConfig.icon;
                  return (
                    <motion.div
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
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
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="w-3 h-3" />
                            {user.email}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            <Calendar className="w-3 h-3 inline mr-1" />
                            Joined {format(new Date(user.createdAt), "MMM d, yyyy")}
                          </p>
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

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant={user.isActive ? "outline" : "default"}
                              size="sm"
                              data-testid={`button-toggle-active-${user.id}`}
                            >
                              {user.isActive ? (
                                <><X className="mr-1 h-4 w-4" /> Disable</>
                              ) : (
                                <><Check className="mr-1 h-4 w-4" /> Enable</>
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {user.isActive ? "Disable User" : "Enable User"}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {user.isActive
                                  ? `This will prevent ${user.firstName} from logging in. They will be logged out immediately.`
                                  : `This will allow ${user.firstName} to log in again.`}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => toggleActiveMutation.mutate({
                                  userId: user.id,
                                  isActive: !user.isActive
                                })}
                              >
                                {user.isActive ? "Disable" : "Enable"}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No users found</p>
                <p className="text-sm mt-1">
                  {searchQuery || roleFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Create your first user to get started"}
                </p>
              </div>
            )}
          </Card>

          {/* System Info & Permissions */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Role Permissions
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/5">
                  <Wrench className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Technician</p>
                    <p className="text-muted-foreground">Scan vehicles, track wash progress, manage parking sessions</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-purple-500/5">
                  <Shield className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Manager</p>
                    <p className="text-muted-foreground">All technician permissions plus analytics, live queue, and audit logs</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/5">
                  <Crown className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <p className="font-medium">Admin</p>
                    <p className="text-muted-foreground">Full access including user management and system settings</p>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                System Information
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Server className="w-4 h-4 text-muted-foreground" />
                    <span>App Version</span>
                  </div>
                  <Badge variant="secondary">v1.0.0</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-muted-foreground" />
                    <span>Database</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Connected</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    <span>CRM Integration</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-muted-foreground" />
                    <span>Real-time Updates</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-500/10 text-green-600">Enabled</Badge>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}
