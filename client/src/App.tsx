import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import TechnicianHome from "@/pages/technician-home";
import ScanCarwash from "@/pages/scan-carwash";
import ScanParking from "@/pages/scan-parking";
import WashJobDetail from "@/pages/wash-job-detail";
import MyJobs from "@/pages/my-jobs";
import ManagerDashboard from "@/pages/manager-dashboard";
import ManagerAnalytics from "@/pages/manager-analytics";
import ManagerAudit from "@/pages/manager-audit";

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

function AppRouter() {
  const { user, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  return (
    <Switch>
      <Route path="/" component={TechnicianHome} />
      <Route path="/scan/carwash" component={ScanCarwash} />
      <Route path="/scan/parking" component={ScanParking} />
      <Route path="/wash-job/:id" component={WashJobDetail} />
      <Route path="/my-jobs" component={MyJobs} />
      <Route path="/manager" component={ManagerDashboard} />
      <Route path="/manager/analytics" component={ManagerAnalytics} />
      <Route path="/manager/audit" component={ManagerAudit} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <AppRouter />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
