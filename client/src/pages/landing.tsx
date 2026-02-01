import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Car, ParkingSquare, BarChart3, Zap, Shield, Globe } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-background/80 border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={logoPath} alt="HOPSVOIR" className="h-10 w-auto" />
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild data-testid="button-login">
              <a href="/login">Sign In</a>
            </Button>
          </div>
        </div>
      </header>

      <main className="pt-16">
        <section className="px-4 py-20 md:py-32">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                  Smart Carwash & Parking
                  <span className="text-primary block">Management</span>
                </h1>
                <p className="text-lg text-muted-foreground mb-8 max-w-lg">
                  Streamline your carwash operations with global license plate recognition. 
                  Track vehicles, manage workflows, and gain real-time insights.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Button size="lg" asChild data-testid="button-get-started">
                    <a href="/login">Get Started</a>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-learn-more">
                    <a href="/about">Learn More</a>
                  </Button>
                </div>
                <div className="flex items-center gap-6 mt-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Secure</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-primary" />
                    <span>Fast Setup</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>Global Plates</span>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="relative"
              >
                <div className="aspect-square max-w-md mx-auto bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-3xl p-8 flex items-center justify-center">
                  <div className="relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                    <div className="relative grid grid-cols-2 gap-4">
                      <Card className="p-6 bg-card/80 backdrop-blur hover-elevate">
                        <Car className="w-8 h-8 text-primary mb-3" />
                        <p className="font-medium">Carwash</p>
                        <p className="text-sm text-muted-foreground">Track progress</p>
                      </Card>
                      <Card className="p-6 bg-card/80 backdrop-blur hover-elevate">
                        <ParkingSquare className="w-8 h-8 text-primary mb-3" />
                        <p className="font-medium">Parking</p>
                        <p className="text-sm text-muted-foreground">Entry & Exit</p>
                      </Card>
                      <Card className="p-6 bg-card/80 backdrop-blur hover-elevate col-span-2">
                        <BarChart3 className="w-8 h-8 text-primary mb-3" />
                        <p className="font-medium">Analytics</p>
                        <p className="text-sm text-muted-foreground">Real-time insights</p>
                      </Card>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        <section className="px-4 py-20 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl font-bold mb-4">Everything You Need</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                A complete solution for managing your carwash and parking operations with ease.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Car,
                  title: "Carwash Workflow",
                  description: "Track each vehicle through every wash stage from receipt to completion."
                },
                {
                  icon: ParkingSquare,
                  title: "Parking Management",
                  description: "Quick entry and exit scanning with duplicate detection and warnings."
                },
                {
                  icon: BarChart3,
                  title: "Live Analytics",
                  description: "Real-time dashboards showing performance metrics and insights."
                }
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="p-6 h-full hover-elevate">
                    <feature.icon className="w-10 h-10 text-primary mb-4" />
                    <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground space-y-2">
          <p>Made by <span className="font-medium">HOPS-TECH INNOVATION</span></p>
          <p>&copy; {new Date().getFullYear()} HOPSVOIR. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
