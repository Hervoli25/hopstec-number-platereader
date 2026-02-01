import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { 
  LayoutDashboard, BarChart3, ClipboardList, LogOut, 
  Activity, Search, Filter, Car, ParkingSquare, Camera
} from "lucide-react";
import type { EventLog } from "@shared/schema";
import { format } from "date-fns";

const EVENT_ICONS: Record<string, typeof Car> = {
  "wash_created": Car,
  "wash_status_update": Activity,
  "wash_photo": Camera,
  "parking_entry": ParkingSquare,
  "parking_exit": ParkingSquare,
};

const EVENT_COLORS: Record<string, string> = {
  "wash_created": "bg-blue-500",
  "wash_status_update": "bg-cyan-500",
  "wash_photo": "bg-purple-500",
  "parking_entry": "bg-green-500",
  "parking_exit": "bg-orange-500",
};

export default function ManagerAudit() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [searchPlate, setSearchPlate] = useState("");
  const [eventType, setEventType] = useState<string>("all");

  const { data: events, isLoading } = useQuery<EventLog[]>({
    queryKey: ["/api/events", { plate: searchPlate, type: eventType !== "all" ? eventType : undefined }],
  });

  const initials = user ? 
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase() 
    : "M";

  const navItems = [
    { href: "/manager", label: "Live Queue", icon: Activity },
    { href: "/manager/analytics", label: "Analytics", icon: BarChart3 },
    { href: "/manager/audit", label: "Audit Log", icon: ClipboardList },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <LayoutDashboard className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">PlateFlow Manager</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Avatar className="w-8 h-8">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-sm">{initials}</AvatarFallback>
            </Avatar>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => logout()}
              data-testid="button-logout"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <nav className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <button
                    className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                      isActive 
                        ? "border-primary text-primary" 
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </button>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search plate..."
                  value={searchPlate}
                  onChange={(e) => setSearchPlate(e.target.value.toUpperCase())}
                  className="pl-9 w-full sm:w-48"
                  data-testid="input-search-plate"
                />
              </div>
              <Select value={eventType} onValueChange={setEventType}>
                <SelectTrigger className="w-40" data-testid="select-event-type">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Filter" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Events</SelectItem>
                  <SelectItem value="wash_created">Wash Created</SelectItem>
                  <SelectItem value="wash_status_update">Status Update</SelectItem>
                  <SelectItem value="parking_entry">Parking Entry</SelectItem>
                  <SelectItem value="parking_exit">Parking Exit</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card className="divide-y divide-border">
            {isLoading ? (
              <div className="p-4 space-y-4">
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
                <Skeleton className="h-16" />
              </div>
            ) : events?.length ? (
              events.map((event, index) => {
                const Icon = EVENT_ICONS[event.type] || Activity;
                const color = EVENT_COLORS[event.type] || "bg-gray-500";
                
                return (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className="p-4 flex items-start gap-4"
                    data-testid={`event-${event.id}`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="font-mono">
                          {event.plateDisplay || "N/A"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {event.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.createdAt ? format(new Date(event.createdAt), "MMM d, yyyy HH:mm:ss") : "N/A"}
                      </p>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="p-12 text-center text-muted-foreground">
                <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No events found</p>
                {searchPlate && (
                  <p className="text-sm mt-2">Try a different search term</p>
                )}
              </div>
            )}
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
