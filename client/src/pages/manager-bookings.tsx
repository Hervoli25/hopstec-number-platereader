import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Calendar,
  Clock,
  Car,
  User,
  Phone,
  Mail,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Filter,
  X,
  Bell,
  Send,
} from "lucide-react";
import { format } from "date-fns";

interface Booking {
  id: string;
  bookingReference: string;
  status: string;
  bookingDate: string;
  timeSlot: string;
  licensePlate: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleColor: string;
  serviceName: string;
  serviceDescription: string;
  customerName: string | null;
  customerEmail: string;
  customerPhone: string | null;
  totalAmount: number;
  notes: string | null;
  isWithinOneHour: boolean;
  canCustomerModify: boolean;
  lastModifiedAt?: string;
}

const statusColors: Record<string, string> = {
  CONFIRMED: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  IN_PROGRESS: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  COMPLETED: "bg-green-500/20 text-green-400 border-green-500/30",
  CANCELLED: "bg-red-500/20 text-red-400 border-red-500/30",
  NO_SHOW: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  READY_FOR_PICKUP: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

export default function ManagerBookings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");

  // Dialog states
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [notifyDialogOpen, setNotifyDialogOpen] = useState(false);

  // Edit form state
  const [editDate, setEditDate] = useState("");
  const [editTimeSlot, setEditTimeSlot] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editStatus, setEditStatus] = useState("");
  const [editReason, setEditReason] = useState("");
  const [cancelReason, setCancelReason] = useState("");

  // Notification state
  const [notifyType, setNotifyType] = useState<"BOOKING_CANCELLED" | "BOOKING_MODIFIED" | "BOOKING_RESCHEDULED">("BOOKING_MODIFIED");
  const [notifySubject, setNotifySubject] = useState("");
  const [notifyBody, setNotifyBody] = useState("");
  const [notifyReason, setNotifyReason] = useState("");

  // Check if user has manager, admin, or super_admin role
  const canManageBookings = user?.role === "manager" || user?.role === "admin" || user?.role === "super_admin";
  const isSuperAdmin = user?.isSuperAdmin === true;

  // Fetch bookings
  const { data, isLoading, refetch, error: fetchError } = useQuery({
    queryKey: ["manager-bookings", search, statusFilter, dateFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (statusFilter && statusFilter !== "all") params.append("status", statusFilter);
      if (dateFilter) {
        params.append("fromDate", dateFilter);
        params.append("toDate", dateFilter);
      }
      params.append("limit", "50");

      const res = await fetch(`/api/manager/bookings?${params.toString()}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to fetch bookings (${res.status})`);
      }
      return res.json() as Promise<{ bookings: Booking[]; total: number; error?: string; technicalError?: string }>;
    },
    enabled: canManageBookings,
  });

  // Update booking mutation
  const updateMutation = useMutation({
    mutationFn: async (updates: { id: string; data: any }) => {
      const res = await fetch(`/api/manager/bookings/${updates.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updates.data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update booking");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["manager-bookings"] });
      setEditDialogOpen(false);
      setSelectedBooking(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/manager/bookings/${id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ reason: cancelReason || undefined }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to cancel booking");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking cancelled", description: "Customer notification queued." });
      queryClient.invalidateQueries({ queryKey: ["manager-bookings"] });
      setCancelDialogOpen(false);
      setCancelReason("");
      setSelectedBooking(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to cancel booking",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Send notification mutation
  const sendNotificationMutation = useMutation({
    mutationFn: async ({ bookingId, type, body, reason }: { bookingId: string; type: string; body: string; reason?: string }) => {
      const res = await fetch("/api/manager/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId, type, body, reason }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send notification");
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Notification queued", description: "Customer will be notified shortly." });
      setNotifyDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({ title: "Failed to send notification", description: error.message, variant: "destructive" });
    },
  });

  // Preview notification template for a booking
  const previewNotification = async (booking: Booking, type: "BOOKING_CANCELLED" | "BOOKING_MODIFIED" | "BOOKING_RESCHEDULED", reason?: string) => {
    try {
      const res = await fetch("/api/manager/notifications/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ bookingId: booking.id, type, reason }),
      });
      if (res.ok) {
        const { subject, body } = await res.json();
        setNotifySubject(subject);
        setNotifyBody(body);
      }
    } catch {
      // fallback — leave fields empty for manual entry
    }
  };

  const openNotifyDialog = async (booking: Booking, type: "BOOKING_CANCELLED" | "BOOKING_MODIFIED" | "BOOKING_RESCHEDULED") => {
    setSelectedBooking(booking);
    setNotifyType(type);
    setNotifyReason("");
    setNotifySubject("");
    setNotifyBody("");
    setNotifyDialogOpen(true);
    await previewNotification(booking, type);
  };

  const openEditDialog = (booking: Booking) => {
    setSelectedBooking(booking);
    setEditDate(booking.bookingDate.split("T")[0]);
    setEditTimeSlot(booking.timeSlot);
    setEditNotes(booking.notes || "");
    setEditStatus(booking.status);
    setEditReason("");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (!selectedBooking) return;

    const updates: any = {};
    if (editDate !== selectedBooking.bookingDate.split("T")[0]) {
      updates.bookingDate = editDate;
    }
    if (editTimeSlot !== selectedBooking.timeSlot) {
      updates.timeSlot = editTimeSlot;
    }
    if (editNotes !== (selectedBooking.notes || "")) {
      updates.notes = editNotes;
    }
    if (editStatus !== selectedBooking.status) {
      updates.status = editStatus;
    }

    if (Object.keys(updates).length === 0) {
      toast({ title: "No changes to save" });
      return;
    }

    if (editReason) updates.reason = editReason;
    updateMutation.mutate({ id: selectedBooking.id, data: updates });
  };

  if (!canManageBookings) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <AppHeader />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card className="max-w-md mx-auto">
            <CardContent className="pt-6 text-center">
              <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
              <p className="text-muted-foreground">
                You need Manager or Admin role to access booking management.
              </p>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />

      <main className="flex-1 container mx-auto px-4 py-6 pb-24">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Booking Management</h1>
          <p className="text-muted-foreground">
            View, modify, reschedule, or cancel customer bookings
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-4">
            <div className="flex flex-col md:flex-row gap-4">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by reference, name, email, phone, or plate..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full md:w-[180px]"
              />

              {/* Refresh */}
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>

              {/* Clear Filters */}
              {(search || statusFilter !== "all" || dateFilter) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("all");
                    setDateFilter("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {fetchError && (
          <Card className="mb-4 border-destructive">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">Error: {fetchError.message}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CRM Connection Warning */}
        {data?.error && (
          <Card className="mb-4 border-yellow-500">
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                <span className="font-medium">{data.error}</span>
              </div>
              {/* Technical details only for super admin */}
              {isSuperAdmin && data.technicalError && (
                <div className="mt-2 p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
                  Technical: {data.technicalError}
                </div>
              )}
              {!isSuperAdmin && (
                <p className="text-sm text-muted-foreground mt-1">
                  Please contact support if this issue persists.
                </p>
              )}
              {isSuperAdmin && (
                <p className="text-sm text-muted-foreground mt-1">
                  Check BOOKING_DATABASE_URL configuration.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Results Count */}
        {data && !data.error && (
          <p className="text-sm text-muted-foreground mb-4">
            Showing {data.bookings.length} of {data.total} bookings
          </p>
        )}

        {/* Bookings List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <Card key={i}>
                <CardContent className="pt-4">
                  <Skeleton className="h-24 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.bookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center">
              <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">No bookings found</h3>
              <p className="text-muted-foreground text-sm">
                {data?.error
                  ? "CRM database connection issue. Check your configuration."
                  : "Try adjusting your search or filters"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {data?.bookings.map((booking) => (
              <Card key={booking.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    {/* Booking Info */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-semibold text-primary">
                          #{booking.bookingReference}
                        </span>
                        <Badge className={statusColors[booking.status] || ""}>
                          {booking.status.replace(/_/g, " ")}
                        </Badge>
                        {booking.isWithinOneHour && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Within 1hr
                          </Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <User className="h-4 w-4" />
                          <span>{booking.customerName || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Mail className="h-4 w-4" />
                          <span className="truncate">{booking.customerEmail}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Phone className="h-4 w-4" />
                          <span>{booking.customerPhone || "N/A"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Car className="h-4 w-4" />
                          <span className="font-mono">{booking.licensePlate}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-primary" />
                          <span>
                            {format(new Date(booking.bookingDate), "EEE, MMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-primary" />
                          <span>{booking.timeSlot}</span>
                        </div>
                      </div>

                      <div className="text-sm">
                        <span className="text-muted-foreground">Service: </span>
                        <span className="font-medium">{booking.serviceName}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 md:flex-col">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedBooking(booking);
                          setViewDialogOpen(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      {booking.status !== "COMPLETED" && booking.status !== "CANCELLED" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEditDialog(booking)}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedBooking(booking);
                              setCancelDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
            <DialogDescription>
              Reference: #{selectedBooking?.bookingReference}
            </DialogDescription>
          </DialogHeader>

          {selectedBooking && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={statusColors[selectedBooking.status] || ""}>
                  {selectedBooking.status.replace(/_/g, " ")}
                </Badge>
                {selectedBooking.isWithinOneHour && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Customer cannot self-modify
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">Customer</Label>
                  <p className="font-medium">{selectedBooking.customerName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedBooking.customerEmail}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Phone</Label>
                  <p className="font-medium">{selectedBooking.customerPhone || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">License Plate</Label>
                  <p className="font-mono font-medium">{selectedBooking.licensePlate}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Vehicle</Label>
                  <p className="font-medium">
                    {selectedBooking.vehicleMake} {selectedBooking.vehicleModel}
                    {selectedBooking.vehicleColor && ` (${selectedBooking.vehicleColor})`}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Service</Label>
                  <p className="font-medium">{selectedBooking.serviceName}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="font-medium">
                    {format(new Date(selectedBooking.bookingDate), "EEEE, MMMM d, yyyy")}
                  </p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Time</Label>
                  <p className="font-medium">{selectedBooking.timeSlot}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Amount</Label>
                  <p className="font-medium">
                    R{(selectedBooking.totalAmount / 100).toFixed(2)}
                  </p>
                </div>
              </div>

              {selectedBooking.notes && (
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-sm mt-1 p-2 bg-muted rounded">
                    {selectedBooking.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setViewDialogOpen(false);
                if (selectedBooking) openNotifyDialog(selectedBooking, "BOOKING_MODIFIED");
              }}
            >
              <Bell className="h-4 w-4 mr-1" />
              Notify Customer
            </Button>
            <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Booking</DialogTitle>
            <DialogDescription>
              Modify booking #{selectedBooking?.bookingReference}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Time Slot</Label>
              <Input
                type="time"
                value={editTimeSlot}
                onChange={(e) => setEditTimeSlot(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editStatus} onValueChange={setEditStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="READY_FOR_PICKUP">Ready for Pickup</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="NO_SHOW">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                placeholder="Add notes about this booking..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Reason for Change <span className="text-muted-foreground text-xs">(optional — included in customer notification)</span></Label>
              <Textarea
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="e.g. Staff availability, equipment maintenance..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save & Notify Customer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel booking #{selectedBooking?.bookingReference}?
              This action cannot be undone. The customer will be notified automatically.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="px-1 pb-2">
            <Label className="text-sm">Reason for cancellation <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Unexpected closure, technician unavailable..."
              rows={2}
              className="mt-1"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCancelReason("")}>Keep Booking</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedBooking && cancelMutation.mutate(selectedBooking.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelMutation.isPending ? "Cancelling..." : "Yes, Cancel & Notify Customer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Send Notification Dialog */}
      <Dialog open={notifyDialogOpen} onOpenChange={setNotifyDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Send Customer Notification
            </DialogTitle>
            <DialogDescription>
              Notify {selectedBooking?.customerName || selectedBooking?.customerEmail} about their booking #{selectedBooking?.bookingReference}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Notification Type</Label>
              <Select
                value={notifyType}
                onValueChange={async (val: typeof notifyType) => {
                  setNotifyType(val);
                  if (selectedBooking) await previewNotification(selectedBooking, val, notifyReason);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BOOKING_MODIFIED">Booking Modified</SelectItem>
                  <SelectItem value="BOOKING_RESCHEDULED">Booking Rescheduled</SelectItem>
                  <SelectItem value="BOOKING_CANCELLED">Booking Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Reason <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={notifyReason}
                onChange={(e) => setNotifyReason(e.target.value)}
                placeholder="Reason for the change..."
                onBlur={async () => {
                  if (selectedBooking) await previewNotification(selectedBooking, notifyType, notifyReason);
                }}
              />
            </div>

            {notifySubject && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input value={notifySubject} onChange={(e) => setNotifySubject(e.target.value)} />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={notifyBody}
                onChange={(e) => setNotifyBody(e.target.value)}
                placeholder="Loading template..."
                rows={10}
                className="font-mono text-xs"
              />
            </div>

            <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
              <strong>Sending to:</strong> {selectedBooking?.customerEmail}
              {selectedBooking?.customerPhone && ` · ${selectedBooking.customerPhone}`}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNotifyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!selectedBooking) return;
                sendNotificationMutation.mutate({
                  bookingId: selectedBooking.id,
                  type: notifyType,
                  body: notifyBody,
                  reason: notifyReason || undefined,
                });
              }}
              disabled={sendNotificationMutation.isPending || !notifyBody}
            >
              <Send className="h-4 w-4 mr-2" />
              {sendNotificationMutation.isPending ? "Sending..." : "Queue Notification"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AppFooter />
    </div>
  );
}
