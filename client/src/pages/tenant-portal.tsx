import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Car,
  ParkingSquare,
  LogIn,
  MapPin,
  Mail,
  Phone,
  ArrowLeft,
  Building2,
  Scale,
  Landmark,
  Shield,
  FileText,
  BookOpen,
} from "lucide-react";

interface TenantPublicInfo {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  address: string | null;
}

export default function TenantPortal() {
  const { slug } = useParams<{ slug: string }>();

  const {
    data: tenant,
    isLoading,
    isError,
  } = useQuery<TenantPublicInfo>({
    queryKey: [`/api/public/tenant/${slug}`],
    enabled: !!slug,
  });

  const primaryColor = tenant?.primaryColor || "#3B82F6";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-sm px-8">
          <Skeleton className="h-16 w-16 rounded-xl mx-auto" />
          <Skeleton className="h-6 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
          <Skeleton className="h-10 w-full mt-6" />
        </div>
      </div>
    );
  }

  if (isError || !tenant) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <header className="border-b border-border">
          <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" /> Home
              </Button>
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4">
          <Card className="max-w-md w-full">
            <CardContent className="pt-8 pb-8 text-center">
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-2">Tenant Not Found</h1>
              <p className="text-muted-foreground mb-6">
                The business <span className="font-mono font-semibold">"{slug}"</span> could not be found.
                It may not exist or has been deactivated.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/">Go Home</Link>
                </Button>
                <Button asChild>
                  <Link href={`/login?tenant=${slug}`}>Sign In</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with tenant branding */}
      <header
        className="border-b"
        style={{ borderColor: `${primaryColor}20` }}
      >
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {tenant.logoUrl ? (
              <img
                src={tenant.logoUrl}
                alt={tenant.name}
                className="h-10 w-auto"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: primaryColor }}
              >
                {tenant.name[0]?.toUpperCase()}
              </div>
            )}
            <span className="font-semibold text-lg">{tenant.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild style={{ backgroundColor: primaryColor, color: "#fff" }}>
              <Link href={`/login?tenant=${slug}`}>
                <LogIn className="mr-2 h-4 w-4" /> Sign In
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <main className="flex-1">
        <section className="px-4 py-16 md:py-24">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {tenant.logoUrl ? (
                <img
                  src={tenant.logoUrl}
                  alt={tenant.name}
                  className="h-20 w-auto mx-auto mb-6"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-bold text-3xl mx-auto mb-6"
                  style={{ backgroundColor: primaryColor }}
                >
                  {tenant.name[0]?.toUpperCase()}
                </div>
              )}

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
                Welcome to{" "}
                <span style={{ color: primaryColor }}>{tenant.name}</span>
              </h1>

              <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
                Professional carwash and parking management powered by HOPSVOIR.
                Sign in to access your dashboard.
              </p>

              <div className="flex flex-wrap gap-4 justify-center mb-12">
                <Button size="lg" asChild style={{ backgroundColor: primaryColor, color: "#fff" }}>
                  <Link href={`/login?tenant=${slug}`}>
                    <LogIn className="mr-2 h-5 w-5" /> Sign In to Dashboard
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={`/register?tenant=${slug}`}>Create Account</Link>
                </Button>
              </div>
            </motion.div>

            {/* Services cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto"
            >
              <Card className="p-6 text-left">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <Car className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Carwash Services</h3>
                <p className="text-sm text-muted-foreground">
                  Scan, track, and manage vehicle wash jobs with license plate recognition.
                </p>
              </Card>
              <Card className="p-6 text-left">
                <div
                  className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
                  style={{ backgroundColor: `${primaryColor}15` }}
                >
                  <ParkingSquare className="w-6 h-6" style={{ color: primaryColor }} />
                </div>
                <h3 className="font-semibold text-lg mb-2">Parking Management</h3>
                <p className="text-sm text-muted-foreground">
                  Manage parking zones, sessions, VIP access, and reservations.
                </p>
              </Card>
            </motion.div>
          </div>
        </section>

        {/* Important Documents */}
        <section className="px-4 py-8 border-t">
          <div className="max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center uppercase tracking-wide">
                Important Documents
              </h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-w-3xl mx-auto">
                <Link href="/legal/tenant-conduct">
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <div className="flex items-center gap-3">
                      <Scale className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Code of Conduct</p>
                        <p className="text-xs text-muted-foreground">Rules & Regulations</p>
                      </div>
                    </div>
                  </Card>
                </Link>
                <Link href="/legal/franchise-charter">
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <div className="flex items-center gap-3">
                      <Landmark className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Franchise Charter</p>
                        <p className="text-xs text-muted-foreground">Agreement</p>
                      </div>
                    </div>
                  </Card>
                </Link>
                <Link href="/legal/terms">
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Terms of Service</p>
                        <p className="text-xs text-muted-foreground">Platform Terms</p>
                      </div>
                    </div>
                  </Card>
                </Link>
                <Link href="/legal/privacy">
                  <Card className="p-4 hover:bg-muted/50 transition-colors cursor-pointer h-full">
                    <div className="flex items-center gap-3">
                      <Shield className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <p className="text-sm font-medium">Privacy Policy</p>
                        <p className="text-xs text-muted-foreground">Data Protection</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Contact info */}
        {(tenant.contactEmail || tenant.contactPhone || tenant.address) && (
          <section className="px-4 py-8 border-t">
            <div className="max-w-4xl mx-auto">
              <h3 className="text-sm font-semibold text-muted-foreground mb-4 text-center uppercase tracking-wide">
                Contact Information
              </h3>
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                {tenant.contactEmail && (
                  <a
                    href={`mailto:${tenant.contactEmail}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    {tenant.contactEmail}
                  </a>
                )}
                {tenant.contactPhone && (
                  <a
                    href={`tel:${tenant.contactPhone}`}
                    className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    {tenant.contactPhone}
                  </a>
                )}
                {tenant.address && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {tenant.address}
                  </span>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-6 px-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>
            &copy; {new Date().getFullYear()} {tenant.name}. Powered by{" "}
            <a href="/" className="font-medium hover:text-foreground transition-colors">
              HOPSVOIR
            </a>
          </p>
          <div className="flex items-center gap-4">
            <Link href="/legal/privacy" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="/legal/terms" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="/legal/tenant-conduct" className="hover:text-foreground transition-colors">
              Code of Conduct
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
