import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ArrowLeft, Car, Shield, Smartphone, Zap, Users, Globe, 
  CheckCircle2, BarChart3, Camera
} from "lucide-react";
import hopsovirLogo from "@/assets/images/logo.png";

export default function About() {
  const features = [
    {
      icon: Car,
      title: "Complete Wash Tracking",
      description: "Track every vehicle through the entire wash process from entry to completion.",
    },
    {
      icon: Camera,
      title: "Photo Documentation",
      description: "Capture photos at each stage for quality assurance and customer transparency.",
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Optimized for technicians on the move with an installable PWA experience.",
    },
    {
      icon: Globe,
      title: "Global Plate Support",
      description: "Supports license plates from France, South Africa, DRC, and beyond.",
    },
    {
      icon: Users,
      title: "Role-Based Access",
      description: "Separate interfaces for technicians, managers, and customers.",
    },
    {
      icon: BarChart3,
      title: "Analytics Dashboard",
      description: "Track daily, weekly, and monthly performance metrics.",
    },
    {
      icon: Zap,
      title: "Real-Time Updates",
      description: "Live status updates keep everyone in sync instantly.",
    },
    {
      icon: Shield,
      title: "Secure & Auditable",
      description: "Complete audit trail for every action with secure authentication.",
    },
  ];

  const portfolioUrl = import.meta.env.VITE_PORTFOLIO_URL || "#";

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <img src={hopsovirLogo} alt="HOPSVOIR" className="h-8" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <img 
            src={hopsovirLogo} 
            alt="HOPSVOIR" 
            className="h-20 mx-auto mb-6"
          />
          <h1 className="text-4xl font-bold mb-4">About HOPSVOIR</h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            A modern, mobile-first platform for carwash and parking workflow management 
            with global license plate support.
          </p>
        </motion.div>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-16"
        >
          <h2 className="text-2xl font-bold text-center mb-8">Key Features</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card className="h-full hover-elevate">
                  <CardContent className="pt-6">
                    <feature.icon className="h-8 w-8 text-primary mb-3" />
                    <h3 className="font-semibold mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <Card className="overflow-hidden">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h2 className="text-2xl font-bold mb-4">How It Works</h2>
                  <div className="space-y-4">
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Vehicle Entry</p>
                        <p className="text-sm text-muted-foreground">
                          Technician captures plate photo and enters plate number
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Workflow Tracking</p>
                        <p className="text-sm text-muted-foreground">
                          Progress through stages: Pre-wash → Foam → Rinse → Dry
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Customer Visibility</p>
                        <p className="text-sm text-muted-foreground">
                          Customers track progress live via shareable link
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Quality Confirmation</p>
                        <p className="text-sm text-muted-foreground">
                          Customer confirms service completion with feedback
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-xl p-8 text-center">
                  <Car className="h-16 w-16 mx-auto text-primary mb-4" />
                  <p className="text-lg font-medium">
                    Streamlined workflow for modern carwash operations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-br from-primary/10 to-transparent">
            <CardContent className="py-12">
              <h2 className="text-2xl font-bold mb-4">Get Started Today</h2>
              <p className="text-muted-foreground mb-6 max-w-lg mx-auto">
                Contact us to learn how HOPSVOIR can transform your carwash operations.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" data-testid="button-get-started">
                    Sign In
                  </Button>
                </Link>
                {portfolioUrl !== "#" && (
                  <a href={portfolioUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="lg" data-testid="button-contact">
                      Contact Us
                    </Button>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      <footer className="border-t border-border mt-12 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={hopsovirLogo} alt="HOPSVOIR" className="h-8" />
              <span className="text-muted-foreground">
                Made by HOPS-TECH INNOVATION
              </span>
            </div>
            {portfolioUrl !== "#" && (
              <a 
                href={portfolioUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Visit Our Portfolio
              </a>
            )}
          </div>
          <p className="text-center text-sm text-muted-foreground mt-6">
            © {new Date().getFullYear()} HOPSVOIR. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
