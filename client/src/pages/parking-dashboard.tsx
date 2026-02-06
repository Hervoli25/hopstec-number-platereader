import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Car,
  Clock,
  DollarSign,
  Search,
  RefreshCw,
  MapPin,
  Users,
  TrendingUp,
  Calendar,
  Star,
  Timer
} from "lucide-react";

interface ParkingSession {
  id: string;
  plateDisplay: string;
  plateNormalized: string;
  entryAt: string;
  exitAt: string | null;
  zoneId: string | null;
  spotNumber: string | null;
  calculatedFee: number | null;
  durationMinutes: number;
  durationFormatted: string;
  estimatedFee: number;
  isGracePeriod: boolean;
  hasMonthlyPass: boolean;
  parkerInfo?: {
    customerName: string | null;
    isVip: boolean;
    visitCount: number;
  };
}

interface ParkingAnalytics {
  totalActiveSessions: number;
  totalCapacity: number;
  occupancyRate: number;
  todayRevenue: number;
  todayEntries: number;
  todayExits: number;
  avgDurationMinutes: number;
  zoneOccupancy: { zoneId: string; zoneName: string; occupied: number; capacity: number }[];
}

interface ParkingZone {
  id: string;
  name: string;
  code: string;
  capacity: number;
  occupied: number;
  available: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(cents / 100);
}

function LiveTimer({ entryAt }: { entryAt: string }) {
  const [duration, setDuration] = useState("");

  useEffect(() => {
    const update = () => {
      const start = new Date(entryAt).getTime();
      const now = Date.now();
      const diffMs = now - start;
      const minutes = Math.floor(diffMs / 60000);
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;

      if (hours > 0) {
        setDuration(`${hours}h ${mins}m`);
      } else {
        setDuration(`${mins}m`);
      }
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [entryAt]);

  return <span className="font-mono">{duration}</span>;
}

export default function ParkingDashboard() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("active");

  const { data: analytics, isLoading: analyticsLoading } = useQuery<ParkingAnalytics>({
    queryKey: ["/api/parking/analytics"],
    refetchInterval: 30000
  });

  const { data: activeSessions = [], refetch: refetchActive } = useQuery<ParkingSession[]>({
    queryKey: ["/api/parking/sessions", { open: "true" }],
    refetchInterval: 30000
  });

  const { data: recentSessions = [] } = useQuery<ParkingSession[]>({
    queryKey: ["/api/parking/sessions", { open: "false" }],
    refetchInterval: 60000
  });

  const { data: zones = [] } = useQuery<ParkingZone[]>({
    queryKey: ["/api/parking/zones"]
  });

  const filteredActive = activeSessions.filter(s =>
    s.plateDisplay.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.parkerInfo?.customerName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRecent = recentSessions.filter(s =>
    s.plateDisplay.toLowerCase().includes(searchQuery.toLowerCase())
  ).slice(0, 20);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold text-lg">Parking Dashboard</h1>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => refetchActive()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Analytics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <Car className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.totalActiveSessions || 0}</p>
                  <p className="text-xs text-muted-foreground">Active Vehicles</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.occupancyRate || 0}%</p>
                  <p className="text-xs text-muted-foreground">Occupancy</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <DollarSign className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{formatCurrency(analytics?.todayRevenue || 0)}</p>
                  <p className="text-xs text-muted-foreground">Today's Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <Clock className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics?.avgDurationMinutes || 0}m</p>
                  <p className="text-xs text-muted-foreground">Avg Duration</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Zone Occupancy */}
        {zones.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Zone Occupancy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {zones.map(zone => (
                  <div key={zone.id} className="p-3 rounded-lg border bg-muted/30">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{zone.name}</span>
                      <Badge variant={zone.available > 0 ? "secondary" : "destructive"}>
                        {zone.available > 0 ? `${zone.available} free` : "Full"}
                      </Badge>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(zone.occupied / zone.capacity) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {zone.occupied} / {zone.capacity}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Tabs */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by plate or customer name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              <Timer className="h-4 w-4" />
              Active ({activeSessions.length})
            </TabsTrigger>
            <TabsTrigger value="recent" className="gap-2">
              <Calendar className="h-4 w-4" />
              Recent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="mt-4">
            {filteredActive.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Car className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No active parking sessions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredActive.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-lg font-mono font-bold">{session.plateDisplay}</span>
                              {session.parkerInfo?.isVip && (
                                <Badge variant="secondary" className="gap-1">
                                  <Star className="h-3 w-3" />
                                  VIP
                                </Badge>
                              )}
                              {session.hasMonthlyPass && (
                                <Badge variant="outline">Monthly Pass</Badge>
                              )}
                              {session.isGracePeriod && (
                                <Badge variant="secondary">Grace Period</Badge>
                              )}
                            </div>
                            {session.parkerInfo?.customerName && (
                              <p className="text-sm text-muted-foreground">{session.parkerInfo.customerName}</p>
                            )}
                            {session.spotNumber && (
                              <p className="text-xs text-muted-foreground">Spot: {session.spotNumber}</p>
                            )}
                          </div>

                          <div className="text-right">
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <Clock className="h-4 w-4" />
                              <LiveTimer entryAt={session.entryAt} />
                            </div>
                            <p className="text-lg font-semibold text-primary">
                              {formatCurrency(session.estimatedFee)}
                            </p>
                            {session.parkerInfo && (
                              <p className="text-xs text-muted-foreground">
                                {session.parkerInfo.visitCount} visits
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="recent" className="mt-4">
            {filteredRecent.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No recent sessions</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {filteredRecent.map((session, index) => (
                  <motion.div
                    key={session.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card>
                      <CardContent className="py-4">
                        <div className="flex items-center gap-4">
                          <div className="flex-1">
                            <span className="font-mono font-bold">{session.plateDisplay}</span>
                            <p className="text-sm text-muted-foreground">
                              {new Date(session.entryAt).toLocaleDateString()} - {session.durationFormatted}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{formatCurrency(session.calculatedFee || 0)}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Button variant="outline" onClick={() => setLocation("/scan-parking")} className="h-auto py-4 flex-col gap-2">
                <Car className="h-5 w-5" />
                <span>Entry/Exit</span>
              </Button>
              <Button variant="outline" onClick={() => setLocation("/parking/zones")} className="h-auto py-4 flex-col gap-2">
                <MapPin className="h-5 w-5" />
                <span>Manage Zones</span>
              </Button>
              <Button variant="outline" onClick={() => setLocation("/parking/vip")} className="h-auto py-4 flex-col gap-2">
                <Users className="h-5 w-5" />
                <span>VIP & Passes</span>
              </Button>
              <Button variant="outline" onClick={() => setLocation("/parking/reservations")} className="h-auto py-4 flex-col gap-2">
                <Calendar className="h-5 w-5" />
                <span>Reservations</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
