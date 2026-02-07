import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Cookie, Shield, Settings, Clock, Info } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function CookiePolicy() {
  const lastUpdated = "February 4, 2026";

  const cookieTypes = [
    {
      icon: Shield,
      title: "Essential Cookies",
      description: "Required for the platform to function properly",
      cookies: [
        {
          name: "connect.sid",
          purpose: "Session authentication and user login state",
          duration: "Session (expires when browser closes)",
          type: "First-party"
        },
        {
          name: "CSRF Token",
          purpose: "Protection against cross-site request forgery attacks",
          duration: "Session",
          type: "First-party"
        }
      ]
    },
    {
      icon: Settings,
      title: "Functional Cookies",
      description: "Enable enhanced functionality and personalization",
      cookies: [
        {
          name: "theme_preference",
          purpose: "Remember your dark/light mode preference",
          duration: "1 year",
          type: "First-party"
        },
        {
          name: "language_preference",
          purpose: "Store your language selection",
          duration: "1 year",
          type: "First-party"
        }
      ]
    },
    {
      icon: Info,
      title: "Analytics Cookies",
      description: "Help us understand how you use the platform",
      cookies: [
        {
          name: "analytics_session",
          purpose: "Track usage patterns to improve user experience",
          duration: "30 days",
          type: "First-party"
        }
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
            <Cookie className="w-3 h-3 mr-1" />
            Legal
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Cookie Policy</h1>
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
              <h2 className="text-xl font-semibold mb-3">What Are Cookies?</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Cookies are small text files that are placed on your device when you visit our platform. They help us provide you with a better experience by remembering your preferences and enabling essential functionality.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                HOPSVOIR uses cookies to maintain your login session, remember your preferences, and improve our service. This policy explains what cookies we use and why.
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          {cookieTypes.map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <category.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-2">{category.title}</h2>
                      <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
                      
                      <div className="space-y-4">
                        {category.cookies.map((cookie, i) => (
                          <div key={i} className="bg-muted/50 rounded-lg p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Cookie Name</p>
                                <p className="text-sm font-mono">{cookie.name}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium text-muted-foreground mb-1">Type</p>
                                <Badge variant="outline" className="text-xs">{cookie.type}</Badge>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1">Purpose</p>
                                <p className="text-sm">{cookie.purpose}</p>
                              </div>
                              <div className="md:col-span-2">
                                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  Duration
                                </p>
                                <p className="text-sm">{cookie.duration}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
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
              <h2 className="text-xl font-semibold mb-4">Managing Cookies</h2>
              <p className="text-sm text-muted-foreground mb-4">
                You have control over cookies and can manage them through your browser settings:
              </p>

              <div className="space-y-4">
                <div className="bg-muted/50 rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-sm">Browser Settings</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Most browsers allow you to:
                  </p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>View and delete cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Block third-party cookies</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Block all cookies (may affect functionality)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span>Delete cookies when you close your browser</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-amber-900 dark:text-amber-100">
                        Important Note
                      </h3>
                      <p className="text-sm text-amber-800 dark:text-amber-200">
                        Blocking or deleting essential cookies (like session cookies) will prevent you from logging in and using HOPSVOIR. Functional and analytics cookies can be disabled without affecting core functionality.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Third-Party Cookies</h2>
              <p className="text-sm text-muted-foreground mb-3">
                HOPSVOIR does not use third-party advertising cookies. However, we may use:
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Cloud Infrastructure Cookies:</strong> Our hosting provider (Vercel) may set cookies for load balancing and performance</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span><strong>Database Cookies:</strong> Neon PostgreSQL may use cookies for connection management</span>
                </li>
              </ul>
              <p className="text-sm text-muted-foreground mt-3">
                These third-party cookies are essential for platform operation and are covered by their respective privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold mb-4">Updates to This Policy</h2>
              <p className="text-sm text-muted-foreground">
                We may update this Cookie Policy from time to time to reflect changes in our practices or for legal reasons. We will notify you of any material changes by updating the "Last updated" date at the top of this policy. We encourage you to review this policy periodically.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Questions About Cookies?</h2>
              <p className="text-sm text-muted-foreground mb-3">
                If you have questions about our use of cookies, please contact us:
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> <a href="mailto:privacy@hopstecinnovation.com" className="text-primary hover:underline">privacy@hopstecinnovation.com</a></p>
                <p><strong>Website:</strong> <a href="https://hopstecinnovation.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">hopstecinnovation.com</a></p>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                For more information about your data rights, please see our <Link href="/legal/privacy"><span className="text-primary hover:underline cursor-pointer">Privacy Policy</span></Link>.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}

