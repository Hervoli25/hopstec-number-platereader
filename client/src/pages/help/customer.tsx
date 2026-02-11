import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Users, Link as LinkIcon, Eye, Bell, CheckCircle, Clock } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function CustomerGuide() {
  const sections = [
    {
      icon: LinkIcon,
      title: "Receiving Your Tracking Link",
      steps: [
        "When you drop off your vehicle, the technician will create a wash job",
        "You'll receive a unique tracking link via SMS, WhatsApp, or email",
        "The link looks like: hopsvoir.app/customer/job/abc123xyz",
        "No login or account required - just click the link",
        "Save the link to check progress anytime",
        "The link remains active until your wash is complete"
      ]
    },
    {
      icon: Eye,
      title: "Tracking Your Vehicle",
      steps: [
        "Click your tracking link to open the status page",
        "See your vehicle's license plate and wash package",
        "View current wash stage with color-coded status",
        "See photos taken at each stage (if available)",
        "Track progress through: Received → Pre-Wash → Rinse → Dry & Vacuum → Polish → Tyre Shine → Clay Treatment → Complete",
        "Page updates automatically - no need to refresh"
      ]
    },
    {
      icon: Clock,
      title: "Understanding Wash Stages",
      steps: [
        "Received (Blue): Your vehicle has been checked in",
        "Pre-Wash (Cyan): Initial rinse and preparation",
        "Rinse (Teal): Thorough water rinse",
        "Dry & Vacuum (Amber): Drying and vacuuming",
        "Simple Polish (Purple): Basic polish application",
        "Detailing Polish (Indigo): Detailed polishing",
        "Tyre Shine (Pink): Tyre cleaning and shine",
        "Clay Treatment (Rose): Clay bar surface treatment",
        "Complete (Green): Your vehicle is ready for pickup!",
        "Note: Some steps may be skipped depending on your service package"
      ]
    },
    {
      icon: CheckCircle,
      title: "Quality Confirmation",
      steps: [
        "When your wash is complete, you'll see a 'Confirm Quality' button",
        "Tap it to confirm you're satisfied with the service",
        "Your feedback helps us maintain high standards",
        "You can also leave comments or report issues",
        "Quality confirmations are optional but appreciated",
        "Contact the carwash directly for any concerns"
      ]
    },
    {
      icon: Bell,
      title: "Notifications",
      steps: [
        "Some carwashes send SMS/email notifications at key stages",
        "You'll be notified when your wash is complete",
        "Notifications include your tracking link",
        "You can also bookmark the tracking page",
        "No spam - only important updates about your vehicle",
        "Notification preferences are managed by the carwash"
      ]
    }
  ];

  const tips = [
    "Save your tracking link for easy access",
    "Check the tracking page to see estimated completion time",
    "Photos show the care taken with your vehicle",
    "Contact the carwash if you have questions about your wash",
    "Your tracking link is unique and private",
    "The page works on any device - phone, tablet, or computer"
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
            <Users className="w-3 h-3 mr-1" />
            Customer
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Customer Guide</h1>
          <p className="text-muted-foreground">
            Track your vehicle's wash progress in real-time
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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Helpful Tips
                </h2>
                <ul className="space-y-2">
                  {tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-green-600 mt-1">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}

