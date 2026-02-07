import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, BookOpen, Users, Car, BarChart3, Shield, HelpCircle } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function Help() {
  const userGuides = [
    {
      icon: Car,
      title: "Technician Guide",
      role: "Technician",
      description: "Learn how to scan plates, manage wash jobs, and track vehicles",
      href: "/help/technician",
      color: "bg-blue-500/10 text-blue-600 border-blue-500/20"
    },
    {
      icon: BarChart3,
      title: "Manager Guide",
      role: "Manager",
      description: "Access analytics, monitor operations, and manage your team",
      href: "/help/manager",
      color: "bg-purple-500/10 text-purple-600 border-purple-500/20"
    },
    {
      icon: Shield,
      title: "Admin Guide",
      role: "Admin",
      description: "User management, system settings, and advanced configuration",
      href: "/help/admin",
      color: "bg-amber-500/10 text-amber-600 border-amber-500/20"
    },
    {
      icon: Users,
      title: "Customer Guide",
      role: "Customer",
      description: "Track your vehicle and view wash progress in real-time",
      href: "/help/customer",
      color: "bg-green-500/10 text-green-600 border-green-500/20"
    }
  ];

  const quickLinks = [
    {
      icon: HelpCircle,
      title: "Getting Started",
      description: "First time using HOPSVOIR? Start here",
      href: "/help/getting-started"
    },
    {
      icon: BookOpen,
      title: "FAQ",
      description: "Frequently asked questions and answers",
      href: "/help/faq"
    }
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
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

      <main className="flex-1 max-w-4xl mx-auto px-4 py-12 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Badge variant="secondary" className="mb-4">
            <BookOpen className="w-3 h-3 mr-1" />
            Documentation
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Help Center</h1>
          <p className="text-muted-foreground">
            Everything you need to know about using HOPSVOIR
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-xl font-semibold mb-4">User Guides by Role</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {userGuides.map((guide, index) => (
              <motion.div
                key={guide.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + index * 0.05 }}
              >
                <Link href={guide.href}>
                  <Card className={`hover-elevate active-elevate-2 cursor-pointer border ${guide.color}`}>
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <guide.icon className="h-6 w-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-semibold">{guide.title}</h3>
                            <Badge variant="outline" className="text-xs">{guide.role}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{guide.description}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="text-xl font-semibold">Quick Links</h2>
          {quickLinks.map((link, index) => (
            <motion.div
              key={link.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + index * 0.05 }}
            >
              <Link href={link.href}>
                <Card className="hover-elevate active-elevate-2 cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                        <link.icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold mb-1">{link.title}</h3>
                        <p className="text-sm text-muted-foreground">{link.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}

