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
  Plus,
  MapPin,
  Edit,
  DollarSign
} from "lucide-react";

interface ParkingZone {
  id: string;
  name: string;
  code: string;
  capacity: number;
  hourlyRate: number | null;
  description: string | null;
  isActive: boolean;
  occupied: number;
  available: number;
}

interface ParkingSettings {
  id: string;
  hourlyRate: number;
  dailyMaxRate: number;
  gracePeriodMinutes: number;
  totalCapacity: number;
  currency: string;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

export default function ParkingZones() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [editingZone, setEditingZone] = useState<ParkingZone | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSettingsDialog, setShowSettingsDialog] = useState(false);

  const { data: zones = [], isLoading } = useQuery<ParkingZone[]>({
    queryKey: ["/api/parking/zones", { all: "true" }]
  });

  const { data: settings } = useQuery<ParkingSettings>({
    queryKey: ["/api/parking/settings"]
  });

  const createZoneMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/parking/zones", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/zones"] });
      setShowCreateDialog(false);
      toast({ title: "Zone created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create zone", description: error.message, variant: "destructive" });
    }
  });

  const updateZoneMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/parking/zones/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/zones"] });
      setEditingZone(null);
      toast({ title: "Zone updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update zone", description: error.message, variant: "destructive" });
    }
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PUT", "/api/parking/settings", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/settings"] });
      setShowSettingsDialog(false);
      toast({ title: "Settings updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update settings", description: error.message, variant: "destructive" });
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/parking")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Parking Zones & Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Global Settings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Pricing Settings
            </CardTitle>
            <Dialog open={showSettingsDialog} onOpenChange={setShowSettingsDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Parking Settings</DialogTitle>
                </DialogHeader>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    updateSettingsMutation.mutate({
                      hourlyRate: parseInt(formData.get("hourlyRate") as string) * 100,
                      dailyMaxRate: parseInt(formData.get("dailyMaxRate") as string) * 100,
                      gracePeriodMinutes: parseInt(formData.get("gracePeriodMinutes") as string),
                      totalCapacity: parseInt(formData.get("totalCapacity") as string),
                      currency: "USD"
                    });
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Hourly Rate ($)</Label>
                      <Input
                        name="hourlyRate"
                        type="number"
                        step="0.01"
                        defaultValue={(settings?.hourlyRate || 500) / 100}
                      />
                    </div>
                    <div>
                      <Label>Daily Max ($)</Label>
                      <Input
                        name="dailyMaxRate"
                        type="number"
                        step="0.01"
                        defaultValue={(settings?.dailyMaxRate || 3000) / 100}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Grace Period (minutes)</Label>
                      <Input
                        name="gracePeriodMinutes"
                        type="number"
                        defaultValue={settings?.gracePeriodMinutes || 15}
                      />
                    </div>
                    <div>
                      <Label>Total Capacity</Label>
                      <Input
                        name="totalCapacity"
                        type="number"
                        defaultValue={settings?.totalCapacity || 50}
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={updateSettingsMutation.isPending}>
                    Save Settings
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Hourly Rate</p>
                <p className="font-semibold">{formatCurrency(settings?.hourlyRate || 500)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Daily Max</p>
                <p className="font-semibold">{formatCurrency(settings?.dailyMaxRate || 3000)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Grace Period</p>
                <p className="font-semibold">{settings?.gracePeriodMinutes || 15} min</p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Capacity</p>
                <p className="font-semibold">{settings?.totalCapacity || 50} spots</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Zones */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Zones
          </h2>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Zone
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Zone</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  const hourlyRate = formData.get("hourlyRate") as string;
                  createZoneMutation.mutate({
                    name: formData.get("name"),
                    code: formData.get("code"),
                    capacity: parseInt(formData.get("capacity") as string),
                    hourlyRate: hourlyRate ? parseInt(hourlyRate) * 100 : null,
                    description: formData.get("description") || null
                  });
                }}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Zone Name</Label>
                    <Input name="name" placeholder="Zone A" required />
                  </div>
                  <div>
                    <Label>Code</Label>
                    <Input name="code" placeholder="A" required />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Capacity</Label>
                    <Input name="capacity" type="number" defaultValue={10} required />
                  </div>
                  <div>
                    <Label>Hourly Rate ($) - Optional</Label>
                    <Input name="hourlyRate" type="number" step="0.01" placeholder="Use default" />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea name="description" placeholder="Optional description..." />
                </div>
                <Button type="submit" className="w-full" disabled={createZoneMutation.isPending}>
                  Create Zone
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : zones.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No zones created yet</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Create First Zone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {zones.map((zone, index) => (
              <motion.div
                key={zone.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className={!zone.isActive ? "opacity-60" : ""}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">{zone.name}</span>
                          <Badge variant="outline">{zone.code}</Badge>
                          {!zone.isActive && <Badge variant="secondary">Inactive</Badge>}
                        </div>
                        {zone.description && (
                          <p className="text-sm text-muted-foreground mb-2">{zone.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          <span>Capacity: {zone.capacity}</span>
                          <span>Occupied: {zone.occupied}</span>
                          {zone.hourlyRate && (
                            <span>Rate: {formatCurrency(zone.hourlyRate)}/hr</span>
                          )}
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden mt-2 max-w-xs">
                          <div
                            className="h-full bg-primary transition-all"
                            style={{ width: `${(zone.occupied / zone.capacity) * 100}%` }}
                          />
                        </div>
                      </div>
                      <Dialog open={editingZone?.id === zone.id} onOpenChange={open => setEditingZone(open ? zone : null)}>
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit Zone</DialogTitle>
                          </DialogHeader>
                          <form
                            onSubmit={e => {
                              e.preventDefault();
                              const formData = new FormData(e.currentTarget);
                              const hourlyRate = formData.get("hourlyRate") as string;
                              updateZoneMutation.mutate({
                                id: zone.id,
                                data: {
                                  name: formData.get("name"),
                                  code: formData.get("code"),
                                  capacity: parseInt(formData.get("capacity") as string),
                                  hourlyRate: hourlyRate ? parseInt(hourlyRate) * 100 : null,
                                  description: formData.get("description") || null,
                                  isActive: formData.get("isActive") === "on"
                                }
                              });
                            }}
                            className="space-y-4"
                          >
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Zone Name</Label>
                                <Input name="name" defaultValue={zone.name} required />
                              </div>
                              <div>
                                <Label>Code</Label>
                                <Input name="code" defaultValue={zone.code} required />
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <Label>Capacity</Label>
                                <Input name="capacity" type="number" defaultValue={zone.capacity} required />
                              </div>
                              <div>
                                <Label>Hourly Rate ($)</Label>
                                <Input
                                  name="hourlyRate"
                                  type="number"
                                  step="0.01"
                                  defaultValue={zone.hourlyRate ? zone.hourlyRate / 100 : ""}
                                  placeholder="Use default"
                                />
                              </div>
                            </div>
                            <div>
                              <Label>Description</Label>
                              <Textarea name="description" defaultValue={zone.description || ""} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch name="isActive" defaultChecked={zone.isActive} />
                              <Label>Active</Label>
                            </div>
                            <Button type="submit" className="w-full" disabled={updateZoneMutation.isPending}>
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
