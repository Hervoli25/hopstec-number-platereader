import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Shield, Database, Lock, Eye, UserCheck, Globe } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function PrivacyPolicy() {
  const lastUpdated = "February 4, 2026";

  const sections = [
    {
      icon: Database,
      title: "Information We Collect",
      content: [
        "License plate numbers and vehicle information entered by technicians",
        "Photos of vehicles captured during wash and parking processes",
        "User account information (name, email, role) for authentication",
        "Session data and authentication cookies for secure access",
        "Wash job status updates and timestamps",
        "Parking session data including entry/exit times and zone information",
        "Customer feedback and quality confirmations",
        "Usage analytics to improve service quality"
      ]
    },
    {
      icon: Lock,
      title: "How We Use Your Information",
      content: [
        "To provide carwash and parking management services",
        "To track vehicle progress through wash stages",
        "To enable real-time customer tracking via shareable links",
        "To generate analytics and performance reports for managers",
        "To maintain audit trails for quality assurance",
        "To authenticate users and maintain secure sessions",
        "To communicate service updates and notifications",
        "To improve our platform and user experience"
      ]
    },
    {
      icon: Shield,
      title: "Data Security",
      content: [
        "All data is encrypted in transit using HTTPS/TLS",
        "Passwords are hashed using industry-standard bcrypt",
        "Database connections use SSL with certificate verification",
        "Role-based access control limits data visibility",
        "Session tokens expire automatically for security",
        "Regular security audits and updates",
        "Secure cloud infrastructure (Neon PostgreSQL)",
        "Compliance with data protection best practices"
      ]
    },
    {
      icon: Eye,
      title: "Data Sharing",
      content: [
        "We do not sell your personal information to third parties",
        "Vehicle data may be shared with the Carwash CRM dashboard for business operations",
        "Customer tracking links allow customers to view their own job status",
        "Managers and admins can access data within their authorized scope",
        "We may share data when required by law or legal process",
        "Service providers (hosting, database) process data on our behalf under strict agreements"
      ]
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
            <Shield className="w-3 h-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="pt-6">
              <p className="text-muted-foreground leading-relaxed">
                HOPSVOIR ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our carwash and parking management platform. Please read this privacy policy carefully.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                      <ul className="space-y-2">
                        {section.content.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-primary mt-1">•</span>
                            <span>{item}</span>
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
          transition={{ delay: 0.4 }}
          className="mt-6 space-y-6"
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3">Your Rights</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Access:</strong> Request a copy of your personal data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Correction:</strong> Request correction of inaccurate data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Deletion:</strong> Request deletion of your data (subject to legal obligations)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Objection:</strong> Object to processing of your data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span><strong>Portability:</strong> Request transfer of your data to another service</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3">Data Retention</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    We retain your information for as long as necessary to provide our services and comply with legal obligations:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Active wash jobs: Retained for 90 days after completion</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Parking sessions: Retained for 12 months for billing and audit purposes</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>User accounts: Retained while account is active, deleted 30 days after account closure</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Photos: Automatically deleted after 30 days unless flagged for quality review</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Contact Us</h2>
              <p className="text-sm text-muted-foreground mb-3">
                If you have questions about this Privacy Policy or wish to exercise your rights, please contact us:
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> <a href="mailto:privacy@hopstecinnovation.com" className="text-primary hover:underline">privacy@hopstecinnovation.com</a></p>
                <p><strong>Website:</strong> <a href="https://hopstecinnovation.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">hopstecinnovation.com</a></p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}

