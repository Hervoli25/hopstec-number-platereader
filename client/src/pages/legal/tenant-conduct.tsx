import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Scale, Shield, UserCheck, AlertTriangle, Ban, Eye,
  BookOpen, Briefcase, ClipboardCheck, Lock, Users, Paintbrush,
  FileWarning, MessageSquare, Gavel
} from "lucide-react";
import logoPath from "@assets/hopsvoir_principal_logo_1769965389226.png";
import { AppFooter } from "@/components/app-footer";

export default function TenantConduct() {
  const lastUpdated = "March 5, 2026";

  const sections = [
    {
      icon: BookOpen,
      title: "1. Definitions",
      content: [
        "\"Company\" or \"HOPSVOIR\" refers to HOPS-TECH INNOVATION (Pty) Ltd, the owner and operator of the HOPSVOIR platform.",
        "\"Platform\" refers to the HOPSVOIR SaaS application, including all web interfaces, mobile applications, APIs, and related services.",
        "\"Tenant\" refers to any individual, business entity, or franchisee granted access to the Platform under a valid subscription plan.",
        "\"Branch\" refers to an individual operating location registered under a Tenant's account.",
        "\"Authorized Personnel\" refers to managers, technicians, administrators, and any other users granted access by a Tenant.",
        "\"Customer\" refers to any end-user or vehicle owner who receives car wash, parking, or related services from a Tenant.",
        "\"Subscription Plan\" refers to the Tenant's active service tier (Free, Basic, Pro, or Enterprise).",
        "\"Confidential Information\" refers to all proprietary data, trade secrets, customer data, business processes, source code, and documentation belonging to HOPSVOIR."
      ]
    },
    {
      icon: UserCheck,
      title: "2. Professional Conduct & Ethical Standards",
      content: [
        "Tenants shall conduct all business activities with integrity, honesty, and professionalism at all times.",
        "All customer interactions must be courteous, respectful, and non-discriminatory.",
        "Tenants shall not engage in any fraudulent, deceptive, or misleading business practices.",
        "Tenants must comply with all applicable local, provincial, and national laws and regulations.",
        "Harassment, bullying, or intimidation of any kind is strictly prohibited and constitutes grounds for immediate termination.",
        "Tenants shall not discriminate against any customer, employee, or business partner based on race, gender, religion, sexual orientation, disability, age, national origin, or any other protected characteristic.",
        "Tenants must disclose any conflict of interest that may affect their obligations under this agreement.",
        "Tenants shall not engage in any business activity that directly competes with HOPSVOIR's services without prior written consent.",
        "Tenants shall not offer, solicit, or accept bribes, kickbacks, or any improper payments. All financial transactions must be transparent and properly documented."
      ]
    },
    {
      icon: Lock,
      title: "3. Account Security & Platform Access",
      content: [
        "Tenants are solely responsible for maintaining the confidentiality of all login credentials.",
        "Each Authorized Personnel member must have a unique user account — credential sharing is strictly prohibited.",
        "Tenants must immediately notify HOPSVOIR of any suspected unauthorized access or security breach.",
        "Multi-factor authentication must be enabled where available and is mandatory for manager and admin roles.",
        "API access is restricted to the Enterprise plan unless otherwise authorized in writing.",
        "API keys and integration secrets must be stored securely and never exposed in client-side code, public repositories, or unsecured channels.",
        "Rate limiting and fair-use policies apply to all API endpoints. Automated abuse, scraping, or denial-of-service attacks will result in immediate suspension."
      ]
    },
    {
      icon: ClipboardCheck,
      title: "4. Subscription Plan Compliance",
      content: [
        "Tenants must operate within the limits of their active Subscription Plan at all times.",
        "Free Plan: Up to 20 washes/month, 30 parking sessions, 3 users, 1 branch.",
        "Basic Plan: Up to 200 washes/month, 150 parking sessions, 10 users, 1 branch.",
        "Pro Plan: Up to 1,000 washes/month, 500 parking sessions, 50 users, 5 branches.",
        "Enterprise Plan: Unlimited usage across all metrics.",
        "Exceeding plan limits will result in service restrictions or mandatory plan upgrades.",
        "Tenants shall not circumvent plan limitations through technical manipulation, multiple accounts, or any other means.",
        "All data entered into the Platform must be accurate, complete, and up to date.",
        "Manipulation of analytics, billing snapshots, or performance metrics is strictly prohibited and constitutes fraud."
      ]
    },
    {
      icon: Ban,
      title: "5. Prohibited Activities",
      content: [
        "Reverse-engineer, decompile, disassemble, or attempt to derive the source code of the Platform.",
        "Modify, adapt, or create derivative works based on the Platform.",
        "Use the Platform for any unlawful purpose or in violation of any applicable law.",
        "Resell, sublicense, or redistribute access to the Platform without prior written authorization.",
        "Upload malicious code, viruses, or any material that could harm the Platform or its users.",
        "Use the Platform to store or transmit content that infringes third-party intellectual property rights.",
        "Attempt to access accounts, data, or systems belonging to other Tenants.",
        "Input false, fabricated, or misleading information including vehicle registrations, customer details, or service records."
      ]
    },
    {
      icon: Briefcase,
      title: "6. Operational & Service Quality Standards",
      content: [
        "Tenants must deliver services that meet or exceed the quality standards defined for each service tier.",
        "Vamos (15 min): Interior vacuum, floor mats cleaning, seat vacuuming, trunk vacuuming.",
        "Vagabundo (20 min): Pre-rinse, soap application, high-pressure wash, spot-free rinse, hand dry, tire shine.",
        "Le Raconteur (30 min): Complete exterior wash, interior vacuum, tire shine.",
        "La Obra (40 min): Complete exterior wash, interior vacuum, liquid express wax, enhanced shine, paint protection, tire shine, window cleaning.",
        "Each service must be completed within the designated timeframe, with deviations documented.",
        "Technicians must follow the dynamic checklist steps assigned by the Platform for each booked service.",
        "All equipment must be maintained in safe, functional condition and serviced per manufacturer recommendations.",
        "Facilities must be clean, well-organized, and free from hazards at all times.",
        "Adequate signage must be displayed including pricing, service descriptions, health and safety notices, and complaint procedures.",
        "Environmental regulations regarding water usage, chemical disposal, and waste management must be strictly observed.",
        "Only approved cleaning products, chemicals, and supplies may be used. Substitution with unapproved products is prohibited."
      ]
    },
    {
      icon: Shield,
      title: "7. Customer Data & Privacy",
      content: [
        "Tenants must comply with the Protection of Personal Information Act (POPIA), the General Data Protection Regulation (GDPR), and any other applicable data protection legislation.",
        "Customer personal information must be collected only for legitimate business purposes.",
        "Customer data must be stored securely and accessed only by Authorized Personnel on a need-to-know basis.",
        "Customer data must never be sold, shared, or disclosed to third parties without the customer's explicit consent.",
        "Customer data must be deleted or anonymized upon request, subject to legitimate retention requirements.",
        "Customer tracking tokens and access links must not be shared publicly or used for unauthorized surveillance."
      ]
    },
    {
      icon: Eye,
      title: "8. Pricing, Billing & Financial Integrity",
      content: [
        "Tenants must honour all prices advertised on the Platform and at the branch location.",
        "Unauthorized surcharges, hidden fees, or price manipulation are strictly prohibited.",
        "All transactions must be recorded accurately through the Platform.",
        "Off-platform cash transactions that circumvent the system are a violation.",
        "Refund and dispute resolution procedures must follow the policies set out by HOPSVOIR."
      ]
    },
    {
      icon: Users,
      title: "9. Staffing & Training Requirements",
      content: [
        "All Authorized Personnel must complete onboarding training before accessing the Platform.",
        "Technicians must be trained on proper vehicle handling, chemical safety, equipment operation, and customer interaction.",
        "Staff must be assigned the correct roles in the Platform (technician, manager, admin). Role escalation without authorization is prohibited.",
        "Tenants are responsible for ensuring staff compliance with this Code of Conduct and shall be held liable for staff violations."
      ]
    },
    {
      icon: Paintbrush,
      title: "10. Branding & Intellectual Property",
      content: [
        "The HOPSVOIR name, logo, trademarks, and brand assets are the exclusive property of HOPS-TECH INNOVATION (Pty) Ltd.",
        "Tenants on Pro and Enterprise plans may use custom branding as configured through the Platform, provided it does not defame, disparage, or misrepresent the HOPSVOIR brand.",
        "Custom branding must not imply endorsement of products or services not affiliated with HOPSVOIR.",
        "All marketing materials, signage, and customer-facing communications must be pre-approved by HOPSVOIR or comply with the brand guidelines manual.",
        "All software, algorithms, designs, workflows, and documentation constituting the Platform are the exclusive intellectual property of HOPSVOIR.",
        "Tenants acquire no ownership interest in the Platform or any of its components.",
        "Any improvements, suggestions, or feedback provided by Tenants become the property of HOPSVOIR without compensation."
      ]
    }
  ];

  const enforcementSections = [
    {
      icon: FileWarning,
      title: "11. Reporting & Compliance",
      items: [
        "All incidents including customer complaints, vehicle damage, workplace injuries, data breaches, and security incidents must be reported through the Platform within 24 hours.",
        "Critical incidents (data breaches, physical harm, criminal activity) must be reported immediately via the emergency contact channel.",
        "HOPSVOIR reserves the right to conduct announced or unannounced audits of any branch, including physical facility inspections, Platform usage reviews, customer satisfaction surveys, and financial record reviews.",
        "Tenants must cooperate fully with all audit procedures and provide requested documentation within 5 business days.",
        "Tenants must maintain: customer satisfaction rating of 4.0/5.0 or above (rolling 90-day average), service completion rate of 95% or above, customer complaint resolution within 48 hours, and Platform data accuracy of 98% or above.",
        "Failure to meet performance standards for two consecutive quarters will trigger a performance improvement plan."
      ]
    },
    {
      icon: Gavel,
      title: "12. Disciplinary Procedures & Enforcement",
      items: [
        "Minor Violations (verbal warning → written warning → suspension): Facility cleanliness failures, late or incomplete reporting, minor data entry errors, first-time plan limit exceedances.",
        "Major Violations (written warning → suspension → termination): Repeated minor violations (3+ within 12 months), failure to meet performance standards for two consecutive quarters, unauthorized use of customer data, unauthorized pricing modifications, failure to cooperate with audits.",
        "Critical Violations (immediate suspension, potential termination): Fraud, embezzlement, or financial misconduct; deliberate data breach or unauthorized data sharing; discrimination, harassment, or violence; criminal activity; reverse-engineering Platform source code; operating without required licences or permits.",
        "Disciplinary Process: (1) Investigation — fair and thorough; (2) Notice — written notice with evidence; (3) Response — Tenant has 10 business days to respond; (4) Decision — issued within 15 business days; (5) Appeal — within 10 business days, reviewed by an independent panel.",
        "Suspended Tenants will have Platform access restricted to read-only mode. Suspension periods will not exceed 30 days without formal termination proceedings.",
        "Upon termination, the Tenant must immediately cease using the HOPSVOIR brand, Platform, and all associated intellectual property. Data export will be facilitated for 30 days, after which all Tenant data will be permanently deleted."
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
          <h1 className="text-3xl md:text-4xl font-bold mb-3">Tenant Code of Conduct</h1>
          <p className="text-lg text-muted-foreground mb-1">Rules & Regulations</p>
          <p className="text-sm text-muted-foreground">
            Last updated: {lastUpdated} · Document Version 1.0
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
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>Issued by:</strong> HOPS-TECH INNOVATION (Pty) Ltd
              </p>
              <p className="text-muted-foreground leading-relaxed mb-3">
                <strong>Applicable to:</strong> All Tenants, Franchisees, Branch Operators, and Authorized Personnel
              </p>
              <p className="text-muted-foreground leading-relaxed">
                This Code of Conduct establishes the mandatory standards of behaviour, operational requirements, and regulatory obligations that all Tenants must adhere to when operating under the HOPSVOIR brand and utilizing the Platform. Non-compliance may result in sanctions up to and including immediate termination of the franchise or tenancy agreement.
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

          {enforcementSections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 + index * 0.05 }}
            >
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                      <section.icon className="h-5 w-5 text-destructive" />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold mb-3">{section.title}</h2>
                      <ul className="space-y-2">
                        {section.items.map((item, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                            <span className="text-destructive mt-1">•</span>
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
          transition={{ delay: 0.8 }}
          className="mt-6 space-y-6"
        >
          <Card>
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">13. Amendments & Updates</h2>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>HOPSVOIR reserves the right to amend this Code of Conduct at any time.</span></li>
                <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Tenants will be notified of material changes at least 30 days in advance via the Platform and registered email.</span></li>
                <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Continued use of the Platform after the effective date of amendments constitutes acceptance.</span></li>
                <li className="flex items-start gap-2"><span className="text-primary mt-1">•</span><span>Tenants who do not agree to amendments may terminate their tenancy in accordance with the Franchise Agreement.</span></li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <h2 className="text-lg font-semibold mb-3">14. Acknowledgement</h2>
              <p className="text-sm text-muted-foreground mb-4">
                By accessing and using the HOPSVOIR Platform, the Tenant acknowledges that they have read, understood, and agree to comply with this Code of Conduct in its entirety. This Code of Conduct forms an integral part of the Franchise Agreement/Charter and the Platform Terms of Service.
              </p>
              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-semibold">HOPS-TECH INNOVATION (Pty) Ltd</p>
                <p className="text-xs text-muted-foreground">All rights reserved.</p>
                <p className="text-xs text-muted-foreground mt-2">
                  For questions or clarification: <a href="mailto:compliance@hopsvoir.com" className="text-primary hover:underline">compliance@hopsvoir.com</a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <AppFooter />
    </div>
  );
}

