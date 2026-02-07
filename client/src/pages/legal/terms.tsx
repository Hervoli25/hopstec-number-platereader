import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, UserCheck, AlertTriangle, Scale, Shield, Ban } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function TermsOfService() {
  const lastUpdated = "February 4, 2026";

  const sections = [
    {
      icon: UserCheck,
      title: "Acceptance of Terms",
      content: [
        "By accessing and using HOPSVOIR, you accept and agree to be bound by these Terms of Service",
        "If you do not agree to these terms, you may not access or use the platform",
        "We reserve the right to modify these terms at any time with notice to users",
        "Continued use after changes constitutes acceptance of modified terms"
      ]
    },
    {
      icon: Shield,
      title: "User Accounts and Roles",
      content: [
        "You must provide accurate and complete information when creating an account",
        "You are responsible for maintaining the confidentiality of your account credentials",
        "Different user roles (Technician, Manager, Admin, Customer) have different access levels",
        "Technicians can create and update wash jobs and parking sessions",
        "Managers have access to analytics, reports, and team oversight",
        "Admins can manage users, roles, and system settings",
        "Customers can track their vehicle status via secure shareable links",
        "You must not share your account credentials or allow unauthorized access"
      ]
    },
    {
      icon: FileText,
      title: "Permitted Use",
      content: [
        "The platform is intended for legitimate carwash and parking management operations",
        "You may use the platform to track vehicles, manage workflows, and generate reports",
        "You may capture and store vehicle photos for quality assurance purposes",
        "You may share customer tracking links with vehicle owners",
        "All data entered must be accurate and lawful",
        "You must comply with all applicable laws and regulations",
        "Commercial use is permitted for licensed carwash and parking businesses"
      ]
    },
    {
      icon: Ban,
      title: "Prohibited Activities",
      content: [
        "Do not use the platform for any unlawful purpose",
        "Do not attempt to gain unauthorized access to any part of the system",
        "Do not interfere with or disrupt the platform's operation",
        "Do not upload malicious code, viruses, or harmful content",
        "Do not scrape, harvest, or collect data without authorization",
        "Do not impersonate other users or misrepresent your identity",
        "Do not use the platform to harass, abuse, or harm others",
        "Do not violate any intellectual property rights"
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
            <Scale className="w-3 h-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Terms of Service</h1>
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
                Welcome to HOPSVOIR. These Terms of Service ("Terms") govern your access to and use of our carwash and parking management platform. By using HOPSVOIR, you agree to comply with these Terms.
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
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3">Limitation of Liability</h2>
                  <p className="text-sm text-muted-foreground mb-3">
                    HOPSVOIR is provided "as is" without warranties of any kind. To the maximum extent permitted by law:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>We are not liable for any indirect, incidental, or consequential damages</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>We do not guarantee uninterrupted or error-free service</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>You are responsible for backing up your data</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>We are not responsible for third-party integrations or services</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Our total liability shall not exceed the fees paid by you in the past 12 months</span>
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
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold mb-3">Intellectual Property</h2>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>All platform content, features, and functionality are owned by HOPS-TECH INNOVATION</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>You retain ownership of data you input (license plates, photos, etc.)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>You grant us a license to use your data to provide the service</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>HOPSVOIR trademarks and logos may not be used without permission</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Termination</h2>
              <p className="text-sm text-muted-foreground mb-3">
                We reserve the right to suspend or terminate your access to HOPSVOIR at any time for:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Violation of these Terms of Service</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Fraudulent, abusive, or illegal activity</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Non-payment of fees (if applicable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span>Extended period of inactivity</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground">
                You may terminate your account at any time by contacting us. Upon termination, your data will be deleted according to our Privacy Policy.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Contact & Governing Law</h2>
              <p className="text-sm text-muted-foreground mb-3">
                These Terms are governed by the laws of the jurisdiction where HOPS-TECH INNOVATION operates. For questions about these Terms:
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> <a href="mailto:legal@hopstecinnovation.com" className="text-primary hover:underline">legal@hopstecinnovation.com</a></p>
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

