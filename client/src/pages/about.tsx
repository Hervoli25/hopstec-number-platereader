import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Car, Shield, Smartphone, Zap, Users, Globe,
  CheckCircle2, BarChart3, Camera, ExternalLink, Heart,
  Database, Cloud, Lock, Sparkles, Target, Award
} from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";

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
      title: "Mobile-First PWA",
      description: "Installable app optimized for technicians on the move.",
    },
    {
      icon: Globe,
      title: "Global Plate Support",
      description: "Supports license plates from France, South Africa, DRC, Zambia and beyond.",
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
      description: "Live status updates via SSE keep everyone in sync instantly.",
    },
    {
      icon: Shield,
      title: "Secure & Auditable",
      description: "Complete audit trail with secure authentication.",
    },
  ];

  const stats = [
    { value: "99.9%", label: "Uptime" },
    { value: "< 1s", label: "Response Time" },
    { value: "24/7", label: "Support" },
    { value: "100%", label: "Data Security" },
  ];

  const techStack = [
    { name: "React", color: "bg-blue-500" },
    { name: "TypeScript", color: "bg-blue-600" },
    { name: "Node.js", color: "bg-green-600" },
    { name: "PostgreSQL", color: "bg-indigo-600" },
    { name: "Drizzle ORM", color: "bg-purple-600" },
    { name: "Tailwind CSS", color: "bg-cyan-500" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <img src={logoPath} alt="HOPSVOIR" className="h-8" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="inline-block mb-6"
          >
            <img
              src={logoPath}
              alt="HOPSVOIR"
              className="h-24 mx-auto"
            />
          </motion.div>
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="w-3 h-3 mr-1" />
            Smart Carwash Management
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            About HOPSVOIR
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            A modern, mobile-first platform for carwash and parking workflow management
            with global license plate support and real-time customer tracking.
          </p>
        </motion.div>

        {/* Stats Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-16"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={stat.label} className="text-center p-6">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 + index * 0.1 }}
                >
                  <p className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</p>
                  <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
                </motion.div>
              </Card>
            ))}
          </div>
        </motion.section>

        {/* Features Grid */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-16"
        >
          <div className="text-center mb-8">
            <Badge variant="outline" className="mb-2">Features</Badge>
            <h2 className="text-2xl md:text-3xl font-bold">Everything You Need</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Card className="h-full hover:shadow-lg transition-shadow group">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
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

        {/* How It Works */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mb-16"
        >
          <Card className="overflow-hidden border-2 border-primary/10">
            <CardContent className="p-8 md:p-12">
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <Badge variant="outline" className="mb-4">Workflow</Badge>
                  <h2 className="text-2xl md:text-3xl font-bold mb-6">How It Works</h2>
                  <div className="space-y-5">
                    {[
                      { title: "Vehicle Entry", desc: "Scan or enter plate number with optional photo capture" },
                      { title: "Workflow Tracking", desc: "Progress through stages: Pre-wash → Foam → Rinse → Dry" },
                      { title: "Customer Visibility", desc: "Customers track progress live via shareable link" },
                      { title: "Quality Confirmation", desc: "Customer confirms completion with optional feedback" },
                    ].map((step, i) => (
                      <div key={step.title} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                            {i + 1}
                          </div>
                        </div>
                        <div>
                          <p className="font-semibold">{step.title}</p>
                          <p className="text-sm text-muted-foreground">{step.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-2xl p-8 text-center">
                  <div className="w-20 h-20 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Car className="h-10 w-10 text-primary" />
                  </div>
                  <p className="text-lg font-medium mb-2">
                    Streamlined Workflow
                  </p>
                  <p className="text-sm text-muted-foreground">
                    For modern carwash operations
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* Technology Stack */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="mb-16"
        >
          <Card>
            <CardContent className="p-8">
              <div className="text-center mb-6">
                <Badge variant="outline" className="mb-2">
                  <Database className="w-3 h-3 mr-1" />
                  Technology
                </Badge>
                <h2 className="text-2xl font-bold">Built with Modern Tech</h2>
              </div>
              <div className="flex flex-wrap justify-center gap-3">
                {techStack.map((tech) => (
                  <Badge key={tech.name} className={`${tech.color} text-white px-4 py-2 text-sm`}>
                    {tech.name}
                  </Badge>
                ))}
              </div>
              <div className="grid md:grid-cols-3 gap-6 mt-8">
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Cloud className="w-8 h-8 text-blue-500" />
                  <div>
                    <p className="font-medium">Cloud-Native</p>
                    <p className="text-xs text-muted-foreground">Scalable infrastructure</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Lock className="w-8 h-8 text-green-500" />
                  <div>
                    <p className="font-medium">Secure by Design</p>
                    <p className="text-xs text-muted-foreground">End-to-end encryption</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
                  <Zap className="w-8 h-8 text-amber-500" />
                  <div>
                    <p className="font-medium">Real-Time</p>
                    <p className="text-xs text-muted-foreground">SSE live updates</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center"
        >
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="py-12 px-8">
              <div className="inline-flex items-center gap-2 text-primary mb-4">
                <Target className="w-5 h-5" />
                <span className="font-medium">Ready to Transform?</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">Get Started Today</h2>
              <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
                Contact us to learn how HOPSVOIR can transform your carwash operations
                with smart workflow management.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link href="/login">
                  <Button size="lg" className="gap-2" data-testid="button-get-started">
                    <CheckCircle2 className="w-4 h-4" />
                    Sign In
                  </Button>
                </Link>
                <a href="https://hopstecinnovation.com/" target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="lg" className="gap-2" data-testid="button-contact">
                    Contact Us
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-10 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 items-center">
            <div className="flex items-center gap-3">
              <img src={logoPath} alt="HOPSVOIR" className="h-10" />
              <div>
                <p className="font-semibold">HOPSVOIR</p>
                <p className="text-xs text-muted-foreground">Smart Carwash Management</p>
              </div>
            </div>

            <div className="text-center">
              <p className="flex items-center justify-center gap-2 text-sm">
                Made with <Heart className="w-4 h-4 text-red-500 fill-red-500" /> by
              </p>
              <a
                href="https://hopstecinnovation.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline font-medium mt-1"
              >
                Hopstech Innovation
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex justify-center md:justify-end gap-4">
              <a
                href="https://hopstecinnovation.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
              >
                Portfolio
              </a>
              <Link href="/login">
                <span className="text-sm text-muted-foreground hover:text-primary transition-colors cursor-pointer">
                  Login
                </span>
              </Link>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HOPSVOIR. All rights reserved.
            </p>
            <div className="flex items-center justify-center gap-2 mt-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-muted-foreground">
                Trusted by carwash businesses worldwide
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
