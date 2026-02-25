import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AppHeader } from "@/components/app-header";
import { AppFooter } from "@/components/app-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Palette, Save, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

interface TenantBranding {
  id: string;
  name: string;
  slug: string;
  plan: string;
  primaryColor: string | null;
  secondaryColor: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  customDomain: string | null;
}

export default function ManagerBranding() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: branding, isLoading } = useQuery<TenantBranding>({
    queryKey: ["/api/tenant/branding"],
  });

  const [primaryColor, setPrimaryColor] = useState("#3b82f6");
  const [secondaryColor, setSecondaryColor] = useState("#64748b");
  const [logoUrl, setLogoUrl] = useState("");
  const [faviconUrl, setFaviconUrl] = useState("");
  const [customDomain, setCustomDomain] = useState("");

  // Sync form state when branding data loads
  useEffect(() => {
    if (branding) {
      setPrimaryColor(branding.primaryColor || "#3b82f6");
      setSecondaryColor(branding.secondaryColor || "#64748b");
      setLogoUrl(branding.logoUrl || "");
      setFaviconUrl(branding.faviconUrl || "");
      setCustomDomain(branding.customDomain || "");
    }
  }, [branding]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PUT", "/api/tenant/branding", {
        primaryColor,
        secondaryColor,
        logoUrl: logoUrl || null,
        faviconUrl: faviconUrl || null,
        customDomain: customDomain || null,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tenant/branding"] });
      toast({
        title: "Branding updated",
        description: "Your branding changes have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save branding",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Role guard: only admin users
  if (user && user.role !== "admin" && user.role !== "super_admin") {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Branding" />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <Palette className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            Only admin users can manage branding settings.
          </p>
        </main>
        <AppFooter />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader title="Branding" />
        <main className="max-w-4xl mx-auto px-4 py-12 text-center">
          <p className="text-muted-foreground">Loading branding settings...</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader title="Branding" />

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Page Title */}
        <div className="flex items-center gap-3">
          <Palette className="w-7 h-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Branding & Customization</h1>
            <p className="text-sm text-muted-foreground">
              Customize the look and feel of your carwash portal
            </p>
          </div>
          {branding?.plan && (
            <Badge variant="secondary" className="ml-auto">
              {branding.plan} plan
            </Badge>
          )}
        </div>

        {/* Section 1: Colors */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Colors</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="primaryColor">Primary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="primaryColor"
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-border cursor-pointer"
                    data-testid="input-primary-color"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#3b82f6"
                    className="font-mono text-sm flex-1"
                    data-testid="input-primary-color-hex"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for buttons, links, and accent elements
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondaryColor">Secondary Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="secondaryColor"
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-10 h-10 rounded border border-border cursor-pointer"
                    data-testid="input-secondary-color"
                  />
                  <Input
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    placeholder="#64748b"
                    className="font-mono text-sm flex-1"
                    data-testid="input-secondary-color-hex"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Used for secondary actions and subtle highlights
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Logo & Favicon */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Logo & Favicon</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                  data-testid="input-logo-url"
                />
                {logoUrl && (
                  <div className="mt-2 p-3 border border-border rounded-md bg-muted/30">
                    <img
                      src={logoUrl}
                      alt="Logo preview"
                      className="h-10 w-auto object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended size: 200x60px, PNG or SVG
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.ico"
                  data-testid="input-favicon-url"
                />
                {faviconUrl && (
                  <div className="mt-2 p-3 border border-border rounded-md bg-muted/30">
                    <img
                      src={faviconUrl}
                      alt="Favicon preview"
                      className="h-8 w-8 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Recommended size: 32x32px, ICO or PNG
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Custom Domain */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Custom Domain</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="customDomain">Domain Name</Label>
            <Input
              id="customDomain"
              value={customDomain}
              onChange={(e) => setCustomDomain(e.target.value)}
              placeholder="wash.yourbusiness.com"
              data-testid="input-custom-domain"
            />
            <p className="text-xs text-muted-foreground">
              Point a CNAME record from your domain to our servers. Contact support for DNS
              setup instructions. Leave blank to use the default subdomain.
            </p>
          </CardContent>
        </Card>

        {/* Section 4: Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Eye className="w-5 h-5" />
              Live Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden shadow-sm">
              {/* Preview header bar */}
              <div
                className="h-14 flex items-center gap-3 px-4"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Preview logo"
                    className="h-8 w-auto object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <div className="w-8 h-8 rounded bg-white/20" />
                )}
                <span className="text-white font-semibold text-sm truncate">
                  {branding?.name || "Your Business"}
                </span>
              </div>

              {/* Preview body */}
              <div className="p-4 bg-background space-y-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: primaryColor }}
                  />
                  <span className="text-sm font-medium">Active Washes</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: primaryColor }}
                    type="button"
                  >
                    Primary Action
                  </button>
                  <button
                    className="px-3 py-1.5 rounded text-xs font-medium text-white transition-opacity hover:opacity-90"
                    style={{ backgroundColor: secondaryColor }}
                    type="button"
                  >
                    Secondary Action
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is a preview of how your branding will appear to customers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end pb-6">
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="min-w-[140px]"
            data-testid="button-save-branding"
          >
            <Save className="w-4 h-4 mr-2" />
            {saveMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </main>

      <AppFooter />
    </div>
  );
}
