import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Users, UserPlus, Lock, Settings, Database, AlertTriangle } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function AdminGuide() {
  const sections = [
    {
      icon: Users,
      title: "User Management",
      steps: [
        "Navigate to Admin → User Management",
        "View all registered users with their roles and status",
        "Search users by name, email, or role",
        "Filter by role: Technician, Manager, Admin, Customer",
        "See user activity and last login times",
        "Manage user permissions and access levels"
      ]
    },
    {
      icon: UserPlus,
      title: "Creating New Users",
      steps: [
        "Click 'Add New User' button",
        "Enter user details: name, email, password",
        "Assign appropriate role (Technician, Manager, Admin)",
        "Set initial permissions and access rights",
        "Send welcome email with login credentials",
        "New users can log in immediately"
      ]
    },
    {
      icon: Lock,
      title: "Role-Based Access Control",
      steps: [
        "Technician: Can create/update wash jobs and parking sessions",
        "Manager: Has Technician access + analytics, reports, audit logs",
        "Admin: Has Manager access + user management, system settings",
        "Customer: Can only view their own tracking links (no login required)",
        "Roles can be changed at any time",
        "Changes take effect immediately"
      ]
    },
    {
      icon: Settings,
      title: "System Configuration",
      steps: [
        "Access system-wide settings and preferences",
        "Configure default wash packages and pricing",
        "Set up parking zones, rates, and time limits",
        "Customize email templates and notifications",
        "Manage integration settings (CRM, payment gateways)",
        "Configure backup and data retention policies"
      ]
    },
    {
      icon: Database,
      title: "Data Management",
      steps: [
        "Monitor database health and performance",
        "Review data retention policies (90 days for wash jobs, 12 months for parking)",
        "Export data for backup or analysis",
        "Clean up old records according to retention policy",
        "Manage photo storage and cleanup",
        "Ensure GDPR compliance"
      ]
    },
    {
      icon: Shield,
      title: "Security & Compliance",
      steps: [
        "Review security audit logs regularly",
        "Monitor failed login attempts",
        "Enforce strong password policies",
        "Manage session timeouts and security settings",
        "Ensure SSL/TLS encryption is active",
        "Comply with data protection regulations (GDPR)"
      ]
    },
    {
      icon: AlertTriangle,
      title: "Troubleshooting",
      steps: [
        "Check system status and health metrics",
        "Review error logs for issues",
        "Reset user passwords if needed",
        "Clear stuck jobs or sessions",
        "Restart services if necessary",
        "Contact support for critical issues"
      ]
    }
  ];

  const bestPractices = [
    "Regularly review user access and remove inactive accounts",
    "Keep user roles up to date with job responsibilities",
    "Monitor audit logs for suspicious activity",
    "Backup data regularly and test restore procedures",
    "Document all system configuration changes",
    "Train new admins on security best practices",
    "Keep the system updated with latest security patches",
    "Maintain clear communication with managers and technicians"
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
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Admin Guide</h1>
          <p className="text-muted-foreground">
            Complete guide for system administrators managing HOPSVOIR
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
            transition={{ delay: 0.5 }}
          >
            <Card className="bg-amber-500/5 border-amber-500/20">
              <CardContent className="pt-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Shield className="h-5 w-5 text-amber-600" />
                  Admin Best Practices
                </h2>
                <ul className="space-y-2">
                  {bestPractices.map((practice, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-amber-600 mt-1">✓</span>
                      <span>{practice}</span>
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

