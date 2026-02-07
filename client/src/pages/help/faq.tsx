import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, HelpCircle } from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function FAQ() {
  const faqs = [
    {
      category: "General",
      questions: [
        {
          q: "What is HOPSVOIR?",
          a: "HOPSVOIR is a mobile-first Progressive Web Application (PWA) for managing carwash and parking operations. It enables real-time vehicle tracking, photo documentation, and customer transparency."
        },
        {
          q: "Do I need to install an app?",
          a: "No installation required! HOPSVOIR works in your web browser. However, you can install it as a PWA on your phone for a native app experience with offline capabilities."
        },
        {
          q: "Which license plate formats are supported?",
          a: "HOPSVOIR supports license plates from France, South Africa, Democratic Republic of Congo (DRC), Zambia, and other international formats."
        },
        {
          q: "Is my data secure?",
          a: "Yes! All data is encrypted in transit using HTTPS/TLS. Passwords are hashed with bcrypt. We use role-based access control and comply with GDPR data protection standards."
        }
      ]
    },
    {
      category: "For Technicians",
      questions: [
        {
          q: "How do I start a new wash job?",
          a: "Tap 'Carwash Scan' from the home screen, enter the license plate, select the wash package, and tap 'Create Wash Job'. The job will start in 'Received' status."
        },
        {
          q: "Do I have to take photos at every stage?",
          a: "Photos are recommended for quality assurance and customer transparency, but they're optional. You can skip photos if needed."
        },
        {
          q: "Can I edit a license plate after creating a job?",
          a: "Currently, license plates cannot be edited after job creation. If you made a mistake, contact your manager to delete the job and create a new one."
        },
        {
          q: "How do I share a tracking link with a customer?",
          a: "Open the wash job, tap 'Share Tracking Link', copy the URL, and send it to the customer via SMS, WhatsApp, or email."
        }
      ]
    },
    {
      category: "For Managers",
      questions: [
        {
          q: "How do I access analytics?",
          a: "Navigate to Manager → Analytics from the menu. You'll see daily, weekly, and monthly performance metrics, wash times, and revenue data."
        },
        {
          q: "What is the audit log?",
          a: "The audit log tracks all system activities: job creation, status updates, user logins, and more. Access it via Manager → Audit Log."
        },
        {
          q: "Can I export reports?",
          a: "Yes! Analytics and audit logs can be exported for business analysis and record-keeping."
        },
        {
          q: "How do I monitor team performance?",
          a: "The Manager Dashboard shows active jobs by technician, completion times, and productivity metrics. Use Analytics for detailed performance reports."
        }
      ]
    },
    {
      category: "For Customers",
      questions: [
        {
          q: "How do I track my vehicle?",
          a: "Click the tracking link sent to you via SMS, WhatsApp, or email. No login required - just open the link to see your vehicle's progress."
        },
        {
          q: "Why can't I see photos?",
          a: "Photos are taken by technicians at each stage. If photos aren't visible, the technician may not have captured them yet, or they may have skipped that step."
        },
        {
          q: "How long is my tracking link valid?",
          a: "Your tracking link remains active until your wash job is completed. After completion, it stays accessible for 90 days."
        },
        {
          q: "Can I get notifications?",
          a: "Some carwashes send SMS/email notifications when your wash is complete. Contact your carwash to enable notifications."
        }
      ]
    },
    {
      category: "Technical",
      questions: [
        {
          q: "What browsers are supported?",
          a: "HOPSVOIR works on all modern browsers: Chrome, Firefox, Safari, Edge. For the best experience, use the latest version."
        },
        {
          q: "Can I use HOPSVOIR offline?",
          a: "Limited offline functionality is available when installed as a PWA. You can view cached data, but creating/updating jobs requires an internet connection."
        },
        {
          q: "How do I install HOPSVOIR as a PWA?",
          a: "On mobile: Tap the browser menu and select 'Add to Home Screen'. On desktop: Look for the install icon in the address bar."
        },
        {
          q: "What happens if I lose internet connection?",
          a: "The app will show a connection error. Your work is saved locally and will sync when connection is restored."
        }
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
            <HelpCircle className="w-3 h-3 mr-1" />
            FAQ
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Frequently Asked Questions</h1>
          <p className="text-muted-foreground">
            Find answers to common questions about HOPSVOIR
          </p>
        </motion.div>

        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <motion.div
              key={category.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + categoryIndex * 0.05 }}
            >
              <h2 className="text-xl font-semibold mb-4">{category.category}</h2>
              <Card>
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {category.questions.map((faq, index) => (
                      <AccordionItem key={index} value={`item-${categoryIndex}-${index}`}>
                        <AccordionTrigger className="text-left">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">Still have questions?</h2>
              <p className="text-sm text-muted-foreground mb-4">
                If you couldn't find the answer you're looking for, please contact support:
              </p>
              <div className="text-sm space-y-1">
                <p><strong>Email:</strong> <a href="mailto:support@hopstecinnovation.com" className="text-primary hover:underline">support@hopstecinnovation.com</a></p>
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

