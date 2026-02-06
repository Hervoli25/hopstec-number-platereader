import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Star,
  Users,
  Edit,
  Calendar,
  Car,
  DollarSign,
  Search
} from "lucide-react";

interface FrequentParker {
  id: string;
  plateDisplay: string;
  plateNormalized: string;
  customerName: string | null;
  customerPhone: string | null;
  customerEmail: string | null;
  visitCount: number;
  totalSpent: number;
  isVip: boolean;
  monthlyPassExpiry: string | null;
  notes: string | null;
  lastVisitAt: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export default function ParkingVIP() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingParker, setEditingParker] = useState<FrequentParker | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "vip" | "monthly">("all");

  const { data: parkers = [], isLoading } = useQuery<FrequentParker[]>({
    queryKey: ["/api/parking/frequent-parkers", { vip: filter === "vip" ? "true" : undefined, monthlyPass: filter === "monthly" ? "true" : undefined }]
  });

  const updateParkerMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/parking/frequent-parkers/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/frequent-parkers"] });
      setEditingParker(null);
      toast({ title: "Customer updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update customer", description: error.message, variant: "destructive" });
    }
  });

  const filteredParkers = parkers.filter(p =>
    p.plateDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.customerEmail?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const hasActiveMonthlyPass = (parker: FrequentParker) => {
    if (!parker.monthlyPassExpiry) return false;
    return new Date(parker.monthlyPassExpiry) > new Date();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/parking")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">VIP & Monthly Passes</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-2xl font-bold">{parkers.length}</p>
                  <p className="text-xs text-muted-foreground">Total Customers</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-amber-500" />
                <div>
                  <p className="text-2xl font-bold">{parkers.filter(p => p.isVip).length}</p>
                  <p className="text-xs text-muted-foreground">VIP Members</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{parkers.filter(hasActiveMonthlyPass).length}</p>
                  <p className="text-xs text-muted-foreground">Monthly Passes</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate, name, or email..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={filter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("all")}
            >
              All
            </Button>
            <Button
              variant={filter === "vip" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("vip")}
            >
              <Star className="h-4 w-4 mr-1" />
              VIP
            </Button>
            <Button
              variant={filter === "monthly" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter("monthly")}
            >
              <Calendar className="h-4 w-4 mr-1" />
              Monthly
            </Button>
          </div>
        </div>

        {/* Customers List */}
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : filteredParkers.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No customers match your search" : "No frequent parkers yet"}
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                Customers are automatically tracked when they park
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredParkers.map((parker, index) => (
              <motion.div
                key={parker.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Car className="h-4 w-4 text-muted-foreground" />
                          <span className="font-mono font-bold">{parker.plateDisplay}</span>
                          {parker.isVip && (
                            <Badge variant="secondary" className="gap-1">
                              <Star className="h-3 w-3" />
                              VIP
                            </Badge>
                          )}
                          {hasActiveMonthlyPass(parker) && (
                            <Badge variant="outline" className="gap-1">
                              <Calendar className="h-3 w-3" />
                              Monthly
                            </Badge>
                          )}
                        </div>

                        {parker.customerName && (
                          <p className="font-medium">{parker.customerName}</p>
                        )}

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-2">
                          {parker.customerEmail && <span>{parker.customerEmail}</span>}
                          {parker.customerPhone && <span>{parker.customerPhone}</span>}
                        </div>

                        <div className="flex gap-4 mt-3 text-sm">
                          <div className="flex items-center gap-1">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span>{parker.visitCount} visits</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <span>{formatCurrency(parker.totalSpent)} spent</span>
                          </div>
                          <div className="text-muted-foreground">
                            Last visit: {new Date(parker.lastVisitAt).toLocaleDateString()}
                          </div>
                        </div>

                        {hasActiveMonthlyPass(parker) && (
                          <p className="text-sm text-green-600 mt-2">
                            Pass expires: {new Date(parker.monthlyPassExpiry!).toLocaleDateString()}
                          </p>
                        )}

                        {parker.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            Note: {parker.notes}
                          </p>
                        )}
                      </div>

                      <Dialog open={editingParker?.id === parker.id} onOpenChange={open => setEditingParker(open ? parker : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Customer - {parker.plateDisplay}</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              updateParkerMutation.mutate({
                                id: parker.id,
                                data: {
                                  customerName: formData.get("customerName") || null,
                                  customerPhone: formData.get("customerPhone") || null,
                                  customerEmail: formData.get("customerEmail") || null,
                                  isVip: formData.get("isVip") === "on",
                                  monthlyPassExpiry: formData.get("monthlyPassExpiry") || null,
                                  notes: formData.get("notes") || null
                                }
                              });
                            }}
                            className="space-y-4"
                          >
                            <div>
                              <Label>Customer Name</Label>
                              <Input name="customerName" defaultValue={parker.customerName || ""} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Phone</Label>
                                <Input name="customerPhone" defaultValue={parker.customerPhone || ""} />
                              </div>
                              <div>
                                <Label>Email</Label>
                                <Input name="customerEmail" type="email" defaultValue={parker.customerEmail || ""} />
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Switch name="isVip" defaultChecked={parker.isVip} />
                                <Label>VIP Status (10% discount)</Label>
                              </div>
                            </div>
                            <div>
                              <Label>Monthly Pass Expiry</Label>
                              <Input
                                name="monthlyPassExpiry"
                                type="date"
                                defaultValue={parker.monthlyPassExpiry ? new Date(parker.monthlyPassExpiry).toISOString().split('T')[0] : ""}
                              />
                              <p className="text-xs text-muted-foreground mt-1">
                                Monthly pass holders park free until this date
                              </p>
                            </div>
                            <div>
                              <Label>Notes</Label>
                              <Textarea name="notes" defaultValue={parker.notes || ""} />
                            </div>
                            <Button type="submit" className="w-full" disabled={updateParkerMutation.isPending}>
                              Save Changes
                            </Button>
                          </form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
