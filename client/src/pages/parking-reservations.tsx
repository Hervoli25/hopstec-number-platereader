import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  User,
  Car,
  MapPin,
  Check,
  X,
  QrCode
} from "lucide-react";

interface ParkingReservation {
  id: string;
  plateDisplay: string | null;
  customerName: string;
  customerPhone: string | null;
  customerEmail: string | null;
  zoneId: string | null;
  spotNumber: string | null;
  reservedFrom: string;
  reservedUntil: string;
  status: string;
  confirmationCode: string;
  notes: string | null;
}

interface ParkingZone {
  id: string;
  name: string;
  code: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  confirmed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  checked_in: "bg-green-500/10 text-green-600 border-green-500/20",
  completed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-600 border-red-500/20"
};

export default function ParkingReservations() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filter, setFilter] = useState<string>("confirmed");

  const { data: reservations = [], isLoading } = useQuery<ParkingReservation[]>({
    queryKey: ["/api/parking/reservations", { status: filter !== "all" ? filter : undefined }]
  });

  const { data: zones = [] } = useQuery<ParkingZone[]>({
    queryKey: ["/api/parking/zones"]
  });

  const createReservationMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/parking/reservations", data);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/reservations"] });
      setShowCreateDialog(false);
      toast({
        title: "Reservation created",
        description: `Confirmation code: ${data.confirmationCode}`
      });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create reservation", description: error.message, variant: "destructive" });
    }
  });

  const updateReservationMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const res = await apiRequest("PUT", `/api/parking/reservations/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/reservations"] });
      toast({ title: "Reservation updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update reservation", description: error.message, variant: "destructive" });
    }
  });

  const checkInMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("POST", `/api/parking/reservations/${id}/check-in`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/parking/reservations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/parking/sessions"] });
      toast({ title: "Checked in successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to check in", description: error.message, variant: "destructive" });
    }
  });

  const upcomingReservations = reservations.filter(r =>
    new Date(r.reservedFrom) > new Date() && r.status === "confirmed"
  );

  const todayReservations = reservations.filter(r => {
    const today = new Date();
    const reservedDate = new Date(r.reservedFrom);
    return reservedDate.toDateString() === today.toDateString();
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/parking")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Parking Reservations</h1>
          <div className="flex-1" />
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Reservation
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create Reservation</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const formData = new FormData(e.currentTarget);
                  createReservationMutation.mutate({
                    customerName: formData.get("customerName"),
                    customerPhone: formData.get("customerPhone") || null,
                    customerEmail: formData.get("customerEmail") || null,
                    plateDisplay: formData.get("plateDisplay") || null,
                    zoneId: formData.get("zoneId") || null,
                    spotNumber: formData.get("spotNumber") || null,
                    reservedFrom: formData.get("reservedFrom"),
                    reservedUntil: formData.get("reservedUntil"),
                    notes: formData.get("notes") || null
                  });
                }}
                className="space-y-4"
              >
                <div>
                  <Label>Customer Name *</Label>
                  <Input name="customerName" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Phone</Label>
                    <Input name="customerPhone" />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input name="customerEmail" type="email" />
                  </div>
                </div>
                <div>
                  <Label>License Plate (optional)</Label>
                  <Input name="plateDisplay" placeholder="Can be added later" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Zone</Label>
                    <Select name="zoneId">
                      <SelectTrigger>
                        <SelectValue placeholder="Any zone" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map(zone => (
                          <SelectItem key={zone.id} value={zone.id}>{zone.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Spot Number</Label>
                    <Input name="spotNumber" placeholder="Optional" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>From *</Label>
                    <Input name="reservedFrom" type="datetime-local" required />
                  </div>
                  <div>
                    <Label>Until *</Label>
                    <Input name="reservedUntil" type="datetime-local" required />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea name="notes" placeholder="Special requests..." />
                </div>
                <Button type="submit" className="w-full" disabled={createReservationMutation.isPending}>
                  Create Reservation
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{todayReservations.length}</p>
                  <p className="text-xs text-muted-foreground">Today's Reservations</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-green-500" />
                <div>
                  <p className="text-2xl font-bold">{upcomingReservations.length}</p>
                  <p className="text-xs text-muted-foreground">Upcoming</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter */}
        <div className="flex gap-2 flex-wrap">
          {["all", "confirmed", "checked_in", "pending", "completed", "cancelled"].map(status => (
            <Button
              key={status}
              variant={filter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(status)}
            >
              {status.charAt(0).toUpperCase() + status.slice(1).replace("_", " ")}
            </Button>
          ))}
        </div>

        {/* Reservations List */}
        {isLoading ? (
          <Card><CardContent className="py-8 text-center text-muted-foreground">Loading...</CardContent></Card>
        ) : reservations.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No reservations found</p>
              <Button variant="outline" className="mt-4" onClick={() => setShowCreateDialog(true)}>
                Create First Reservation
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {reservations.map((reservation, index) => (
              <motion.div
                key={reservation.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
              >
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={statusColors[reservation.status] || ""}>
                            {reservation.status.replace("_", " ")}
                          </Badge>
                          <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">
                            {reservation.confirmationCode}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 mb-1">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{reservation.customerName}</span>
                        </div>

                        {reservation.plateDisplay && (
                          <div className="flex items-center gap-2 mb-1">
                            <Car className="h-4 w-4 text-muted-foreground" />
                            <span className="font-mono">{reservation.plateDisplay}</span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>
                            {new Date(reservation.reservedFrom).toLocaleString()} -
                            {new Date(reservation.reservedUntil).toLocaleTimeString()}
                          </span>
                        </div>

                        {reservation.zoneId && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {zones.find(z => z.id === reservation.zoneId)?.name}
                              {reservation.spotNumber && ` - Spot ${reservation.spotNumber}`}
                            </span>
                          </div>
                        )}

                        {reservation.notes && (
                          <p className="text-sm text-muted-foreground mt-2 italic">
                            {reservation.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {reservation.status === "confirmed" && (
                          <Button
                            size="sm"
                            onClick={() => checkInMutation.mutate(reservation.id)}
                            disabled={checkInMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Check In
                          </Button>
                        )}
                        {reservation.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReservationMutation.mutate({
                                id: reservation.id,
                                data: { status: "confirmed" }
                              })}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Confirm
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateReservationMutation.mutate({
                                id: reservation.id,
                                data: { status: "cancelled" }
                              })}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </>
                        )}
                      </div>
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
