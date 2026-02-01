import { motion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/hooks/use-auth";
import { Car, ParkingSquare, LogOut, ClipboardList, Droplets } from "lucide-react";

export default function TechnicianHome() {
  const { user, logout } = useAuth();

  const initials = user ? 
    `${user.firstName?.charAt(0) || ""}${user.lastName?.charAt(0) || "U"}`.toUpperCase() 
    : "U";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center">
              <Droplets className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-semibold">PlateFlow</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
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

      <main className="max-w-lg mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-14 h-14">
              <AvatarImage src={user?.profileImageUrl || undefined} />
              <AvatarFallback className="text-lg">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm text-muted-foreground">Welcome back,</p>
              <h1 className="text-xl font-semibold" data-testid="text-user-name">
                {user?.firstName || "Technician"}
              </h1>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <h2 className="text-lg font-medium text-muted-foreground">Quick Actions</h2>
          
          <div className="grid gap-4">
            <Link href="/scan/carwash">
              <Card 
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20"
                data-testid="card-carwash-scan"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Car className="w-8 h-8 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">Carwash Scan</h3>
                    <p className="text-muted-foreground">Scan plate to start wash job</p>
                  </div>
                </div>
              </Card>
            </Link>

            <Link href="/scan/parking">
              <Card 
                className="p-6 hover-elevate active-elevate-2 cursor-pointer bg-gradient-to-br from-accent to-accent/50 border-accent-foreground/10"
                data-testid="card-parking-scan"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl bg-accent flex items-center justify-center">
                    <ParkingSquare className="w-8 h-8 text-accent-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">Parking Scan</h3>
                    <p className="text-muted-foreground">Entry or exit vehicle</p>
                  </div>
                </div>
              </Card>
            </Link>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-8 space-y-4"
        >
          <h2 className="text-lg font-medium text-muted-foreground">My Work</h2>
          
          <Link href="/my-jobs">
            <Card 
              className="p-4 hover-elevate active-elevate-2 cursor-pointer"
              data-testid="card-my-jobs"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <ClipboardList className="w-5 h-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">My Active Jobs</h3>
                  <p className="text-sm text-muted-foreground">View and update wash jobs</p>
                </div>
              </div>
            </Card>
          </Link>
        </motion.div>
      </main>
    </div>
  );
}
