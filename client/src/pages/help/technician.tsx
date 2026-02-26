import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Car, Camera, CheckCircle, Clock, Share2, AlertCircle, ParkingSquare, LogIn, LogOut as LogOutIcon } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function TechnicianGuide() {
  const sections = [
    {
      icon: Car,
      title: "Starting a Carwash Job",
      steps: [
        "Tap 'Carwash Scan' from the home screen",
        "Enter the vehicle's license plate number (supports France, South Africa, DRC, Zambia formats)",
        "Select the wash package (Basic, Standard, Premium, Deluxe)",
        "Optionally add customer contact information for tracking",
        "Tap 'Create Wash Job' to begin",
        "The job will start in 'Received' status"
      ]
    },
    {
      icon: Camera,
      title: "Taking Photos at Each Stage",
      steps: [
        "Open the wash job from 'My Jobs' or the dashboard",
        "At each wash stage, you'll see a camera prompt",
        "Tap the camera button to capture a photo",
        "Photos are automatically saved and linked to the job",
        "Photos help with quality assurance and customer transparency",
        "You can skip photos if needed, but they're recommended"
      ]
    },
    {
      icon: CheckCircle,
      title: "Updating Wash Status",
      steps: [
        "Open the active wash job",
        "You'll see the current status and available next steps",
        "For Standard Wash: confirm each step in the checklist — High Pressure Wash → Foam Application → Rinse → Hand Dry & Vacuum → Tyre Shine → Quality Check → Complete",
        "You can skip steps if the client only needs specific services",
        "For Rim Only, Tyre Shine Only, and Full Valet: a timer is shown — tap 'Mark Complete' when done",
        "Each status change is timestamped automatically",
        "Customers with tracking links see updates in real-time"
      ]
    },
    {
      icon: Share2,
      title: "Sharing Customer Tracking Links",
      steps: [
        "Open any wash job",
        "Tap the 'Share Tracking Link' button",
        "Copy the unique tracking URL",
        "Send it to the customer via SMS, WhatsApp, or email",
        "Customers can view their vehicle's progress without logging in",
        "Links remain active until the job is completed"
      ]
    },
    {
      icon: ParkingSquare,
      title: "Managing Parking Sessions",
      steps: [
        "Tap 'Parking Scan' from the home screen",
        "Enter the vehicle's license plate",
        "For entry: Select parking zone and tap 'Check In'",
        "For exit: The system will find the active session and calculate duration",
        "Review parking fees and tap 'Check Out'",
        "Session history is saved for billing and reports"
      ]
    },
    {
      icon: Clock,
      title: "Viewing Your Jobs",
      steps: [
        "Tap 'My Jobs' from the navigation menu",
        "See all wash jobs you've created",
        "Filter by status: Active, Completed, or All",
        "Tap any job to view details and update status",
        "Jobs are sorted by most recent first",
        "Completed jobs remain visible for 90 days"
      ]
    },
    {
      icon: AlertCircle,
      title: "Tips & Best Practices",
      steps: [
        "Always verify license plate numbers before creating jobs",
        "Take clear photos at each stage for quality records",
        "Update status promptly to keep customers informed",
        "Use the correct wash package to ensure proper billing",
        "Check for existing jobs before creating duplicates",
        "Report any issues to your manager immediately"
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
            <Car className="w-3 h-3 mr-1" />
            Technician
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Technician Guide</h1>
          <p className="text-muted-foreground">
            Complete guide for technicians managing carwash and parking operations
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
                      <ol className="space-y-3">
                        {section.steps.map((step, i) => (
                          <li key={i} className="flex items-start gap-3 text-sm">
                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                              {i + 1}
                            </span>
                            <span className="text-muted-foreground pt-0.5">{step}</span>
                          </li>
                        ))}
                      </ol>
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

