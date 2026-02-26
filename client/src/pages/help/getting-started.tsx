import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Rocket, LogIn, Car, Eye, Settings, CheckCircle } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function GettingStarted() {
  const steps = [
    {
      icon: LogIn,
      title: "1. Log In to Your Account",
      description: "Access HOPSVOIR with your credentials",
      details: [
        "Open HOPSVOIR in your web browser",
        "Enter your email and password",
        "Your role (Technician, Manager, Admin) determines your access level",
        "First-time users: Contact your admin to create an account",
        "Enable 'Remember Me' for faster login on trusted devices"
      ]
    },
    {
      icon: Car,
      title: "2. Familiarize Yourself with the Dashboard",
      description: "Explore the main interface",
      details: [
        "Technicians: See 'Carwash Scan' and 'Parking Scan' quick actions",
        "Managers: View live queue, analytics, and team performance",
        "Admins: Access user management and system settings",
        "Use the navigation menu to explore different sections",
        "Check 'My Jobs' to see your work history"
      ]
    },
    {
      icon: Car,
      title: "3. Create Your First Wash Job (Technicians)",
      description: "Start tracking a vehicle",
      details: [
        "Tap 'Carwash Scan' from the home screen",
        "Enter the vehicle's license plate number",
        "Select the appropriate wash package",
        "Add customer contact info (optional but recommended)",
        "Tap 'Create Wash Job' to begin",
        "The job starts in 'Received' status"
      ]
    },
    {
      icon: Eye,
      title: "4. Update Job Status & Take Photos",
      description: "Track progress through wash stages",
      details: [
        "Open the active job from 'My Jobs'",
        "Tap the camera button to capture photos at each stage",
        "Confirm each checklist step: Receive Car → High Pressure Wash → Foam Application → Rinse → Hand Dry & Vacuum → Tyre Shine → Quality Check → Complete",
        "Photos and timestamps are saved automatically",
        "Share the tracking link with customers for transparency"
      ]
    },
    {
      icon: Settings,
      title: "5. Explore Advanced Features",
      description: "Make the most of HOPSVOIR",
      details: [
        "Managers: Review analytics to optimize operations",
        "Use the audit log to track team activities",
        "Set up parking zones and rates (Admins)",
        "Configure notification preferences",
        "Install HOPSVOIR as a PWA for offline access",
        "Customize your profile and preferences"
      ]
    },
    {
      icon: CheckCircle,
      title: "6. Best Practices",
      description: "Tips for success",
      details: [
        "Always verify license plate numbers before creating jobs",
        "Take clear photos for quality documentation",
        "Update job status promptly to keep customers informed",
        "Use the correct wash package for accurate billing",
        "Check for existing jobs before creating duplicates",
        "Report issues to your manager or admin immediately"
      ]
    }
  ];

  const quickTips = [
    {
      title: "Install as PWA",
      description: "Add HOPSVOIR to your home screen for a native app experience"
    },
    {
      title: "Enable Notifications",
      description: "Stay updated on job status changes and team activities"
    },
    {
      title: "Use Dark Mode",
      description: "Toggle theme in the header for comfortable viewing in any lighting"
    },
    {
      title: "Bookmark Important Pages",
      description: "Save frequently used pages for quick access"
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
            <Rocket className="w-3 h-3 mr-1" />
            Getting Started
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Getting Started with HOPSVOIR</h1>
          <p className="text-muted-foreground">
            Your complete guide to getting up and running quickly
          </p>
        </motion.div>

        <div className="space-y-6">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <step.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
                      <p className="text-sm text-muted-foreground mb-4">{step.description}</p>
                      <ul className="space-y-2">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span>{detail}</span>
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

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <h2 className="text-xl font-semibold mb-4">Quick Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickTips.map((tip, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">{tip.title}</h3>
                  <p className="text-sm text-muted-foreground">{tip.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Need More Help?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Explore our role-specific guides for detailed instructions:
              </p>
              <div className="flex flex-wrap gap-2">
                <Link href="/help/technician">
                  <Button variant="outline" size="sm">Technician Guide</Button>
                </Link>
                <Link href="/help/manager">
                  <Button variant="outline" size="sm">Manager Guide</Button>
                </Link>
                <Link href="/help/admin">
                  <Button variant="outline" size="sm">Admin Guide</Button>
                </Link>
                <Link href="/help/faq">
                  <Button variant="outline" size="sm">FAQ</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}

