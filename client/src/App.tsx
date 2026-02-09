import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import type { ReactNode } from "react";

import { PWAInstallPrompt } from "@/components/pwa-install-prompt";
import { IOSInstallBanner } from "@/components/ios-install-banner";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import Login from "@/pages/login";
import Register from "@/pages/register";
import TechnicianHome from "@/pages/technician-home";
import ScanCarwash from "@/pages/scan-carwash";
import ScanParking from "@/pages/scan-parking";
import WashJobDetail from "@/pages/wash-job-detail";
import MyJobs from "@/pages/my-jobs";
import ManagerDashboard from "@/pages/manager-dashboard";
import ManagerAnalytics from "@/pages/manager-analytics";
import ManagerAudit from "@/pages/manager-audit";
import ManagerBookings from "@/pages/manager-bookings";
import AdminUsers from "@/pages/admin-users";
import CustomerJob from "@/pages/customer-job";
import About from "@/pages/about";
import ParkingDashboard from "@/pages/parking-dashboard";
import ParkingZones from "@/pages/parking-zones";
import ParkingVIP from "@/pages/parking-vip";
import ParkingReservations from "@/pages/parking-reservations";
import BusinessSettings from "@/pages/business-settings";
import PrivacyPolicy from "@/pages/legal/privacy";
import TermsOfService from "@/pages/legal/terms";
import CookiePolicy from "@/pages/legal/cookies";
import Help from "@/pages/help";
import TechnicianGuide from "@/pages/help/technician";
import ManagerGuide from "@/pages/help/manager";
import AdminGuide from "@/pages/help/admin";
import CustomerGuide from "@/pages/help/customer";
import FAQ from "@/pages/help/faq";
import GettingStarted from "@/pages/help/getting-started";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="space-y-4 w-full max-w-sm px-8">
        <Skeleton className="h-12 w-12 rounded-lg mx-auto" />
        <Skeleton className="h-4 w-32 mx-auto" />
        <Skeleton className="h-3 w-48 mx-auto" />
      </div>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isLoading, isAuthenticated } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated) return <LandingPage />;
  return <>{children}</>;
}

function AppRouter() {
  const [location] = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  // Public routes accessible to everyone
  const publicPaths = ["/login", "/register", "/about", "/landing"];
  const isPublicPath = publicPaths.includes(location) ||
                       location.startsWith("/customer/job/") ||
                       location.startsWith("/legal/") ||
                       location.startsWith("/help");

  // Landing page is public
  if (location === "/landing") {
    return <LandingPage />;
  }

  if (isPublicPath) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/register" component={Register} />
        <Route path="/customer/job/:token" component={CustomerJob} />
        <Route path="/about" component={About} />
        <Route path="/legal/privacy" component={PrivacyPolicy} />
        <Route path="/legal/terms" component={TermsOfService} />
        <Route path="/legal/cookies" component={CookiePolicy} />
        <Route path="/help" component={Help} />
        <Route path="/help/technician" component={TechnicianGuide} />
        <Route path="/help/manager" component={ManagerGuide} />
        <Route path="/help/admin" component={AdminGuide} />
        <Route path="/help/customer" component={CustomerGuide} />
        <Route path="/help/faq" component={FAQ} />
        <Route path="/help/getting-started" component={GettingStarted} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Root path: show landing page for unauthenticated, dashboard for authenticated
  if (location === "/" && !isLoading && !isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <ProtectedRoute>
      <Switch>
        <Route path="/" component={TechnicianHome} />
        <Route path="/scan/carwash" component={ScanCarwash} />
        <Route path="/scan/parking" component={ScanParking} />
        <Route path="/parking" component={ParkingDashboard} />
        <Route path="/parking/zones" component={ParkingZones} />
        <Route path="/parking/vip" component={ParkingVIP} />
        <Route path="/parking/reservations" component={ParkingReservations} />
        <Route path="/wash-job/:id" component={WashJobDetail} />
        <Route path="/my-jobs" component={MyJobs} />
        <Route path="/manager" component={ManagerDashboard} />
        <Route path="/manager/analytics" component={ManagerAnalytics} />
        <Route path="/manager/audit" component={ManagerAudit} />
        <Route path="/manager/bookings" component={ManagerBookings} />
        <Route path="/manager/settings" component={BusinessSettings} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
          <PWAInstallPrompt />
          <IOSInstallBanner />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
