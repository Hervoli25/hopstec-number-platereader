import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BarChart3, Activity, ClipboardList, TrendingUp, Users, Settings, Calendar } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function ManagerGuide() {
  const sections = [
    {
      icon: Activity,
      title: "Live Queue Monitoring",
      steps: [
        "Access the Manager Dashboard from the navigation menu",
        "View real-time statistics: active washes, parked vehicles, today's totals",
        "See all active wash jobs with current status",
        "Monitor upcoming CRM bookings",
        "Jobs update automatically via real-time sync",
        "Tap 'Refresh' to manually update data"
      ]
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      steps: [
        "Navigate to Manager → Analytics",
        "View daily, weekly, and monthly performance metrics",
        "Track wash completion times and efficiency",
        "Monitor parking revenue and occupancy rates",
        "Compare performance across different time periods",
        "Export reports for business analysis"
      ]
    },
    {
      icon: ClipboardList,
      title: "Audit Log",
      steps: [
        "Access Manager → Audit Log",
        "View all system activities and user actions",
        "Filter by date range, user, or action type",
        "Track who created, updated, or completed jobs",
        "Monitor login/logout events",
        "Use for compliance and quality assurance"
      ]
    },
    {
      icon: TrendingUp,
      title: "Performance Insights",
      steps: [
        "Review average wash times per package type",
        "Identify peak hours and busy periods",
        "Track technician productivity",
        "Monitor customer satisfaction trends",
        "Analyze parking zone utilization",
        "Use insights to optimize operations"
      ]
    },
    {
      icon: Users,
      title: "Team Management",
      steps: [
        "View all active technicians and their current jobs",
        "Monitor team workload distribution",
        "Track individual performance metrics",
        "Identify training needs and opportunities",
        "Coordinate shift schedules",
        "Communicate with team members"
      ]
    },
    {
      icon: Settings,
      title: "Business Settings",
      steps: [
        "Navigate to Manager → Settings",
        "Configure wash packages and pricing",
        "Set up parking zones and rates",
        "Customize business hours",
        "Manage notification preferences",
        "Update company information"
      ]
    },
    {
      icon: Calendar,
      title: "CRM Integration",
      steps: [
        "View bookings synced from the CRM dashboard",
        "See confirmed appointments with customer details",
        "Prepare for upcoming scheduled washes",
        "Match bookings with walk-in customers",
        "Track booking fulfillment rates",
        "Coordinate with sales team"
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/help">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <img src={logoPath} alt="HOPSVOIR" className="h-8" />
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Badge variant="secondary" className="mb-4">
            <BarChart3 className="w-3 h-3 mr-1" />
            Manager
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Manager Guide</h1>
          <p className="text-muted-foreground">
            Complete guide for managers overseeing carwash and parking operations
          </p>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-4">{section.title}</h2>
                      <ul className="space-y-2">
                        {section.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

